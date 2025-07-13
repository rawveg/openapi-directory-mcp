/**
 * Custom spec client - filesystem-based implementation following ApiClient interface
 * Provides same interface as primary/secondary clients for seamless integration
 */

/* eslint-disable no-console */

import { ICacheManager } from "../cache/types.js";
import { ApiGuruAPI, ApiGuruMetrics, ApiGuruServices } from "../types/api.js";
import { ManifestManager } from "./manifest-manager.js";

/**
 * Custom specification client that reads from local filesystem
 * Implements same interface as ApiClient and SecondaryApiClient
 */
export class CustomSpecClient {
  private manifestManager: ManifestManager;
  private cache: ICacheManager;

  constructor(cacheManager: ICacheManager) {
    this.manifestManager = new ManifestManager();
    this.cache = cacheManager;
  }

  private async fetchWithCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = this.cache.get<T>(`custom:${key}`);
    if (cached) {
      return cached;
    }

    const result = await fetchFn();
    this.cache.set(`custom:${key}`, result, ttl);
    return result;
  }

  /**
   * List all providers in custom specs (always returns ["custom"])
   */
  async getProviders(): Promise<{ data: string[] }> {
    return this.fetchWithCache("providers", async () => {
      const specs = this.manifestManager.listSpecs();
      
      // Custom specs always use "custom" as provider
      if (specs.length > 0) {
        return { data: ["custom"] };
      }
      
      return { data: [] };
    });
  }

  /**
   * List all APIs for the custom provider
   */
  async getProvider(provider: string): Promise<Record<string, ApiGuruAPI>> {
    if (provider !== "custom") {
      return {};
    }

    return this.fetchWithCache(`provider:${provider}`, async () => {
      const specs = this.manifestManager.listSpecs();
      const apis: Record<string, ApiGuruAPI> = {};

      for (const specEntry of specs) {
        try {
          const parsed = this.manifestManager.parseSpecId(specEntry.id);
          if (!parsed) continue;

          const specContent = this.manifestManager.readSpecFile(parsed.name, parsed.version);
          const spec = JSON.parse(specContent);
          
          apis[specEntry.id] = spec;
        } catch (error) {
          console.warn(`Failed to load spec ${specEntry.id}: ${error}`);
        }
      }

      return apis;
    });
  }

  /**
   * List all services for custom provider (not applicable - returns empty)
   */
  async getServices(provider: string): Promise<ApiGuruServices> {
    if (provider !== "custom") {
      throw new Error(`Provider ${provider} not found in custom specs`);
    }

    // Custom specs don't use services structure
    return { data: [] };
  }

  /**
   * Retrieve one version of a particular API (without service)
   */
  async getAPI(provider: string, api: string): Promise<ApiGuruAPI> {
    if (provider !== "custom") {
      throw new Error(`Provider ${provider} not found in custom specs`);
    }

    return this.fetchWithCache(`api:${provider}:${api}`, async () => {
      const specs = this.manifestManager.listSpecs();
      
      // Find spec by name (api parameter is the name part)
      const specEntry = specs.find(s => {
        const parsed = this.manifestManager.parseSpecId(s.id);
        return parsed && parsed.name === api;
      });

      if (!specEntry) {
        throw new Error(`API ${api} not found in custom specs`);
      }

      const parsed = this.manifestManager.parseSpecId(specEntry.id);
      if (!parsed) {
        throw new Error(`Invalid spec ID: ${specEntry.id}`);
      }

      const specContent = this.manifestManager.readSpecFile(parsed.name, parsed.version);
      return JSON.parse(specContent);
    });
  }

  /**
   * Retrieve one version of a particular API with a serviceName
   * Custom specs don't use services, so this delegates to getAPI
   */
  async getServiceAPI(
    provider: string,
    service: string,
    api: string,
  ): Promise<ApiGuruAPI> {
    // Custom specs don't use services, treat service as part of name
    const fullApiName = `${service}-${api}`;
    return this.getAPI(provider, fullApiName);
  }

  /**
   * List all APIs from custom specs
   */
  async listAPIs(): Promise<Record<string, ApiGuruAPI>> {
    return this.fetchWithCache("all_apis", async () => {
      const specs = this.manifestManager.listSpecs();
      const apis: Record<string, ApiGuruAPI> = {};

      for (const specEntry of specs) {
        try {
          const parsed = this.manifestManager.parseSpecId(specEntry.id);
          if (!parsed) continue;

          const specContent = this.manifestManager.readSpecFile(parsed.name, parsed.version);
          const spec = JSON.parse(specContent);
          
          // The spec file is already in ApiGuruAPI format
          apis[specEntry.id] = spec;
        } catch (error) {
          console.warn(`Failed to load spec ${specEntry.id}: ${error}`);
        }
      }

      return apis;
    });
  }

  /**
   * Get metrics for custom specs
   */
  async getMetrics(): Promise<ApiGuruMetrics> {
    return this.fetchWithCache("metrics", async () => {
      const stats = this.manifestManager.getStats();
      const specs = this.manifestManager.listSpecs();
      
      // Calculate approximate endpoints by parsing specs
      let totalEndpoints = 0;
      for (const specEntry of specs) {
        try {
          const parsed = this.manifestManager.parseSpecId(specEntry.id);
          if (!parsed) continue;

          const specContent = this.manifestManager.readSpecFile(parsed.name, parsed.version);
          const specData = JSON.parse(specContent);
          
          // Count endpoints from the latest version
          const latestVersion = specData.versions[specData.preferred];
          if (latestVersion && latestVersion.spec && latestVersion.spec.paths) {
            const paths = Object.keys(latestVersion.spec.paths);
            totalEndpoints += paths.reduce((count, path) => {
              const methods = Object.keys(latestVersion.spec.paths[path]);
              return count + methods.filter(m => ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(m.toLowerCase())).length;
            }, 0);
          }
        } catch (error) {
          // Skip on error
        }
      }

      return {
        numSpecs: stats.totalSpecs,
        numAPIs: stats.totalSpecs, // Each spec is an API
        numEndpoints: totalEndpoints,
      };
    });
  }

  /**
   * Check if custom specs has a specific API
   */
  async hasAPI(apiId: string): Promise<boolean> {
    return this.manifestManager.hasSpec(apiId);
  }

  /**
   * Check if custom specs has a specific provider
   */
  async hasProvider(provider: string): Promise<boolean> {
    if (provider !== "custom") {
      return false;
    }
    
    const specs = this.manifestManager.listSpecs();
    return specs.length > 0;
  }

  /**
   * Get paginated APIs (for compatibility)
   */
  async getPaginatedAPIs(
    page: number = 1,
    limit: number = 50,
  ): Promise<{
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
    return this.fetchWithCache(
      `paginated_apis:${page}:${limit}`,
      async () => {
        const specs = this.manifestManager.listSpecs();
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedSpecs = specs.slice(startIndex, endIndex);

        const results = paginatedSpecs.map(spec => {
          const parsed = this.manifestManager.parseSpecId(spec.id);
          return {
            id: spec.id,
            title: spec.title,
            description: spec.description.substring(0, 200) + (spec.description.length > 200 ? '...' : ''),
            provider: 'custom',
            preferred: parsed?.version || '1.0.0',
            categories: ['custom'],
          };
        });

        const totalPages = Math.ceil(specs.length / limit);

        return {
          results,
          pagination: {
            page,
            limit,
            total_results: specs.length,
            total_pages: totalPages,
            has_next: page < totalPages,
            has_previous: page > 1,
          },
        };
      },
      300000, // Cache for 5 minutes
    );
  }

  /**
   * Search APIs in custom specs
   */
  async searchAPIs(
    query: string,
    provider?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
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
    // If provider specified and it's not "custom", return empty results
    if (provider && provider !== "custom") {
      return {
        results: [],
        pagination: {
          page,
          limit,
          total_results: 0,
          total_pages: 0,
          has_next: false,
          has_previous: false,
        },
      };
    }

    const cacheKey = `search:${query}:${provider || "all"}:${page}:${limit}`;
    
    return this.fetchWithCache(
      cacheKey,
      async () => {
        const specs = this.manifestManager.listSpecs();
        const queryLower = query.toLowerCase();
        
        // Filter specs that match the query
        const matchingSpecs = specs.filter(spec => {
          return (
            spec.id.toLowerCase().includes(queryLower) ||
            spec.title.toLowerCase().includes(queryLower) ||
            spec.description.toLowerCase().includes(queryLower) ||
            spec.name.toLowerCase().includes(queryLower)
          );
        });

        // Paginate results
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedSpecs = matchingSpecs.slice(startIndex, endIndex);

        const results = paginatedSpecs.map(spec => {
          const parsed = this.manifestManager.parseSpecId(spec.id);
          return {
            id: spec.id,
            title: spec.title,
            description: spec.description.substring(0, 200) + (spec.description.length > 200 ? '...' : ''),
            provider: 'custom',
            preferred: parsed?.version || '1.0.0',
            categories: ['custom'],
          };
        });

        const totalPages = Math.ceil(matchingSpecs.length / limit);

        return {
          results,
          pagination: {
            page,
            limit,
            total_results: matchingSpecs.length,
            total_pages: totalPages,
            has_next: page < totalPages,
            has_previous: page > 1,
          },
        };
      },
      300000, // Cache for 5 minutes
    );
  }

  /**
   * Get manifest manager for direct access
   */
  getManifestManager(): ManifestManager {
    return this.manifestManager;
  }

  /**
   * Invalidate all custom spec caches (called when specs are imported/removed)
   */
  invalidateCache(): void {
    const deletedCount = this.cache.invalidatePattern('custom:*');
    console.log(`Invalidated ${deletedCount} custom spec cache entries`);
  }

  /**
   * Get summary information for all custom specs
   */
  async getCustomSpecsSummary(): Promise<{
    total_specs: number;
    total_size: number;
    by_format: { yaml: number; json: number };
    by_source: { file: number; url: number };
    last_updated: string;
    specs: Array<{
      id: string;
      name: string;
      version: string;
      title: string;
      imported: string;
      size: number;
      security_issues?: number;
    }>;
  }> {
    const stats = this.manifestManager.getStats();
    const specs = this.manifestManager.listSpecs();

    return {
      total_specs: stats.totalSpecs,
      total_size: stats.totalSize,
      by_format: stats.byFormat,
      by_source: stats.bySource,
      last_updated: stats.lastUpdated,
      specs: specs.map(spec => {
        const baseSpec = {
          id: spec.id,
          name: spec.name,
          version: spec.version,
          title: spec.title,
          imported: spec.imported,
          size: spec.fileSize,
        };
        
        // Only add security_issues if we have a valid count
        if (spec.securityScan?.summary) {
          return {
            ...baseSpec,
            security_issues: spec.securityScan.summary.critical + spec.securityScan.summary.high + spec.securityScan.summary.medium + spec.securityScan.summary.low,
          };
        }
        
        return baseSpec;
      }),
    };
  }

  /**
   * Get endpoints for a specific custom API
   */
  async getAPIEndpoints(
    apiId: string,
    page: number = 1,
    limit: number = 30,
    tag?: string,
  ): Promise<any> {
    // Parse the apiId to get name and version
    const parsed = this.manifestManager.parseSpecId(apiId);
    if (!parsed) {
      throw new Error(`Invalid API ID format: ${apiId}`);
    }

    // Get the spec content
    const specContent = this.manifestManager.readSpecFile(parsed.name, parsed.version);
    const spec = JSON.parse(specContent);

    // Get the latest version spec
    const latestVersion = spec.versions[spec.preferred];
    if (!latestVersion || !latestVersion.spec || !latestVersion.spec.paths) {
      return {
        endpoints: [],
        pagination: {
          page,
          limit,
          total_endpoints: 0,
          total_pages: 0,
          has_next: false,
          has_previous: false,
        },
      };
    }

    // Extract endpoints from the OpenAPI spec
    const paths = latestVersion.spec.paths;
    const allEndpoints: Array<{
      path: string;
      method: string;
      summary?: string;
      description?: string;
      tags?: string[];
      operationId?: string;
    }> = [];

    for (const [path, pathMethods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathMethods as any)) {
        if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method.toLowerCase())) {
          const op = operation as any; // Type assertion for OpenAPI operation object
          const endpoint = {
            path,
            method: method.toUpperCase(),
            summary: op.summary,
            description: op.description,
            tags: op.tags,
            operationId: op.operationId,
          };

          // Filter by tag if provided
          if (!tag || (op.tags && op.tags.includes(tag))) {
            allEndpoints.push(endpoint);
          }
        }
      }
    }

    // Apply pagination
    const totalEndpoints = allEndpoints.length;
    const totalPages = Math.ceil(totalEndpoints / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const endpoints = allEndpoints.slice(startIndex, endIndex);

    return {
      endpoints,
      pagination: {
        page,
        limit,
        total_endpoints: totalEndpoints,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1,
      },
    };
  }
}