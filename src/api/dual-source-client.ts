import { ApiClient } from "./client.js";
import { SecondaryApiClient } from "./secondary-client.js";
import { CustomSpecClient } from "../custom-specs/custom-spec-client.js";
import { MergeUtilities, MergedSearchResult } from "../utils/merge.js";
import { ICacheManager } from "../cache/types.js";
import { PaginationHelper } from "../utils/pagination.js";
import { PAGINATION } from "../utils/constants.js";
import { ApiGuruAPI, ApiGuruApiVersion, ApiGuruMetrics, ApiGuruServices } from "../types/api.js";
import {
  ProviderStats,
  calculateProviderStats,
  CACHE_KEYS,
  CACHE_TTL,
} from "../utils/version-data.js";

/**
 * Triple-source API client that combines data from primary (APIs.guru), secondary, and custom sources
 * Precedence: Custom > Secondary > Primary (Custom always wins)
 */
export class DualSourceApiClient {
  private primaryClient: ApiClient;
  private secondaryClient: SecondaryApiClient;
  private customClient: CustomSpecClient;
  private cache: ICacheManager;

  constructor(
    primaryBaseURL: string,
    secondaryBaseURL: string,
    cacheManager: ICacheManager,
  ) {
    this.primaryClient = new ApiClient(primaryBaseURL, cacheManager);
    this.secondaryClient = new SecondaryApiClient(
      secondaryBaseURL,
      cacheManager,
    );
    this.customClient = new CustomSpecClient(cacheManager);
    this.cache = cacheManager;
  }

  private async fetchWithCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = this.cache.get<T>(`triple:${key}`);
    if (cached) {
      return cached;
    }

