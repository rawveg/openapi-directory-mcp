import { ApiClient } from './client.js';
import { SecondaryApiClient } from './secondary-client.js';
import { MergeUtilities, MergedSearchResult } from '../utils/merge.js';
import { ICacheManager } from '../cache/types.js';
import { ApiGuruAPI, ApiGuruMetrics, ApiGuruServices } from '../types/api.js';

/**
 * Dual-source API client that combines data from primary (APIs.guru) and secondary sources
 * Secondary source takes precedence when conflicts exist
 */
export class DualSourceApiClient {
  private primaryClient: ApiClient;
  private secondaryClient: SecondaryApiClient;
  private cache: ICacheManager;

  constructor(
    primaryBaseURL: string, 
    secondaryBaseURL: string, 
    cacheManager: ICacheManager
  ) {
    this.primaryClient = new ApiClient(primaryBaseURL, cacheManager);
    this.secondaryClient = new SecondaryApiClient(secondaryBaseURL, cacheManager);
    this.cache = cacheManager;
  }

  private async fetchWithCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.cache.get<T>(`dual:${key}`);
    if (cached) {
      return cached;
    }

    const result = await fetchFn();
    this.cache.set(`dual:${key}`, result, ttl);
    return result;
  }

  /**
   * List all providers from both sources
   */
  async getProviders(): Promise<{ data: string[] }> {
    return this.fetchWithCache('providers', async () => {
      const [primaryProviders, secondaryProviders] = await Promise.allSettled([
        this.primaryClient.getProviders(),
        this.secondaryClient.getProviders()
      ]);

      const primary = primaryProviders.status === 'fulfilled' ? primaryProviders.value : { data: [] };
      const secondary = secondaryProviders.status === 'fulfilled' ? secondaryProviders.value : { data: [] };

      return MergeUtilities.mergeProviders(primary, secondary);
    });
  }

  /**
   * List all APIs for a particular provider from both sources
   */
  async getProvider(provider: string): Promise<Record<string, ApiGuruAPI>> {
    return this.fetchWithCache(`provider:${provider}`, async () => {
      const [primaryAPIs, secondaryAPIs] = await Promise.allSettled([
        this.primaryClient.getProvider(provider),
        this.secondaryClient.getProvider(provider)
      ]);

      const primary = primaryAPIs.status === 'fulfilled' ? primaryAPIs.value : {};
      const secondary = secondaryAPIs.status === 'fulfilled' ? secondaryAPIs.value : {};

      return MergeUtilities.mergeAPILists(primary, secondary);
    });
  }

  /**
   * List all serviceNames for a particular provider
   * Try secondary first, fallback to primary
   */
  async getServices(provider: string): Promise<ApiGuruServices> {
    return this.fetchWithCache(`services:${provider}`, async () => {
      // Check if secondary has this provider
      const hasSecondary = await this.secondaryClient.hasProvider(provider);
      
      if (hasSecondary) {
        try {
          return await this.secondaryClient.getServices(provider);
        } catch (error) {
          // Fallback to primary if secondary fails
        }
      }
      
      return await this.primaryClient.getServices(provider);
    });
  }

  /**
   * Retrieve one version of a particular API (without service)
   * Secondary takes precedence
   */
  async getAPI(provider: string, api: string): Promise<ApiGuruAPI> {
    return this.fetchWithCache(`api:${provider}:${api}`, async () => {
      const apiId = `${provider}:${api}`;
      
      // Check secondary first
      const hasSecondaryAPI = await this.secondaryClient.hasAPI(apiId);
      
      if (hasSecondaryAPI) {
        try {
          return await this.secondaryClient.getAPI(provider, api);
        } catch (error) {
          // Fallback to primary if secondary fails
        }
      }
      
      return await this.primaryClient.getAPI(provider, api);
    });
  }

  /**
   * Retrieve one version of a particular API with a serviceName
   * Secondary takes precedence
   */
  async getServiceAPI(provider: string, service: string, api: string): Promise<ApiGuruAPI> {
    return this.fetchWithCache(`api:${provider}:${service}:${api}`, async () => {
      const apiId = `${provider}:${service}:${api}`;
      
      // Check secondary first
      const hasSecondaryAPI = await this.secondaryClient.hasAPI(apiId);
      
      if (hasSecondaryAPI) {
        try {
          return await this.secondaryClient.getServiceAPI(provider, service, api);
        } catch (error) {
          // Fallback to primary if secondary fails
        }
      }
      
      return await this.primaryClient.getServiceAPI(provider, service, api);
    });
  }

  /**
   * List all APIs from both sources with secondary taking precedence
   */
  async listAPIs(): Promise<Record<string, ApiGuruAPI>> {
    return this.fetchWithCache('all_apis', async () => {
      const [primaryAPIs, secondaryAPIs] = await Promise.allSettled([
        this.primaryClient.listAPIs(),
        this.secondaryClient.listAPIs()
      ]);

      const primary = primaryAPIs.status === 'fulfilled' ? primaryAPIs.value : {};
      const secondary = secondaryAPIs.status === 'fulfilled' ? secondaryAPIs.value : {};

      return MergeUtilities.mergeAPILists(primary, secondary);
    });
  }

  /**
   * Get paginated APIs with minimal data from both sources
   */
  async getPaginatedAPIs(page: number = 1, limit: number = 50): Promise<{
    results: Array<{
      id: string;
      title: string;
      description: string;
      provider: string;
      preferred: string;
      categories: string[];
    }>;
    pagination: {
      page: number;
      limit: number;
      total_results: number;
      total_pages: number;
      has_next: boolean;
      has_previous: boolean;
    };
  }> {
    const cacheKey = `paginated_apis:${page}:${limit}`;
    
    return this.fetchWithCache(cacheKey, async () => {
      const [primaryResults, secondaryResults] = await Promise.allSettled([
        this.primaryClient.getPaginatedAPIs(1, 10000), // Get all from both
        this.secondaryClient.listAPIs()
      ]);

      const primary = primaryResults.status === 'fulfilled' ? primaryResults.value : { results: [], pagination: { page: 1, limit: 0, total_results: 0, total_pages: 0, has_next: false, has_previous: false } };
      
      let secondary: {
        results: Array<{
          id: string;
          title: string;
          description: string;
          provider: string;
          preferred: string;
          categories: string[];
        }>;
        pagination: {
          page: number;
          limit: number;
          total_results: number;
          total_pages: number;
          has_next: boolean;
          has_previous: boolean;
        };
      } = { results: [], pagination: { page: 1, limit: 0, total_results: 0, total_pages: 0, has_next: false, has_previous: false } };
      if (secondaryResults.status === 'fulfilled') {
        const secondaryAPIs = secondaryResults.value;
        const secondaryEntries = Object.entries(secondaryAPIs);
        
        secondary = {
          results: secondaryEntries.map(([id, api]) => {
            const preferredVersion = api.versions[api.preferred];
            return {
              id,
              title: preferredVersion?.info.title || 'Untitled API',
              description: (preferredVersion?.info.description || '').substring(0, 200) + 
                          (preferredVersion?.info.description && preferredVersion.info.description.length > 200 ? '...' : ''),
              provider: preferredVersion?.info['x-providerName'] || id.split(':')[0] || 'Unknown',
              preferred: api.preferred,
              categories: preferredVersion?.info['x-apisguru-categories'] || []
            };
          }),
          pagination: { page: 1, limit: secondaryEntries.length, total_results: secondaryEntries.length, total_pages: 1, has_next: false, has_previous: false }
        };
      }

      return MergeUtilities.mergePaginatedAPIs(primary, secondary, page, limit);
    }, 300000); // Cache for 5 minutes
  }

  /**
   * Get API directory summary from both sources
   */
  async getAPISummary(): Promise<{
    total_apis: number;
    total_providers: number;
    categories: string[];
    popular_apis: Array<{
      id: string;
      title: string;
      provider: string;
    }>;
    recent_updates: Array<{
      id: string;
      title: string;
      updated: string;
    }>;
  }> {
    return this.fetchWithCache('api_summary', async () => {
      // Get combined API list for accurate summary
      const allAPIs = await this.listAPIs();
      const apiEntries = Object.entries(allAPIs);
      
      // Calculate summary statistics
      const providers = new Set<string>();
      const categories = new Set<string>();
      
      const apisWithScore = apiEntries.map(([id, api]) => {
        const preferredVersion = api.versions[api.preferred];
        const provider = preferredVersion?.info['x-providerName'] || id.split(':')[0] || 'Unknown';
        providers.add(provider);
        
        // Add categories
        (preferredVersion?.info['x-apisguru-categories'] || []).forEach(cat => categories.add(cat));
        
        // Calculate popularity score
        const versionCount = Object.keys(api.versions).length;
        const popularity = preferredVersion?.info['x-apisguru-popularity'] || 0;
        const score = versionCount * 10 + popularity;
        
        const latestUpdate = Math.max(
          ...Object.values(api.versions).map(v => new Date(v.updated).getTime())
        );
        
        return {
          id,
          title: preferredVersion?.info.title || 'Untitled API',
          provider,
          score,
          updated: latestUpdate,
          updatedString: new Date(latestUpdate).toISOString().split('T')[0]
        };
      });
      
      // Get top 10 popular APIs
      const popular_apis = apisWithScore
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(({ id, title, provider }) => ({ id, title, provider }));
      
      // Get 10 recently updated APIs
      const recent_updates = apisWithScore
        .sort((a, b) => b.updated - a.updated)
        .slice(0, 10)
        .map(({ id, title, updatedString }) => ({ id, title, updated: updatedString || 'Unknown' }));
      
      return {
        total_apis: apiEntries.length,
        total_providers: providers.size,
        categories: Array.from(categories).sort(),
        popular_apis,
        recent_updates
      };
    }, 600000); // Cache for 10 minutes
  }

  /**
   * Get combined metrics from both sources accounting for overlaps
   */
  async getMetrics(): Promise<ApiGuruMetrics> {
    return this.fetchWithCache('metrics', async () => {
      const [primaryMetrics, secondaryMetrics, primaryAPIs, secondaryAPIs] = await Promise.allSettled([
        this.primaryClient.getMetrics(),
        this.secondaryClient.getMetrics(),
        this.primaryClient.listAPIs(),
        this.secondaryClient.listAPIs()
      ]);

      const primary = primaryMetrics.status === 'fulfilled' ? primaryMetrics.value : { numSpecs: 0, numAPIs: 0, numEndpoints: 0 };
      const secondary = secondaryMetrics.status === 'fulfilled' ? secondaryMetrics.value : { numSpecs: 0, numAPIs: 0, numEndpoints: 0 };
      const primaryApiList = primaryAPIs.status === 'fulfilled' ? primaryAPIs.value : {};
      const secondaryApiList = secondaryAPIs.status === 'fulfilled' ? secondaryAPIs.value : {};

      return await MergeUtilities.aggregateMetrics(primary, secondary, primaryApiList, secondaryApiList);
    });
  }

  /**
   * Search APIs across both sources with intelligent merging
   */
  async searchAPIs(query: string, provider?: string, page: number = 1, limit: number = 20): Promise<{
    results: Array<{
      id: string;
      title: string;
      description: string;
      provider: string;
      preferred: string;
      categories: string[];
    }>;
    pagination: {
      page: number;
      limit: number;
      total_results: number;
      total_pages: number;
      has_next: boolean;
      has_previous: boolean;
    };
  }> {
    // Ensure limit is within bounds
    limit = Math.min(Math.max(limit, 1), 50);
    
    const cacheKey = `search:${query}:${provider || 'all'}:${page}:${limit}`;
    
    return this.fetchWithCache(cacheKey, async () => {
      const [primaryResults, secondaryResults] = await Promise.allSettled([
        this.primaryClient.searchAPIs(query, provider, 1, 1000), // Get many results for merging
        this.secondaryClient.listAPIs() // Search in secondary manually
      ]);

      const primary = primaryResults.status === 'fulfilled' ? primaryResults.value : { results: [], pagination: { page: 1, limit: 0, total_results: 0, total_pages: 0, has_next: false, has_previous: false } };
      
      // Manual search in secondary APIs
      let secondary: {
        results: Array<{
          id: string;
          title: string;
          description: string;
          provider: string;
          preferred: string;
          categories: string[];
        }>;
        pagination: {
          page: number;
          limit: number;
          total_results: number;
          total_pages: number;
          has_next: boolean;
          has_previous: boolean;
        };
      } = { results: [], pagination: { page: 1, limit: 0, total_results: 0, total_pages: 0, has_next: false, has_previous: false } };
      if (secondaryResults.status === 'fulfilled') {
        const secondaryAPIs = secondaryResults.value;
        const queryLower = query.toLowerCase();
        const matchingAPIs: Array<[string, ApiGuruAPI]> = [];
        
        for (const [apiId, api] of Object.entries(secondaryAPIs)) {
          // If provider filter is specified, check if API matches
          if (provider && !apiId.includes(provider)) {
            continue;
          }
          
          // Search in API ID, title, description, and provider name
          const matches = 
            apiId.toLowerCase().includes(queryLower) ||
            Object.values(api.versions).some(version => 
              version.info.title?.toLowerCase().includes(queryLower) ||
              version.info.description?.toLowerCase().includes(queryLower) ||
              version.info['x-providerName']?.toLowerCase().includes(queryLower)
            );
            
          if (matches) {
            matchingAPIs.push([apiId, api]);
          }
        }
        
        secondary = {
          results: matchingAPIs.map(([id, api]) => {
            const preferredVersion = api.versions[api.preferred];
            return {
              id,
              title: preferredVersion?.info.title || 'Untitled API',
              description: (preferredVersion?.info.description || '').substring(0, 200) + 
                          (preferredVersion?.info.description && preferredVersion.info.description.length > 200 ? '...' : ''),
              provider: preferredVersion?.info['x-providerName'] || id.split(':')[0] || 'Unknown',
              preferred: api.preferred,
              categories: preferredVersion?.info['x-apisguru-categories'] || []
            };
          }),
          pagination: { page: 1, limit: matchingAPIs.length, total_results: matchingAPIs.length, total_pages: 1, has_next: false, has_previous: false }
        };
      }

      return MergeUtilities.mergeSearchResults(primary as MergedSearchResult, secondary as MergedSearchResult, query, page, limit);
    }, 300000); // Cache search results for 5 minutes
  }

  // Forward remaining methods to primary client with secondary fallback when appropriate

  async getAPISummaryById(apiId: string): Promise<any> {
    const hasSecondary = await this.secondaryClient.hasAPI(apiId);
    
    if (hasSecondary) {
      try {
        // Build summary from secondary API data
        const secondaryAPIs = await this.secondaryClient.listAPIs();
        const api = secondaryAPIs[apiId];
        
        if (api) {
          const preferredVersion = api.versions[api.preferred];
          if (preferredVersion) {
            const info = preferredVersion.info;
            
            return {
              id: apiId,
              title: info.title || 'Untitled API',
              description: info.description || 'No description available',
              provider: info['x-providerName'] || apiId.split(':')[0] || 'Unknown',
              versions: Object.keys(api.versions),
              preferred_version: api.preferred,
              base_url: preferredVersion.swaggerUrl.replace('/swagger.json', '').replace('/swagger.yaml', ''),
              categories: info['x-apisguru-categories'] || [],
              authentication: {
                type: 'See OpenAPI spec',
                description: 'Authentication details available in the full specification'
              },
              updated: preferredVersion.updated,
              added: preferredVersion.added,
              contact: info.contact,
              license: info.license,
              documentation_url: preferredVersion.link || info.contact?.url,
              homepage_url: info.contact?.url
            };
          }
        }
      } catch (error) {
        // Fallback to primary
      }
    }
    
    return await this.primaryClient.getAPISummaryById(apiId);
  }

  async getAPIEndpoints(apiId: string, page: number = 1, limit: number = 30, tag?: string): Promise<any> {
    const hasSecondary = await this.secondaryClient.hasAPI(apiId);
    
    if (hasSecondary) {
      try {
        return await this.primaryClient.getAPIEndpoints(apiId, page, limit, tag); // Use primary implementation but with secondary spec
      } catch (error) {
        // Fallback to primary
      }
    }
    
    return await this.primaryClient.getAPIEndpoints(apiId, page, limit, tag);
  }

  async getEndpointDetails(apiId: string, method: string, path: string): Promise<any> {
    const hasSecondary = await this.secondaryClient.hasAPI(apiId);
    
    if (hasSecondary) {
      try {
        return await this.primaryClient.getEndpointDetails(apiId, method, path); // Use primary implementation
      } catch (error) {
        // Fallback to primary
      }
    }
    
    return await this.primaryClient.getEndpointDetails(apiId, method, path);
  }

  async getEndpointSchema(apiId: string, method: string, path: string): Promise<any> {
    const hasSecondary = await this.secondaryClient.hasAPI(apiId);
    
    if (hasSecondary) {
      try {
        return await this.primaryClient.getEndpointSchema(apiId, method, path); // Use primary implementation
      } catch (error) {
        // Fallback to primary
      }
    }
    
    return await this.primaryClient.getEndpointSchema(apiId, method, path);
  }

  async getEndpointExamples(apiId: string, method: string, path: string): Promise<any> {
    const hasSecondary = await this.secondaryClient.hasAPI(apiId);
    
    if (hasSecondary) {
      try {
        return await this.primaryClient.getEndpointExamples(apiId, method, path); // Use primary implementation
      } catch (error) {
        // Fallback to primary
      }
    }
    
    return await this.primaryClient.getEndpointExamples(apiId, method, path);
  }

  async getOpenAPISpec(url: string): Promise<any> {
    return await this.primaryClient.getOpenAPISpec(url);
  }

  async getPopularAPIs(): Promise<Record<string, ApiGuruAPI>> {
    // Use combined API list for popularity calculation
    const allAPIs = await this.listAPIs();
    const apiEntries = Object.entries(allAPIs);
    const scored = apiEntries.map(([id, api]) => {
      const versionCount = Object.keys(api.versions).length;
      const latestUpdate = Math.max(
        ...Object.values(api.versions).map(v => new Date(v.updated).getTime())
      );
      
      const score = versionCount * 10 + (latestUpdate / 1000000);
      return { id, api, score };
    });
    
    const popular = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .reduce((acc, { id, api }) => {
        acc[id] = api;
        return acc;
      }, {} as Record<string, ApiGuruAPI>);
    
    return popular;
  }

  async getRecentlyUpdatedAPIs(limit: number = 10): Promise<Record<string, ApiGuruAPI>> {
    // Use combined API list
    const allAPIs = await this.listAPIs();
    const apiEntries = Object.entries(allAPIs);
    const withLatestUpdate = apiEntries.map(([id, api]) => {
      const latestUpdate = Math.max(
        ...Object.values(api.versions).map(v => new Date(v.updated).getTime())
      );
      return { id, api, updated: latestUpdate };
    });
    
    const recent = withLatestUpdate
      .sort((a, b) => b.updated - a.updated)
      .slice(0, limit)
      .reduce((acc, { id, api }) => {
        acc[id] = api;
        return acc;
      }, {} as Record<string, ApiGuruAPI>);
    
    return recent;
  }

  async getProviderStats(provider: string): Promise<any> {
    // Use primary client implementation for provider stats
    return this.primaryClient.getProviderStats(provider);
  }
}