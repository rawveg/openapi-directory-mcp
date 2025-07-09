import axios, { AxiosInstance } from 'axios';
import { CacheManager } from '../cache/manager.js';
import { ApiGuruAPI, ApiGuruMetrics, ApiGuruServices } from '../types/api.js';

export class ApiClient {
  private http: AxiosInstance;
  private cache: CacheManager;

  constructor(baseURL: string, cacheManager: CacheManager) {
    this.http = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'openapi-directory-mcp/0.1.0',
      },
    });

    this.cache = cacheManager;
  }

  private async fetchWithCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.cache.get<T>(key);
    if (cached) {
      return cached;
    }

    const result = await fetchFn();
    this.cache.set(key, result, ttl);
    return result;
  }

  /**
   * List all providers in the directory
   */
  async getProviders(): Promise<{ data: string[] }> {
    return this.fetchWithCache('providers', async () => {
      const response = await this.http.get<{ data: string[] }>('/providers.json');
      return response.data;
    });
  }

  /**
   * List all APIs for a particular provider
   */
  async getProvider(provider: string): Promise<Record<string, ApiGuruAPI>> {
    return this.fetchWithCache(`provider:${provider}`, async () => {
      const response = await this.http.get<Record<string, ApiGuruAPI>>(`/${provider}.json`);
      return response.data;
    });
  }

  /**
   * List all serviceNames for a particular provider
   */
  async getServices(provider: string): Promise<ApiGuruServices> {
    return this.fetchWithCache(`services:${provider}`, async () => {
      const response = await this.http.get<ApiGuruServices>(`/${provider}/services.json`);
      return response.data;
    });
  }

  /**
   * Retrieve one version of a particular API (without service)
   */
  async getAPI(provider: string, api: string): Promise<ApiGuruAPI> {
    return this.fetchWithCache(`api:${provider}:${api}`, async () => {
      const response = await this.http.get<ApiGuruAPI>(`/specs/${provider}/${api}.json`);
      return response.data;
    });
  }

  /**
   * Retrieve one version of a particular API with a serviceName
   */
  async getServiceAPI(provider: string, service: string, api: string): Promise<ApiGuruAPI> {
    return this.fetchWithCache(`api:${provider}:${service}:${api}`, async () => {
      const response = await this.http.get<ApiGuruAPI>(`/specs/${provider}/${service}/${api}.json`);
      return response.data;
    });
  }

  /**
   * List all APIs in the directory
   */
  async listAPIs(): Promise<Record<string, ApiGuruAPI>> {
    return this.fetchWithCache('all_apis', async () => {
      const response = await this.http.get<Record<string, ApiGuruAPI>>('/list.json');
      return response.data;
    });
  }

  /**
   * Get basic metrics for the directory
   */
  async getMetrics(): Promise<ApiGuruMetrics> {
    return this.fetchWithCache('metrics', async () => {
      const response = await this.http.get<ApiGuruMetrics>('/metrics.json');
      return response.data;
    });
  }

  /**
   * Search APIs by query string
   */
  async searchAPIs(query: string, provider?: string): Promise<Record<string, ApiGuruAPI>> {
    const cacheKey = `search:${query}:${provider || 'all'}`;
    
    return this.fetchWithCache(cacheKey, async () => {
      const allAPIs = await this.listAPIs();
      const queryLower = query.toLowerCase();
      
      const filtered: Record<string, ApiGuruAPI> = {};
      
      for (const [apiId, api] of Object.entries(allAPIs)) {
        // If provider filter is specified, check if API matches
        if (provider && !apiId.includes(provider)) {
          continue;
        }
        
        // Search in API ID, title, and description
        const matches = 
          apiId.toLowerCase().includes(queryLower) ||
          Object.values(api.versions).some(version => 
            version.info.title?.toLowerCase().includes(queryLower) ||
            version.info.description?.toLowerCase().includes(queryLower)
          );
          
        if (matches) {
          filtered[apiId] = api;
        }
      }
      
      return filtered;
    }, 300000); // Cache search results for 5 minutes
  }

  /**
   * Get OpenAPI specification for a specific API version
   */
  async getOpenAPISpec(url: string): Promise<any> {
    return this.fetchWithCache(`spec:${url}`, async () => {
      const response = await axios.get(url);
      return response.data;
    });
  }

  /**
   * Get popular APIs (top 20 by some heuristic)
   */
  async getPopularAPIs(): Promise<Record<string, ApiGuruAPI>> {
    return this.fetchWithCache('popular_apis', async () => {
      const allAPIs = await this.listAPIs();
      
      // Simple heuristic: prefer APIs with more versions and recent updates
      const apiEntries = Object.entries(allAPIs);
      const scored = apiEntries.map(([id, api]) => {
        const versionCount = Object.keys(api.versions).length;
        const latestUpdate = Math.max(
          ...Object.values(api.versions).map(v => new Date(v.updated).getTime())
        );
        
        const score = versionCount * 10 + (latestUpdate / 1000000); // Simple scoring
        return { id, api, score };
      });
      
      // Sort by score and take top 20
      const popular = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .reduce((acc, { id, api }) => {
          acc[id] = api;
          return acc;
        }, {} as Record<string, ApiGuruAPI>);
      
      return popular;
    }, 3600000); // Cache for 1 hour
  }

  /**
   * Get recently updated APIs
   */
  async getRecentlyUpdatedAPIs(limit: number = 10): Promise<Record<string, ApiGuruAPI>> {
    return this.fetchWithCache(`recent:${limit}`, async () => {
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
    }, 1800000); // Cache for 30 minutes
  }

  /**
   * Get API statistics for a provider
   */
  async getProviderStats(provider: string): Promise<{
    totalAPIs: number;
    totalVersions: number;
    latestUpdate: string;
    oldestAPI: string;
    newestAPI: string;
  }> {
    return this.fetchWithCache(`stats:${provider}`, async () => {
      const providerAPIs = await this.getProvider(provider);
      
      let totalVersions = 0;
      let latestUpdate = new Date(0);
      let oldestAPI = '';
      let newestAPI = '';
      let oldestDate = new Date();
      let newestDate = new Date(0);
      
      for (const [apiId, api] of Object.entries(providerAPIs)) {
        const versions = Object.values(api.versions);
        totalVersions += versions.length;
        
        for (const version of versions) {
          const updated = new Date(version.updated);
          const added = new Date(version.added);
          
          if (updated > latestUpdate) {
            latestUpdate = updated;
          }
          
          if (added < oldestDate) {
            oldestDate = added;
            oldestAPI = apiId;
          }
          
          if (added > newestDate) {
            newestDate = added;
            newestAPI = apiId;
          }
        }
      }
      
      return {
        totalAPIs: Object.keys(providerAPIs).length,
        totalVersions,
        latestUpdate: latestUpdate.toISOString(),
        oldestAPI,
        newestAPI,
      };
    }, 1800000); // Cache for 30 minutes
  }
}