    const result = await fetchFn();
    this.cache.set(`triple:${key}`, result, ttl);
    return result;
  }

  /**
   * List all providers from all three sources
   */
  async getProviders(): Promise<{ data: string[] }> {
    return this.fetchWithCache(CACHE_KEYS.PROVIDERS, async () => {
      const [primaryProviders, secondaryProviders, customProviders] =
        await Promise.allSettled([
          this.primaryClient.getProviders(),
          this.secondaryClient.getProviders(),
          this.customClient.getProviders(),
        ]);

      const primary =
        primaryProviders.status === "fulfilled"
          ? primaryProviders.value
          : { data: [] };
      const secondary =
        secondaryProviders.status === "fulfilled"
          ? secondaryProviders.value
          : { data: [] };
      const custom =
        customProviders.status === "fulfilled"
          ? customProviders.value
          : { data: [] };

      // Merge all three sources
      const merged = MergeUtilities.mergeProviders(primary, secondary);
      return MergeUtilities.mergeProviders(merged, custom);
    });
  }

  /**
   * List all APIs for a particular provider from all sources
   * Custom specs take precedence over secondary and primary
   */
  async getProvider(provider: string): Promise<Record<string, ApiGuruAPI>> {
    return this.fetchWithCache(
      `${CACHE_KEYS.PROVIDER_PREFIX}${provider}`,
      async () => {
        const [primaryAPIs, secondaryAPIs, customAPIs] =
          await Promise.allSettled([
            this.primaryClient.getProvider(provider),
            this.secondaryClient.getProvider(provider),
            this.customClient.getProvider(provider),
          ]);

        const primary =
          primaryAPIs.status === "fulfilled" ? primaryAPIs.value : {};
        const secondary =
          secondaryAPIs.status === "fulfilled" ? secondaryAPIs.value : {};
        const custom =
          customAPIs.status === "fulfilled" ? customAPIs.value : {};

        // Merge with custom taking highest precedence
        const merged = MergeUtilities.mergeAPILists(primary, secondary);
        return MergeUtilities.mergeAPILists(merged, custom);
      },
    );
  }

  /**
   * List all serviceNames for a particular provider
   * Try custom first, then secondary, then primary
   */
  async getServices(provider: string): Promise<ApiGuruServices> {
    return this.fetchWithCache(`services:${provider}`, async () => {
      // Check if custom has this provider
      const hasCustom = await this.customClient.hasProvider(provider);

      if (hasCustom) {
        try {
          return await this.customClient.getServices(provider);
        } catch (error) {
          // Fallback to secondary/primary if custom fails
        }
      }

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
   * Custom takes highest precedence, then secondary, then primary
   */
  async getAPI(provider: string, api: string): Promise<ApiGuruAPI> {
    return this.fetchWithCache(`api:${provider}:${api}`, async () => {
      const apiId = `${provider}:${api}`;

      // Check custom first (highest precedence)
      const hasCustomAPI = await this.customClient.hasAPI(apiId);

      if (hasCustomAPI) {
        try {
          return await this.customClient.getAPI(provider, api);
        } catch (error) {
          // Fallback to secondary/primary if custom fails
        }
      }

      // Check secondary next
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
   * Custom takes highest precedence, then secondary, then primary
   */
  async getServiceAPI(
    provider: string,
    service: string,
    api: string,
  ): Promise<ApiGuruAPI> {
    return this.fetchWithCache(
      `api:${provider}:${service}:${api}`,
      async () => {
        // For custom provider, check if it's actually a direct API call
        if (provider === "custom") {
          // Try to find the API by name first (service parameter)
          const hasCustomByName = await this.customClient.hasAPI(
            `custom:${service}:v1`,
          );
          if (hasCustomByName) {
            try {
              return await this.customClient.getAPI(provider, service);
            } catch (error) {
              // Continue to try other approaches
            }
          }
        }

        const apiId = `${provider}:${service}:${api}`;

        // Check custom first (highest precedence)
        const hasCustomAPI = await this.customClient.hasAPI(apiId);

        if (hasCustomAPI) {
          try {
            return await this.customClient.getServiceAPI(
              provider,
              service,
              api,
            );
          } catch (error) {
            // Fallback to secondary/primary if custom fails
          }
        }

        // Check secondary next
        const hasSecondaryAPI = await this.secondaryClient.hasAPI(apiId);

        if (hasSecondaryAPI) {
          try {
            return await this.secondaryClient.getServiceAPI(
              provider,
              service,
              api,
            );
          } catch (error) {
            // Fallback to primary if secondary fails
          }
        }

        return await this.primaryClient.getServiceAPI(provider, service, api);
      },
    );
  }

  /**
   * List all APIs from all three sources with custom taking highest precedence
   */
  async listAPIs(): Promise<Record<string, ApiGuruAPI>> {
    return this.fetchWithCache("all_apis", async () => {
      const [primaryAPIs, secondaryAPIs, customAPIs] = await Promise.allSettled(
        [
          this.primaryClient.listAPIs(),
          this.secondaryClient.listAPIs(),
          this.customClient.listAPIs(),
        ],
      );

      const primary =
        primaryAPIs.status === "fulfilled" ? primaryAPIs.value : {};
      const secondary =
        secondaryAPIs.status === "fulfilled" ? secondaryAPIs.value : {};
      const custom = customAPIs.status === "fulfilled" ? customAPIs.value : {};

      // Merge with custom taking highest precedence
      const merged = MergeUtilities.mergeAPILists(primary, secondary);
      return MergeUtilities.mergeAPILists(merged, custom);
    });
  }

  /**
   * Get paginated APIs with minimal data from all three sources
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
    const cacheKey = `paginated_apis:${page}:${limit}`;

    return this.fetchWithCache(
      cacheKey,
      async () => {
        // Use pagination helper to fetch data efficiently
        const [primaryResults, secondaryResults, customResults] =
          await Promise.allSettled([
            PaginationHelper.smartFetch(
              async (page, limit) => {
                const response = await this.primaryClient.getPaginatedAPIs(
                  page,
                  limit,
                );
                return {
                  data: response.results,
                  total: response.pagination.total_results,
                  hasMore: response.pagination.has_next,
                };
              },
              {
                maxTotal: PAGINATION.LARGE_FETCH_LIMIT,
                chunkSize: PAGINATION.CHUNKED_FETCH_SIZE,
              },
            ).then((result) => ({
              data: result.data,
              total: result.totalFetched,
              hasMore: false,
            })),
            this.secondaryClient.listAPIs(),
            this.customClient.listAPIs(),
          ]);

        const primary =
          primaryResults.status === "fulfilled"
            ? primaryResults.value
            : {
                results: [],
                pagination: {
                  page: 1,
                  limit: 0,
                  total_results: 0,
                  total_pages: 0,
                  has_next: false,
                  has_previous: false,
                },
              };

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
        } = {
          results: [],
          pagination: {
            page: 1,
            limit: 0,
            total_results: 0,
            total_pages: 0,
            has_next: false,
            has_previous: false,
          },
        };
        if (secondaryResults.status === "fulfilled") {
          const secondaryAPIs = secondaryResults.value;
          const secondaryEntries = Object.entries(secondaryAPIs);

          secondary = {
            results: secondaryEntries.map(([id, api]) => {
              const preferredVersion = api.versions[api.preferred];
              return {
                id,
                title: preferredVersion?.info.title || "Untitled API",
                description:
                  (preferredVersion?.info.description || "").substring(0, 200) +
                  (preferredVersion?.info.description &&
                  preferredVersion.info.description.length > 200
                    ? "..."
                    : ""),
                provider:
                  preferredVersion?.info["x-providerName"] ||
                  id.split(":")[0] ||
                  "Unknown",
                preferred: api.preferred,
                categories:
                  preferredVersion?.info["x-apisguru-categories"] || [],
              };
            }),
            pagination: {
              page: 1,
              limit: secondaryEntries.length,
              total_results: secondaryEntries.length,
              total_pages: 1,
              has_next: false,
              has_previous: false,
            },
          };
        }

        let custom: {
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
        } = {
          results: [],
          pagination: {
            page: 1,
            limit: 0,
            total_results: 0,
            total_pages: 0,
            has_next: false,
            has_previous: false,
          },
        };
        if (customResults.status === "fulfilled") {
          const customAPIs = customResults.value as Record<string, ApiGuruAPI>;
          const customEntries = Object.entries(customAPIs);

          custom = {
            results: customEntries.map(([id, api]) => {
              const preferredVersion = api.versions[api.preferred];
              return {
                id,
                title: preferredVersion?.info.title || "Untitled API",
                description:
                  (preferredVersion?.info.description || "").substring(0, 200) +
                  (preferredVersion?.info.description &&
                  preferredVersion.info.description.length > 200
                    ? "..."
                    : ""),
                provider:
                  preferredVersion?.info["x-providerName"] ||
                  id.split(":")[0] ||
                  "Unknown",
                preferred: api.preferred,
                categories:
                  preferredVersion?.info["x-apisguru-categories"] || [],
              };
            }),
            pagination: {
              page: 1,
              limit: customEntries.length,
              total_results: customEntries.length,
              total_pages: 1,
              has_next: false,
              has_previous: false,
            },
          };
        }

        // Merge all three sources with custom taking highest precedence
        const merged = MergeUtilities.mergePaginatedAPIs(
          primary,
          secondary,
          page,
          limit,
        );
        return MergeUtilities.mergePaginatedAPIs(merged, custom, page, limit);
      },
      300000,
    ); // Cache for 5 minutes
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
    return this.fetchWithCache(
      "api_summary",
      async () => {
        // Get combined API list for accurate summary
        const allAPIs = await this.listAPIs();
        const apiEntries = Object.entries(allAPIs);

        // Calculate summary statistics
        const providers = new Set<string>();
        const categories = new Set<string>();

        const apisWithScore = apiEntries.map(([id, api]) => {
          const preferredVersion = api.versions[api.preferred];
          const provider =
            preferredVersion?.info["x-providerName"] ||
            id.split(":")[0] ||
            "Unknown";
          providers.add(provider);

          // Add categories
          (preferredVersion?.info["x-apisguru-categories"] || []).forEach(
            (cat) => categories.add(cat),
          );

          // Calculate popularity score
          const versionCount = Object.keys(api.versions).length;
          const popularity =
            preferredVersion?.info["x-apisguru-popularity"] || 0;
          const score = versionCount * 10 + popularity;

          const latestUpdate = Math.max(
            ...Object.values(api.versions).map((v) =>
              new Date(v.updated).getTime(),
            ),
          );

          return {
            id,
            title: preferredVersion?.info.title || "Untitled API",
            provider,
            score,
            updated: latestUpdate,
            updatedString: new Date(latestUpdate).toISOString().split("T")[0],
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
          .map(({ id, title, updatedString }) => ({
            id,
            title,
            updated: updatedString || "Unknown",
          }));

        return {
          total_apis: apiEntries.length,
          total_providers: providers.size,
          categories: Array.from(categories).sort(),
          popular_apis,
          recent_updates,
        };
      },
      600000,
    ); // Cache for 10 minutes
  }

  /**
   * Get combined metrics from all three sources accounting for overlaps
   */
  async getMetrics(): Promise<ApiGuruMetrics> {
    return this.fetchWithCache(
      "metrics",
      async () => {
        const [
          primaryMetrics,
          secondaryMetrics,
          customMetrics,
          primaryAPIs,
          secondaryAPIs,
          customAPIs,
        ] = await Promise.allSettled([
          this.primaryClient.getMetrics(),
          this.secondaryClient.getMetrics(),
          this.customClient.getMetrics(),
          this.primaryClient.listAPIs(),
          this.secondaryClient.listAPIs(),
          this.customClient.listAPIs(),
        ]);

        const primary =
          primaryMetrics.status === "fulfilled"
            ? primaryMetrics.value
            : { numSpecs: 0, numAPIs: 0, numEndpoints: 0 };
        const secondary =
          secondaryMetrics.status === "fulfilled"
            ? secondaryMetrics.value
            : { numSpecs: 0, numAPIs: 0, numEndpoints: 0 };
        const custom =
          customMetrics.status === "fulfilled"
            ? customMetrics.value
            : { numSpecs: 0, numAPIs: 0, numEndpoints: 0 };
        const primaryApiList =
          primaryAPIs.status === "fulfilled" ? primaryAPIs.value : {};
        const secondaryApiList =
          secondaryAPIs.status === "fulfilled" ? secondaryAPIs.value : {};
        const customApiList =
          customAPIs.status === "fulfilled" ? customAPIs.value : {};

        // First merge primary and secondary
        const merged = await MergeUtilities.aggregateMetrics(
          primary,
          secondary,
          primaryApiList,
          secondaryApiList,
        );

        // Then merge custom on top (custom always wins)
        return await MergeUtilities.aggregateMetrics(
          merged,
          custom,
          { ...primaryApiList, ...secondaryApiList },
          customApiList,
        );
      },
      300000,
    ); // Cache for 5 minutes to reflect custom spec changes
  }

  /**
   * Search APIs across all three sources with intelligent merging
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
    // Ensure limit is within bounds
    limit = Math.min(Math.max(limit, 1), 50);

    const cacheKey = `search:${query}:${provider || "all"}:${page}:${limit}`;

    return this.fetchWithCache(
      cacheKey,
      async () => {
        const [primaryResults, secondaryResults, customResults] =
          await Promise.allSettled([
            this.primaryClient.searchAPIs(query, provider, 1, 1000), // Get many results for merging
            this.secondaryClient.listAPIs(), // Search in secondary manually
            this.customClient.listAPIs(), // Search in custom manually
          ]);

        const primary =
          primaryResults.status === "fulfilled"
            ? primaryResults.value
            : {
                results: [],
                pagination: {
                  page: 1,
                  limit: 0,
                  total_results: 0,
                  total_pages: 0,
                  has_next: false,
                  has_previous: false,
                },
              };

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
        } = {
          results: [],
          pagination: {
            page: 1,
            limit: 0,
            total_results: 0,
            total_pages: 0,
            has_next: false,
            has_previous: false,
          },
        };
        if (secondaryResults.status === "fulfilled") {
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
              Object.values(api.versions).some(
                (version: ApiGuruApiVersion) =>
                  version.info.title?.toLowerCase().includes(queryLower) ||
                  version.info.description
                    ?.toLowerCase()
                    .includes(queryLower) ||
                  version.info["x-providerName"]
                    ?.toLowerCase()
                    .includes(queryLower),
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
                title: preferredVersion?.info.title || "Untitled API",
                description:
                  (preferredVersion?.info.description || "").substring(0, 200) +
                  (preferredVersion?.info.description &&
                  preferredVersion.info.description.length > 200
                    ? "..."
                    : ""),
                provider:
                  preferredVersion?.info["x-providerName"] ||
                  id.split(":")[0] ||
                  "Unknown",
                preferred: api.preferred,
                categories:
                  preferredVersion?.info["x-apisguru-categories"] || [],
              };
            }),
            pagination: {
              page: 1,
              limit: matchingAPIs.length,
              total_results: matchingAPIs.length,
              total_pages: 1,
              has_next: false,
              has_previous: false,
            },
          };
        }

        // Manual search in custom APIs
        let custom: {
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
        } = {
          results: [],
          pagination: {
            page: 1,
            limit: 0,
            total_results: 0,
            total_pages: 0,
            has_next: false,
            has_previous: false,
          },
        };
        if (customResults.status === "fulfilled") {
          const customAPIs = customResults.value as Record<string, ApiGuruAPI>;
          const queryLower = query.toLowerCase();
          const matchingAPIs: Array<[string, ApiGuruAPI]> = [];

          for (const [apiId, api] of Object.entries(customAPIs)) {
            // If provider filter is specified, check if API matches
            if (provider && !apiId.includes(provider)) {
              continue;
            }

            // Search in API ID, title, description, and provider name
            const matches =
              apiId.toLowerCase().includes(queryLower) ||
              Object.values(api.versions).some(
                (version: ApiGuruApiVersion) =>
                  version.info.title?.toLowerCase().includes(queryLower) ||
                  version.info.description
                    ?.toLowerCase()
                    .includes(queryLower) ||
                  version.info["x-providerName"]
                    ?.toLowerCase()
                    .includes(queryLower),
              );

            if (matches) {
              matchingAPIs.push([apiId, api]);
            }
          }

          custom = {
            results: matchingAPIs.map(([id, api]) => {
              const preferredVersion = api.versions[api.preferred];
              return {
                id,
                title: preferredVersion?.info.title || "Untitled API",
                description:
                  (preferredVersion?.info.description || "").substring(0, 200) +
                  (preferredVersion?.info.description &&
                  preferredVersion.info.description.length > 200
                    ? "..."
                    : ""),
                provider:
                  preferredVersion?.info["x-providerName"] ||
                  id.split(":")[0] ||
                  "Unknown",
                preferred: api.preferred,
                categories:
                  preferredVersion?.info["x-apisguru-categories"] || [],
              };
            }),
            pagination: {
              page: 1,
              limit: matchingAPIs.length,
              total_results: matchingAPIs.length,
              total_pages: 1,
              has_next: false,
              has_previous: false,
            },
          };
        }

        // Merge all three sources with custom taking highest precedence
        const merged = MergeUtilities.mergeSearchResults(
          primary as MergedSearchResult,
          secondary as MergedSearchResult,
          query,
          page,
          limit,
        );
        return MergeUtilities.mergeSearchResults(
          merged as MergedSearchResult,
          custom as MergedSearchResult,
          query,
          page,
          limit,
        );
      },
      300000,
    ); // Cache search results for 5 minutes
  }

  // Forward remaining methods to primary client with secondary fallback when appropriate

  async getAPISummaryById(apiId: string): Promise<any> {
    // Check custom first (highest precedence)
    const hasCustom = await this.customClient.hasAPI(apiId);

    if (hasCustom) {
      try {
        // Build summary from custom API data
        const customAPIs = await this.customClient.listAPIs();
        const api = customAPIs[apiId];

        if (api) {
          const preferredVersion = api.versions[api.preferred];
          if (preferredVersion) {
            const info = preferredVersion.info;

            return {
              id: apiId,
              title: info.title || "Untitled API",
              description: info.description || "No description available",
              provider:
                info["x-providerName"] || apiId.split(":")[0] || "Unknown",
              versions: Object.keys(api.versions),
              preferred_version: api.preferred,
              base_url: preferredVersion.swaggerUrl
                .replace("/swagger.json", "")
                .replace("/swagger.yaml", ""),
              categories: info["x-apisguru-categories"] || [],
              authentication: {
                type: "See OpenAPI spec",
                description:
                  "Authentication details available in the full specification",
              },
              updated: preferredVersion.updated,
              added: preferredVersion.added,
              contact: info.contact,
              license: info.license,
              documentation_url: preferredVersion.link || info.contact?.url,
              homepage_url: info.contact?.url,
            };
          }
        }
      } catch (error) {
        // Fallback to secondary/primary if custom fails
      }
    }

    // Check secondary next
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
              title: info.title || "Untitled API",
              description: info.description || "No description available",
              provider:
                info["x-providerName"] || apiId.split(":")[0] || "Unknown",
              versions: Object.keys(api.versions),
              preferred_version: api.preferred,
              base_url: preferredVersion.swaggerUrl
                .replace("/swagger.json", "")
                .replace("/swagger.yaml", ""),
              categories: info["x-apisguru-categories"] || [],
              authentication: {
                type: "See OpenAPI spec",
                description:
                  "Authentication details available in the full specification",
              },
              updated: preferredVersion.updated,
              added: preferredVersion.added,
              contact: info.contact,
              license: info.license,
              documentation_url: preferredVersion.link || info.contact?.url,
              homepage_url: info.contact?.url,
            };
          }
        }
      } catch (error) {
        // Fallback to primary
      }
    }

    return await this.primaryClient.getAPISummaryById(apiId);
  }

  async getAPIEndpoints(
    apiId: string,
    page: number = 1,
    limit: number = 30,
    tag?: string,
  ): Promise<any> {
    // Check custom first (highest precedence)
    const hasCustom = await this.customClient.hasAPI(apiId);

    if (hasCustom) {
      try {
        return await this.customClient.getAPIEndpoints(apiId, page, limit, tag);
      } catch (error) {
        // Fallback to secondary/primary
      }
    }

    // Check secondary next
    const hasSecondary = await this.secondaryClient.hasAPI(apiId);

    if (hasSecondary) {
      try {
        // Try secondary client first, fall back to primary if method doesn't exist
        if (typeof this.secondaryClient.getAPIEndpoints === "function") {
          return await this.secondaryClient.getAPIEndpoints(
            apiId,
            page,
            limit,
            tag,
          );
        } else {
          // Secondary client doesn't have getAPIEndpoints, use primary with secondary data
          return await this.primaryClient.getAPIEndpoints(
            apiId,
            page,
            limit,
            tag,
          );
        }
      } catch (error) {
        // Fallback to primary
      }
    }

    return await this.primaryClient.getAPIEndpoints(apiId, page, limit, tag);
  }

  async getEndpointDetails(
    apiId: string,
    method: string,
    path: string,
  ): Promise<any> {
    // Check custom first (highest precedence)
    const hasCustom = await this.customClient.hasAPI(apiId);

    if (hasCustom) {
      try {
        return await this.customClient.getEndpointDetails(apiId, method, path);
      } catch (error) {
        // Fallback to secondary/primary if custom implementation fails
      }
    }

    // Check secondary next
    const hasSecondary = await this.secondaryClient.hasAPI(apiId);

    if (hasSecondary) {
      try {
        return await this.primaryClient.getEndpointDetails(apiId, method, path);
      } catch (error) {
        // Fallback to primary
      }
    }

    return await this.primaryClient.getEndpointDetails(apiId, method, path);
  }

  async getEndpointSchema(
    apiId: string,
    method: string,
    path: string,
  ): Promise<any> {
    // Check custom first (highest precedence)
    const hasCustom = await this.customClient.hasAPI(apiId);

    if (hasCustom) {
      try {
        return await this.primaryClient.getEndpointSchema(apiId, method, path); // Use primary implementation
      } catch (error) {
        // Fallback to secondary/primary
      }
    }

    // Check secondary next
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

  async getEndpointExamples(
    apiId: string,
    method: string,
    path: string,
  ): Promise<any> {
    // Check custom first (highest precedence)
    const hasCustom = await this.customClient.hasAPI(apiId);

    if (hasCustom) {
      try {
        return await this.primaryClient.getEndpointExamples(
          apiId,
          method,
          path,
        ); // Use primary implementation
      } catch (error) {
        // Fallback to secondary/primary
      }
    }

    // Check secondary next
    const hasSecondary = await this.secondaryClient.hasAPI(apiId);

    if (hasSecondary) {
      try {
        return await this.primaryClient.getEndpointExamples(
          apiId,
          method,
          path,
        ); // Use primary implementation
      } catch (error) {
        // Fallback to primary
      }
    }

    return await this.primaryClient.getEndpointExamples(apiId, method, path);
  }

  async getOpenAPISpec(url: string): Promise<any> {
    // Check if this is a custom API ID (format: custom:name:version)
    if (url.startsWith("custom:")) {
      const hasCustom = await this.customClient.hasAPI(url);

      if (hasCustom) {
        try {
          // Extract name and version from the API ID
          const [, name, version] = url.split(":");
          if (!name || !version) {
            throw new Error(
              `Invalid custom API ID format: ${url}. Expected format: custom:name:version`,
            );
          }

          // Get the OpenAPI spec from the custom client
          const manifestManager = this.customClient.getManifestManager();
          const specContent = manifestManager.readSpecFile(name, version);
          const apiData = JSON.parse(specContent);

          // Navigate to the actual OpenAPI spec (handle ApiGuruAPI format)
          const preferredVersion = apiData.versions[apiData.preferred];
          if (!preferredVersion || !preferredVersion.spec) {
            throw new Error(`OpenAPI spec not available for: ${url}`);
          }

          return preferredVersion.spec;
        } catch (error) {
          throw new Error(
            `Failed to load custom API spec: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      } else {
        throw new Error(`Custom API not found: ${url}`);
      }
    }

    // For regular URLs, use the primary client
    return await this.primaryClient.getOpenAPISpec(url);
  }

  async getPopularAPIs(): Promise<Record<string, ApiGuruAPI>> {
    // Use combined API list for popularity calculation
    const allAPIs = await this.listAPIs();
    const apiEntries = Object.entries(allAPIs);
    const scored = apiEntries.map(([id, api]) => {
      const versionCount = Object.keys(api.versions).length;
      const latestUpdate = Math.max(
        ...Object.values(api.versions).map((v) =>
          new Date(v.updated).getTime(),
        ),
      );

      const score = versionCount * 10 + latestUpdate / 1000000;
      return { id, api, score };
    });

    const popular = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .reduce(
        (acc, { id, api }) => {
          acc[id] = api;
          return acc;
        },
        {} as Record<string, ApiGuruAPI>,
      );

    return popular;
  }

  async getRecentlyUpdatedAPIs(
    limit: number = 10,
  ): Promise<Record<string, ApiGuruAPI>> {
    // Use combined API list
    const allAPIs = await this.listAPIs();
    const apiEntries = Object.entries(allAPIs);
    const withLatestUpdate = apiEntries.map(([id, api]) => {
      const latestUpdate = Math.max(
        ...Object.values(api.versions).map((v) =>
          new Date(v.updated).getTime(),
        ),
      );
      return { id, api, updated: latestUpdate };
    });

    const recent = withLatestUpdate
      .sort((a, b) => b.updated - a.updated)
      .slice(0, limit)
      .reduce(
        (acc, { id, api }) => {
          acc[id] = api;
          return acc;
        },
        {} as Record<string, ApiGuruAPI>,
      );

    return recent;
  }

  async getProviderStats(provider: string): Promise<ProviderStats> {
    return this.fetchWithCache(
      `${CACHE_KEYS.STATS_PREFIX}${provider}`,
      async () => {
        // Get provider APIs from the appropriate source
        const providerAPIs = await this.getProvider(provider);
        return calculateProviderStats(providerAPIs);
      },
      CACHE_TTL.PROVIDER_STATS,
    );
  }

  /**
   * Invalidate caches that depend on custom specs
   */
  invalidateCustomSpecCaches(): void {
    // Invalidate custom spec caches
    this.customClient.invalidateCache();

    // Invalidate aggregated caches that include custom spec data
    const aggregatedKeys = [
      "triple:providers",
      "triple:all_apis",
      "triple:metrics",
      "triple:api_summary",
    ];

    this.cache.invalidateKeys(aggregatedKeys);

    // Also invalidate paginated and search caches since they include custom data
    this.cache.invalidatePattern("triple:paginated_apis:*");
    this.cache.invalidatePattern("triple:search:*");
  }

  /**
   * Warm critical caches after custom spec changes
   */
  async warmCriticalCaches(): Promise<void> {
    try {
      // Warm the most commonly accessed caches
      await Promise.allSettled([
        this.cache.warmCache("triple:providers", () => this.getProviders()),
        this.cache.warmCache("triple:metrics", () => this.getMetrics(), 300000), // 5 minutes TTL
        this.cache.warmCache("triple:all_apis", () => this.listAPIs()),
      ]);

      // Critical caches warmed successfully
    } catch (error) {
      // Cache warming failed - continue silently
    }
  }
}
