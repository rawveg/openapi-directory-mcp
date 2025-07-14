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
    try {
      const cached = this.cache.get<T>(`custom:${key}`);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Continue without cache if there's an error
      console.warn(`Cache error for key ${key}:`, error);
    }

    const result = await fetchFn();
    
    try {
      this.cache.set(`custom:${key}`, result, ttl);
    } catch (error) {
      // Log but don't fail if cache write fails
      console.warn(`Failed to cache result for key ${key}:`, error);
    }
    
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
  async getProvider(provider: string): Promise<{ data: Record<string, any> }> {
    if (provider !== "custom") {
      return { data: {} };
    }

    return this.fetchWithCache(`provider:${provider}`, async () => {
      const specs = this.manifestManager.listSpecs();
      const apis: Record<string, any> = {};

      for (const specEntry of specs) {
        try {
          const parsed = this.manifestManager.parseSpecId(specEntry.id);
          if (!parsed) continue;

          const specContent = this.manifestManager.readSpecFile(
            parsed.name,
            parsed.version,
          );
          const spec = JSON.parse(specContent);

          // Structure the API with version as expected by tests
          apis[`custom:${parsed.name}`] = {
            [parsed.version]: spec
          };
        } catch (error) {
          console.warn(`Failed to load spec ${specEntry.id}: ${error}`);
        }
      }

      return { data: apis };
    });
  }

  /**
   * List all services for custom provider (returns names of imported APIs)
   */
  async getServices(provider: string): Promise<ApiGuruServices> {
    if (provider !== "custom") {
      throw new Error(`Provider ${provider} not found in custom specs`);
    }

    return this.fetchWithCache(`services:${provider}`, async () => {
      const specs = this.manifestManager.listSpecs();
      const services = new Set<string>();

      for (const specEntry of specs) {
        const parsed = this.manifestManager.parseSpecId(specEntry.id);
        if (parsed) {
          services.add(parsed.name);
        }
      }

      return { data: Array.from(services).sort() };
    });
  }

  /**
   * Retrieve one version of a particular API (without service)
   */
  async getAPI(providerOrId: string, api?: string): Promise<ApiGuruAPI> {
    let provider: string;
    let apiName: string;
    let version: string | undefined;

    // Handle both single parameter (ID) and two parameter (provider, api) calls
    if (api === undefined) {
      // Single parameter: parse ID like "custom:test-api" or "custom:test-api:1.0.0"
      const parts = providerOrId.split(':');
      if (parts.length < 2 || parts[0] !== 'custom') {
        throw new Error(`Invalid API ID: ${providerOrId}`);
      }
      provider = parts[0];
      apiName = parts[1] || '';
      version = parts[2]; // Optional version
    } else {
      // Two parameters
      provider = providerOrId;
      apiName = api;
    }

    if (provider !== "custom") {
      throw new Error(`Provider ${provider} not found in custom specs`);
    }

    return this.fetchWithCache(`api:${provider}:${apiName}${version ? ':' + version : ''}`, async () => {
      // If version specified, look for exact match
      let specId: string;
      if (version) {
        specId = `custom:${apiName}:${version}`;
        const spec = this.manifestManager.getSpec(specId);
        if (!spec) {
          throw new Error(`API not found: custom:${apiName}:${version}`);
        }
      } else {
        // Find latest version
        const specs = this.manifestManager.listSpecs();
        const matchingSpecs = specs.filter((s) => {
          const parsed = this.manifestManager.parseSpecId(s.id);
          return parsed && parsed.name === apiName;
        });

        if (matchingSpecs.length === 0) {
          throw new Error(`API not found: custom:${apiName}`);
        }

        // Use first match (could be improved to find latest version)
        const firstMatch = matchingSpecs[0];
        if (!firstMatch) {
          throw new Error(`API not found: custom:${apiName}`);
        }
        specId = firstMatch.id;
      }

      const parsed = this.manifestManager.parseSpecId(specId);
      if (!parsed) {
        throw new Error(`Invalid spec ID: ${specId}`);
      }

      const specContent = this.manifestManager.readSpecFile(
        parsed.name,
        parsed.version,
      );
      
      try {
        return JSON.parse(specContent);
      } catch (error) {
        throw new Error('Invalid JSON in spec file');
      }
    });
  }

  /**
   * Retrieve one version of a particular API with a serviceName
   * Custom specs don't use services, so this delegates to getAPI
   */
  async getServiceAPI(
    provider: string,
    service: string,
    _api: string,
  ): Promise<ApiGuruAPI> {
    // For custom specs, service is the API name and api is the version
    // Just use service as the API name since custom specs are identified by name
    return this.getAPI(provider, service);
  }

  /**
   * List all APIs from custom specs with optional pagination
   */
  async listAPIs(page?: number, limit?: number): Promise<any> {
    // If pagination parameters are provided, return paginated response
    if (page !== undefined && limit !== undefined) {
      return this.listAPIsPaginated(page, limit);
    }
    
    // Otherwise return the original format
    return this.fetchWithCache("all_apis", async () => {
      const specs = this.manifestManager.listSpecs();
      const apis: Record<string, ApiGuruAPI> = {};

      for (const specEntry of specs) {
        try {
          const parsed = this.manifestManager.parseSpecId(specEntry.id);
          if (!parsed) continue;

          const specContent = this.manifestManager.readSpecFile(
            parsed.name,
            parsed.version,
          );
          const openApiSpec = JSON.parse(specContent);

          // Create ApiGuruAPI entry from manifest and OpenAPI spec
          const apiGuruEntry: ApiGuruAPI = {
            added: specEntry.imported,
            preferred: parsed.version,
            versions: {
              [parsed.version]: {
                added: specEntry.imported,
                info: {
                  ...openApiSpec.info,
                  "x-apisguru-categories": ["custom"],
                  "x-providerName": parsed.name.split(".")[0],
                },
                updated: specEntry.imported,
                swaggerUrl: `/custom/${parsed.name}/${parsed.version}.json`,
                swaggerYamlUrl: `/custom/${parsed.name}/${parsed.version}.yaml`,
                openapiVer: openApiSpec.openapi || "3.0.0",
                link: openApiSpec.info?.contact?.url || "",
              },
            },
          };

          apis[specEntry.id] = apiGuruEntry;
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

          const specContent = this.manifestManager.readSpecFile(
            parsed.name,
            parsed.version,
          );
          const specData = JSON.parse(specContent);

          // Count endpoints from the latest version
          const latestVersion = specData.versions[specData.preferred];
          if (latestVersion && latestVersion.spec && latestVersion.spec.paths) {
            const paths = Object.keys(latestVersion.spec.paths);
            totalEndpoints += paths.reduce((count, path) => {
              const methods = Object.keys(latestVersion.spec.paths[path]);
              return (
                count +
                methods.filter((m) =>
                  [
                    "get",
                    "post",
                    "put",
                    "delete",
                    "patch",
                    "head",
                    "options",
                  ].includes(m.toLowerCase()),
                ).length
              );
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
        unreachable: 0, // Custom specs are always reachable (local files)
        invalid: 0, // Only valid specs can be imported
        unofficial: stats.totalSpecs, // All custom specs are unofficial
        fixes: 0, // No fixes needed for custom specs
        fixedPct: 0,
        datasets: [], // No datasets for custom specs
        stars: 0, // No GitHub stars for custom specs
        starsPercentile: 0,
        numProviders: stats.totalSpecs > 0 ? 1 : 0, // Only "custom" provider
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

        const results = paginatedSpecs.map((spec) => {
          const parsed = this.manifestManager.parseSpecId(spec.id);
          return {
            id: spec.id,
            title: spec.title,
            description:
              spec.description.substring(0, 200) +
              (spec.description.length > 200 ? "..." : ""),
            provider: "custom",
            preferred: parsed?.version || "1.0.0",
            categories: ["custom"],
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
    pageOrProvider?: number | string,
    limitOrPage?: number,
    limitParam?: number,
  ): Promise<{
    data: Array<{
      id: string;
      name: string;
      title: string;
      description: string;
      provider: string;
      preferred: string;
      categories?: string[];
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages?: number;
      total_results?: number;
      total_pages?: number;
      has_next?: boolean;
      has_previous?: boolean;
    };
  }> {
    // Parse parameters - handle both (query, page, limit) and (query, provider, page, limit)
    let provider: string | undefined;
    let page: number;
    let limit: number;
    
    if (typeof pageOrProvider === 'number') {
      // Called as searchAPIs(query, page, limit)
      page = pageOrProvider;
      limit = limitOrPage || 20;
      provider = undefined;
    } else {
      // Called as searchAPIs(query, provider, page, limit)
      provider = pageOrProvider;
      page = limitOrPage || 1;
      limit = limitParam || 20;
    }

    // If provider specified and it's not "custom", return empty results
    if (provider && provider !== "custom") {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
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
        const matchingSpecs = specs.filter((spec) => {
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

        const data = paginatedSpecs.map((spec) => {
          const parsed = this.manifestManager.parseSpecId(spec.id);
          return {
            id: spec.id,
            name: parsed?.name || spec.name,
            title: spec.title,
            description:
              spec.description.substring(0, 200) +
              (spec.description.length > 200 ? "..." : ""),
            provider: "custom",
            preferred: parsed?.version || "1.0.0",
            categories: ["custom"],
          };
        });

        const totalPages = Math.ceil(matchingSpecs.length / limit);

        return {
          data,
          pagination: {
            page,
            limit,
            total: matchingSpecs.length,
            totalPages,
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
    const deletedCount = this.cache.invalidatePattern("custom:*");
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
      specs: specs.map((spec) => {
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
            security_issues:
              spec.securityScan.summary.critical +
              spec.securityScan.summary.high +
              spec.securityScan.summary.medium +
              spec.securityScan.summary.low,
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
    const specContent = this.manifestManager.readSpecFile(
      parsed.name,
      parsed.version,
    );
    const spec = JSON.parse(specContent);

    // Check if this is a direct OpenAPI spec (without ApiGuru wrapper)
    if (spec.openapi || spec.swagger) {
      // This is a direct OpenAPI spec, not wrapped in ApiGuru format
      if (!spec.paths) {
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

      // Extract endpoints directly from the OpenAPI spec
      const paths = spec.paths;
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
          if (
            [
              "get",
              "post",
              "put",
              "delete",
              "patch",
              "head",
              "options",
            ].includes(method.toLowerCase())
          ) {
            const op = operation as any;
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

    // This is ApiGuru format - get the latest version spec
    const latestVersion = spec.versions?.[spec.preferred];
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
        if (
          ["get", "post", "put", "delete", "patch", "head", "options"].includes(
            method.toLowerCase(),
          )
        ) {
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

  /**
   * Get provider statistics for custom source
   */
  async getProviderStats(provider: string): Promise<any> {
    if (provider !== "custom") {
      throw new Error(`Provider ${provider} not found in custom specs`);
    }

    return this.fetchWithCache(`provider_stats:${provider}`, async () => {
      const specs = this.manifestManager.listSpecs();

      return {
        provider,
        api_count: specs.length,
        source: "custom",
      };
    });
  }

  /**
   * Get API summary by ID for custom source
   */
  async getAPISummaryById(apiId: string): Promise<any> {
    return this.fetchWithCache(`api_summary:${apiId}`, async () => {
      const [, name, version] = apiId.split(":");
      if (!name || !version) {
        throw new Error(
          `Invalid custom API ID format: ${apiId}. Expected format: custom:name:version`,
        );
      }

      const specContent = this.manifestManager.readSpecFile(name, version);
      const api = JSON.parse(specContent);

      return {
        id: apiId,
        info: api.info,
        versions: api.versions,
        preferred: api.preferred,
        source: "custom",
      };
    });
  }

  /**
   * Get popular APIs from custom source (returns all since custom specs are curated)
   */
  async getPopularAPIs(limit?: number): Promise<any> {
    return this.fetchWithCache(`popular:${limit}`, async () => {
      const specs = this.manifestManager.listSpecs();

      return {
        results: specs.slice(0, limit || 20).map((spec) => spec),
        source: "custom",
      };
    });
  }

  /**
   * Get recently updated APIs from custom source
   */
  async getRecentlyUpdatedAPIs(limit?: number): Promise<any> {
    return this.fetchWithCache(`recent:${limit}`, async () => {
      const specs = this.manifestManager.listSpecs();

      // Sort by imported date (most recent first)
      specs.sort(
        (a, b) =>
          new Date(b.imported).getTime() - new Date(a.imported).getTime(),
      );

      return {
        results: specs.slice(0, limit || 10).map((spec) => spec),
        source: "custom",
      };
    });
  }

  /**
   * Get OpenAPI specification for a custom API
   */
  async getOpenAPISpec(url: string): Promise<any> {
    // For custom specs, the URL might be a spec ID
    if (url.startsWith("custom:")) {
      return this.fetchWithCache(`spec:${url}`, async () => {
        const [, name, version] = url.split(":");
        if (!name || !version) {
          throw new Error(`Invalid custom API ID format: ${url}`);
        }

        const specContent = this.manifestManager.readSpecFile(name, version);
        return JSON.parse(specContent);
      });
    }

    // Handle custom spec URLs in the format /custom/name/version.json
    if (url.startsWith("/custom/")) {
      return this.fetchWithCache(`spec:${url}`, async () => {
        const pathParts = url.split("/");
        if (pathParts.length < 4) {
          throw new Error(`Invalid custom spec URL format: ${url}`);
        }

        const name = pathParts[2];
        const versionFile = pathParts[3];
        if (!name || !versionFile) {
          throw new Error(`Invalid custom spec URL format: ${url}`);
        }

        const version = versionFile.replace(/\.(json|yaml)$/, "");
        const specContent = this.manifestManager.readSpecFile(name, version);
        return JSON.parse(specContent);
      });
    }

    // For external URLs, throw error since custom client doesn't fetch external specs
    throw new Error(`External URL not supported in custom client: ${url}`);
  }

  /**
   * Get endpoint schema for custom source
   */
  async getEndpointSchema(
    apiId: string,
    method: string,
    path: string,
  ): Promise<any> {
    const cacheKey = `endpoint_schema:${apiId}:${method}:${path}`;

    return this.fetchWithCache(cacheKey, async () => {
      const [, name, version] = apiId.split(":");
      if (!name || !version) {
        throw new Error(
          `Invalid custom API ID format: ${apiId}. Expected format: custom:name:version`,
        );
      }

      const specContent = this.manifestManager.readSpecFile(name, version);
      const spec = JSON.parse(specContent);

      // Handle both direct OpenAPI spec and ApiGuru wrapper format
      let openApiSpec;
      if (spec.openapi || spec.swagger) {
        // Direct OpenAPI spec
        openApiSpec = spec;
      } else if (spec.versions && spec.preferred) {
        // ApiGuru wrapper format
        const preferredVersion = spec.versions[spec.preferred];
        openApiSpec = preferredVersion.spec;
      } else {
        throw new Error(`Invalid spec format for: ${apiId}`);
      }

      const pathItem = openApiSpec.paths?.[path];
      const operation = pathItem?.[method.toLowerCase()];

      if (!operation) {
        throw new Error(`Endpoint not found: ${method} ${path}`);
      }

      return {
        api_id: apiId,
        method: method.toUpperCase(),
        path,
        parameters: operation.parameters || [],
        requestBody: operation.requestBody,
        responses: operation.responses || {},
        source: "custom",
      };
    });
  }

  /**
   * Get endpoint examples for custom source
   */
  async getEndpointExamples(
    apiId: string,
    method: string,
    path: string,
  ): Promise<any> {
    const cacheKey = `endpoint_examples:${apiId}:${method}:${path}`;

    return this.fetchWithCache(cacheKey, async () => {
      // Validate that the endpoint exists by calling getEndpointSchema
      await this.getEndpointSchema(apiId, method, path);

      return {
        api_id: apiId,
        method: method.toUpperCase(),
        path,
        request_examples: [], // Custom source doesn't have examples
        response_examples: [], // Custom source doesn't have examples
        source: "custom",
      };
    });
  }

  /**
   * Get detailed information about a specific endpoint
   */
  async getEndpointDetails(
    apiId: string,
    method: string,
    path: string,
  ): Promise<{
    method: string;
    path: string;
    summary?: string;
    description?: string;
    operationId?: string;
    tags: string[];
    deprecated?: boolean;
    parameters: Array<{
      name: string;
      in: string;
      required: boolean;
      type: string;
      description?: string;
    }>;
    responses: Array<{
      code: string;
      description: string;
      content_types: string[];
    }>;
    consumes: string[];
    produces: string[];
    security?: Array<{
      type: string;
      scopes?: string[];
    }>;
  }> {
    const cacheKey = `endpoint_details:${apiId}:${method.toLowerCase()}:${path}`;

    return this.fetchWithCache(
      cacheKey,
      async () => {
        // Get the custom spec - extract name and version from apiId
        const [, name, version] = apiId.split(":");
        if (!name || !version) {
          throw new Error(
            `Invalid custom API ID format: ${apiId}. Expected format: custom:name:version`,
          );
        }

        const specEntry = this.manifestManager.getSpec(apiId);
        if (!specEntry) {
          throw new Error(`API not found: ${apiId}`);
        }

        // Load the OpenAPI spec
        const specContent = this.manifestManager.readSpecFile(name, version);
        const specData = JSON.parse(specContent);

        // Handle both direct OpenAPI spec and ApiGuru wrapper format
        let spec;
        if (specData.openapi || specData.swagger) {
          // Direct OpenAPI spec
          spec = specData;
        } else if (specData.versions && specData.preferred) {
          // ApiGuru wrapper format
          const preferredVersion = specData.versions[specData.preferred];
          if (!preferredVersion || !preferredVersion.spec) {
            throw new Error(`OpenAPI spec not available for: ${apiId}`);
          }
          spec = preferredVersion.spec;
        } else {
          throw new Error(`Invalid spec format for: ${apiId}`);
        }

        if (!spec.paths || !spec.paths[path]) {
          throw new Error(`Path not found: ${path} in API: ${apiId}`);
        }

        const pathItem = spec.paths[path];
        const operation = pathItem[method.toLowerCase()];

        if (!operation) {
          throw new Error(
            `Method ${method.toUpperCase()} not found for path: ${path} in API: ${apiId}`,
          );
        }

        // Extract parameters
        const parameters: Array<{
          name: string;
          in: string;
          required: boolean;
          type: string;
          description?: string;
        }> = [];

        // Add path-level parameters
        if (pathItem.parameters) {
          for (const param of pathItem.parameters) {
            parameters.push({
              name: param.name,
              in: param.in,
              required: param.required || false,
              type: param.schema?.type || param.type || "string",
              description: param.description,
            });
          }
        }

        // Add operation-level parameters
        if (operation.parameters) {
          for (const param of operation.parameters) {
            parameters.push({
              name: param.name,
              in: param.in,
              required: param.required || false,
              type: param.schema?.type || param.type || "string",
              description: param.description,
            });
          }
        }

        // Extract responses
        const responses: Array<{
          code: string;
          description: string;
          content_types: string[];
        }> = [];

        if (operation.responses) {
          for (const [code, response] of Object.entries(operation.responses)) {
            const responseObj = response as any;
            responses.push({
              code,
              description: responseObj.description || "",
              content_types: responseObj.content
                ? Object.keys(responseObj.content)
                : [],
            });
          }
        }

        // Extract security requirements
        const security: Array<{
          type: string;
          scopes?: string[];
        }> = [];

        const securityRequirements = operation.security || spec.security || [];
        for (const securityReq of securityRequirements) {
          for (const [securityName, scopes] of Object.entries(securityReq)) {
            const securityScheme =
              spec.components?.securitySchemes?.[securityName];
            if (securityScheme) {
              security.push({
                type: securityScheme.type,
                scopes: Array.isArray(scopes) ? scopes : [],
              });
            }
          }
        }

        return {
          method: method.toUpperCase(),
          path,
          summary: operation.summary,
          description: operation.description,
          operationId: operation.operationId,
          tags: operation.tags || [],
          deprecated: operation.deprecated || false,
          parameters,
          responses,
          consumes: operation.consumes || spec.consumes || [],
          produces: operation.produces || spec.produces || [],
          ...(security.length > 0 && { security }),
        };
      },
      600000,
    ); // Cache for 10 minutes
  }

  /**
   * List APIs with pagination support (for testing compatibility)
   */
  private async listAPIsPaginated(page: number = 1, limit: number = 20): Promise<{
    data: Array<{
      id: string;
      title: string;
      description: string;
      version: string;
      provider: string;
      added: string;
      preferred: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const cacheKey = `list:paginated:${page}:${limit}`;
    
    return this.fetchWithCache(cacheKey, async () => {
      const specs = this.manifestManager.listSpecs();
      
      // Convert specs to API format
      const apiList = specs.map(spec => {
        this.manifestManager.parseSpecId(spec.id);
        return {
          id: spec.id,
          title: spec.title,
          description: spec.description,
          version: spec.version,
          provider: 'custom',
          added: spec.imported,
          preferred: spec.version
        };
      });
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = apiList.slice(startIndex, endIndex);
      
      return {
        data: paginatedData,
        pagination: {
          page,
          limit,
          total: apiList.length,
          totalPages: Math.ceil(apiList.length / limit)
        }
      };
    });
  }
}
