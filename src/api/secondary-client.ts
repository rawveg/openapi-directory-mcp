import axios, { AxiosInstance } from "axios";
import { ICacheManager } from "../cache/types.js";
import { ApiGuruAPI, ApiGuruMetrics, ApiGuruServices } from "../types/api.js";
import { rateLimiters } from "../utils/rate-limiter.js";
import { HTTP_TIMEOUTS, CACHE_TTL, USER_AGENT } from "../utils/constants.js";
import { ErrorFactory, ErrorHandler } from "../utils/errors.js";

/**
 * Secondary API client for the enhanced OpenAPI directory
 * Provides same interface as primary ApiClient for seamless merging
 */
export class SecondaryApiClient {
  private http: AxiosInstance;
  private cache: ICacheManager;

  constructor(baseURL: string, cacheManager: ICacheManager) {
    this.http = axios.create({
      baseURL,
      timeout: HTTP_TIMEOUTS.DEFAULT,
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT.WITH_DUAL_SOURCE,
      },
    });

    this.cache = cacheManager;
  }

  private async fetchWithCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cacheKey = `secondary:${key}`;
    const cached = this.cache.get<T>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Apply rate limiting to external API calls
      const result = await rateLimiters.secondary.execute(fetchFn);
      this.cache.set(cacheKey, result, ttl || CACHE_TTL.DEFAULT);
      return result;
    } catch (error) {
      const enhancedError = ErrorFactory.fromHttpError(error, {
        operation: "fetchWithCache",
        source: "secondary",
        details: { key, cacheKey },
      });
      ErrorHandler.logError(enhancedError);
      throw enhancedError;
    }
  }

  /**
   * List all providers in the secondary directory
   */
  async getProviders(): Promise<{ data: string[] }> {
    return this.fetchWithCache(
      "providers",
      async () => {
        const response = await this.http.get<{ data: string[] }>(
          "/providers.json",
        );
        return response.data;
      },
      CACHE_TTL.PROVIDERS,
    );
  }

  /**
   * List all APIs for a particular provider
   */
  async getProvider(provider: string): Promise<Record<string, ApiGuruAPI>> {
    return this.fetchWithCache(`provider:${provider}`, async () => {
      const response = await this.http.get<Record<string, ApiGuruAPI>>(
        `/${provider}.json`,
      );
      return response.data;
    });
  }

  /**
   * List all serviceNames for a particular provider
   */
  async getServices(provider: string): Promise<ApiGuruServices> {
    return this.fetchWithCache(`services:${provider}`, async () => {
      const response = await this.http.get<ApiGuruServices>(
        `/${provider}/services.json`,
      );
      return response.data;
    });
  }

  /**
   * Retrieve one version of a particular API (without service)
   */
  async getAPI(provider: string, api: string): Promise<ApiGuruAPI> {
    return this.fetchWithCache(`api:${provider}:${api}`, async () => {
      const response = await this.http.get<ApiGuruAPI>(
        `/specs/${provider}/${api}.json`,
      );
      return response.data;
    });
  }

  /**
   * Retrieve one version of a particular API with a serviceName
   */
  async getServiceAPI(
    provider: string,
    service: string,
    api: string,
  ): Promise<ApiGuruAPI> {
    return this.fetchWithCache(
      `api:${provider}:${service}:${api}`,
      async () => {
        const response = await this.http.get<ApiGuruAPI>(
          `/specs/${provider}/${service}/${api}.json`,
        );
        return response.data;
      },
    );
  }

  /**
   * List all APIs in the secondary directory
   */
  async listAPIs(): Promise<Record<string, ApiGuruAPI>> {
    return this.fetchWithCache(
      "all_apis",
      async () => {
        const response =
          await this.http.get<Record<string, ApiGuruAPI>>("/list.json");
        return response.data;
      },
      CACHE_TTL.APIS,
    );
  }

  /**
   * Get basic metrics for the secondary directory
   */
  async getMetrics(): Promise<ApiGuruMetrics> {
    return this.fetchWithCache(
      "metrics",
      async () => {
        const response = await this.http.get<ApiGuruMetrics>("/metrics.json");
        return response.data;
      },
      CACHE_TTL.METRICS,
    );
  }

  /**
   * Get OpenAPI specification for a specific API version
   */
  async getOpenAPISpec(url: string): Promise<any> {
    return this.fetchWithCacheNoRateLimit(
      `spec:${url}`,
      async () => {
        const response = await axios.get(url, {
          timeout: HTTP_TIMEOUTS.SPEC_FETCH,
        });
        return response.data;
      },
      CACHE_TTL.SPECS,
    );
  }

  /**
   * Fetch with cache but without rate limiting (for internal calls)
   */
  private async fetchWithCacheNoRateLimit<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cacheKey = `secondary:${key}`;
    const cached = this.cache.get<T>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await fetchFn();
      this.cache.set(cacheKey, result, ttl || CACHE_TTL.DEFAULT);
      return result;
    } catch (error) {
      const enhancedError = ErrorFactory.fromHttpError(error, {
        operation: "fetchWithCacheNoRateLimit",
        source: "secondary",
        details: { key, cacheKey },
      });
      ErrorHandler.logError(enhancedError);
      throw enhancedError;
    }
  }

  /**
   * Check if the secondary API has data for a specific provider
   */
  async hasProvider(provider: string): Promise<boolean> {
    try {
      const providers = await this.getProviders();
      return providers.data.includes(provider);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if the secondary API has a specific API
   */
  async hasAPI(apiId: string): Promise<boolean> {
    try {
      const allAPIs = await this.listAPIs();

      // Direct match
      if (apiId in allAPIs) {
        return true;
      }

      // If apiId includes version (provider:service:version), try without version
      const parts = apiId.split(":");
      if (parts.length === 3) {
        const withoutVersion = `${parts[0]}:${parts[1]}`;
        return withoutVersion in allAPIs;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get provider statistics for secondary source
   */
  async getProviderStats(provider: string): Promise<any> {
    return this.fetchWithCache(`provider_stats:${provider}`, async () => {
      const providerAPIs = await this.getProvider(provider);
      const apiCount = Object.keys(providerAPIs).length;

      return {
        provider,
        api_count: apiCount,
        source: "secondary",
      };
    });
  }

  /**
   * Get API summary by ID for secondary source
   */
  async getAPISummaryById(apiId: string): Promise<any> {
    return this.fetchWithCache(`api_summary:${apiId}`, async () => {
      const allAPIs = await this.listAPIs();
      let api = allAPIs[apiId];

      if (!api) {
        const parts = apiId.split(":");
        if (parts.length >= 2) {
          const withoutVersion = `${parts[0]}:${parts[1]}`;
          api = allAPIs[withoutVersion];
        }
      }

      if (!api) {
        throw new Error(`API not found: ${apiId}`);
      }

      return {
        id: apiId,
        versions: api.versions,
        preferred: api.preferred,
        source: "secondary",
      };
    });
  }

  /**
   * Search APIs in secondary source
   */
  async searchAPIs(query: string, limit?: number, page?: number): Promise<any> {
    return this.fetchWithCache(`search:${query}:${limit}:${page}`, async () => {
      const allAPIs = await this.listAPIs();
      const results = [];

      for (const [id, api] of Object.entries(allAPIs)) {
        if (id.toLowerCase().includes(query.toLowerCase())) {
          results.push({ id, ...api });
        }
      }

      const startIndex = ((page || 1) - 1) * (limit || 20);
      const endIndex = startIndex + (limit || 20);

      return {
        results: results.slice(startIndex, endIndex),
        total_results: results.length,
        query,
        source: "secondary",
      };
    });
  }

  /**
   * Get popular APIs from secondary source
   */
  async getPopularAPIs(limit?: number): Promise<any> {
    return this.fetchWithCache(`popular:${limit}`, async () => {
      const allAPIs = await this.listAPIs();
      const apiList = Object.entries(allAPIs).map(([id, api]) => ({
        id,
        ...api,
      }));

      // Sort by preferred version (as proxy for popularity)
      apiList.sort((a, b) =>
        (b.preferred || "").localeCompare(a.preferred || ""),
      );

      return {
        results: apiList.slice(0, limit || 20),
        source: "secondary",
      };
    });
  }

  /**
   * Get recently updated APIs from secondary source
   */
  async getRecentlyUpdatedAPIs(limit?: number): Promise<any> {
    return this.fetchWithCache(`recent:${limit}`, async () => {
      const allAPIs = await this.listAPIs();
      const apiList = Object.entries(allAPIs).map(([id, api]) => ({
        id,
        ...api,
      }));

      // Sort by preferred version (most recent first)
      apiList.sort((a, b) => {
        const aVersion = a.preferred || "0";
        const bVersion = b.preferred || "0";
        return bVersion.localeCompare(aVersion);
      });

      return {
        results: apiList.slice(0, limit || 10),
        source: "secondary",
      };
    });
  }

  /**
   * Get endpoint details for secondary source
   */
  async getEndpointDetails(
    apiId: string,
    method: string,
    path: string,
  ): Promise<any> {
    const cacheKey = `endpoint_details:${apiId}:${method}:${path}`;

    return this.fetchWithCache(cacheKey, async () => {
      const endpoints = await this.getAPIEndpoints(apiId);
      const endpoint = endpoints.results.find(
        (e) =>
          e.method.toUpperCase() === method.toUpperCase() && e.path === path,
      );

      if (!endpoint) {
        throw new Error(`Endpoint not found: ${method} ${path}`);
      }

      return {
        ...endpoint,
        api_id: apiId,
        source: "secondary",
      };
    });
  }

  /**
   * Get endpoint schema for secondary source
   */
  async getEndpointSchema(
    apiId: string,
    method: string,
    path: string,
  ): Promise<any> {
    const cacheKey = `endpoint_schema:${apiId}:${method}:${path}`;

    return this.fetchWithCache(cacheKey, async () => {
      // Get the full OpenAPI spec
      const allAPIs = await this.listAPIs();
      let api = allAPIs[apiId];

      if (!api) {
        const parts = apiId.split(":");
        if (parts.length === 3) {
          const withoutVersion = `${parts[0]}:${parts[1]}`;
          api = allAPIs[withoutVersion];
        }
      }

      if (!api) {
        throw new Error(`API not found: ${apiId}`);
      }

      const preferredVersion = api.versions[api.preferred];
      if (!preferredVersion) {
        throw new Error(`Preferred version not found for API: ${apiId}`);
      }
      const specUrl = preferredVersion.swaggerUrl.startsWith("http")
        ? preferredVersion.swaggerUrl
        : this.http.defaults.baseURL + preferredVersion.swaggerUrl;
      const spec = await this.getOpenAPISpec(specUrl);

      const pathItem = spec.paths?.[path];
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
        source: "secondary",
      };
    });
  }

  /**
   * Get endpoint examples for secondary source
   */
  async getEndpointExamples(
    apiId: string,
    method: string,
    path: string,
  ): Promise<any> {
    const cacheKey = `endpoint_examples:${apiId}:${method}:${path}`;

    return this.fetchWithCache(cacheKey, async () => {
      await this.getEndpointSchema(apiId, method, path);

      return {
        api_id: apiId,
        method: method.toUpperCase(),
        path,
        request_examples: [], // Secondary source doesn't have examples
        response_examples: [], // Secondary source doesn't have examples
        source: "secondary",
      };
    });
  }

  /**
   * Get endpoints for a specific API from secondary source
   */
  async getAPIEndpoints(
    apiId: string,
    page: number = 1,
    limit: number = 30,
    tag?: string,
  ): Promise<{
    results: Array<{
      method: string;
      path: string;
      summary?: string;
      operationId?: string;
      tags: string[];
      deprecated?: boolean;
    }>;
    pagination: {
      page: number;
      limit: number;
      total_results: number;
      total_pages: number;
      has_next: boolean;
      has_previous: boolean;
    };
    available_tags: string[];
  }> {
    // Ensure limit is within bounds
    limit = Math.min(Math.max(limit, 1), 100);

    const cacheKey = `secondary:endpoints:${apiId}:${page}:${limit}:${tag || "all"}`;

    return this.fetchWithCache(
      cacheKey,
      async () => {
        // Get the API info
        const allAPIs = await this.listAPIs();
        let api = allAPIs[apiId];

        // If not found and apiId has version, try without version
        if (!api) {
          const parts = apiId.split(":");
          if (parts.length === 3) {
            const withoutVersion = `${parts[0]}:${parts[1]}`;
            api = allAPIs[withoutVersion];
          }
        }

        if (!api) {
          throw new Error(`API not found: ${apiId}`);
        }

        const preferredVersion = api.versions[api.preferred];

        if (!preferredVersion) {
          throw new Error(`Preferred version not found for API: ${apiId}`);
        }

        // Fetch the OpenAPI spec
        const rawUrl = preferredVersion.swaggerUrl;
        const specUrl = rawUrl.startsWith("http")
          ? rawUrl
          : this.http.defaults.baseURL + rawUrl;
        const spec = await this.getOpenAPISpec(specUrl);

        // Extract endpoints from spec
        const endpoints: Array<{
          method: string;
          path: string;
          summary?: string;
          operationId?: string;
          tags: string[];
          deprecated?: boolean;
        }> = [];

        const availableTagsSet = new Set<string>();

        if (spec.paths) {
          for (const [path, pathItem] of Object.entries(spec.paths)) {
            if (typeof pathItem === "object" && pathItem !== null) {
              for (const [method, operation] of Object.entries(pathItem)) {
                if (
                  typeof operation === "object" &&
                  operation !== null &&
                  method !== "parameters"
                ) {
                  const op = operation as any;
                  const tags = op.tags || [];

                  // Add tags to available tags
                  tags.forEach((tag: string) => availableTagsSet.add(tag));

                  // Filter by tag if specified
                  if (tag && !tags.includes(tag)) {
                    continue;
                  }

                  endpoints.push({
                    method: method.toUpperCase(),
                    path,
                    summary: op.summary,
                    operationId: op.operationId,
                    tags,
                    deprecated: op.deprecated || false,
                  });
                }
              }
            }
          }
        }

        // Sort endpoints for consistent ordering
        endpoints.sort((a, b) => {
          if (a.path !== b.path) return a.path.localeCompare(b.path);
          return a.method.localeCompare(b.method);
        });

        const available_tags = Array.from(availableTagsSet).sort();

        // Apply pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedResults = endpoints.slice(startIndex, endIndex);

        const total_results = endpoints.length;
        const total_pages = Math.ceil(total_results / limit);

        return {
          results: paginatedResults,
          pagination: {
            page,
            limit,
            total_results,
            total_pages,
            has_next: page < total_pages,
            has_previous: page > 1,
          },
          available_tags,
        };
      },
      600000, // Cache for 10 minutes
    );
  }
}
