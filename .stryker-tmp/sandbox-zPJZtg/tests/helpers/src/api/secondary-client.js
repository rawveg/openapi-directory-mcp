// @ts-nocheck
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecondaryApiClient = void 0;
const axios_1 = require("axios");
const rate_limiter_js_1 = require("../utils/rate-limiter.js");
const constants_js_1 = require("../utils/constants.js");
const errors_js_1 = require("../utils/errors.js");
/**
 * Secondary API client for the enhanced OpenAPI directory
 * Provides same interface as primary ApiClient for seamless merging
 */
class SecondaryApiClient {
    constructor(baseURL, cacheManager) {
        this.http = axios_1.default.create({
            baseURL,
            timeout: constants_js_1.HTTP_TIMEOUTS.DEFAULT,
            headers: {
                Accept: "application/json",
                "User-Agent": constants_js_1.USER_AGENT.WITH_DUAL_SOURCE,
            },
        });
        this.cache = cacheManager;
    }
    async fetchWithCache(key, fetchFn, ttl) {
        const cacheKey = `secondary:${key}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }
        try {
            // Apply rate limiting to external API calls
            const result = await rate_limiter_js_1.rateLimiters.secondary.execute(fetchFn);
            this.cache.set(cacheKey, result, ttl || constants_js_1.CACHE_TTL.DEFAULT);
            return result;
        }
        catch (error) {
            const enhancedError = errors_js_1.ErrorFactory.fromHttpError(error, {
                operation: "fetchWithCache",
                source: "secondary",
                details: { key, cacheKey },
            });
            errors_js_1.ErrorHandler.logError(enhancedError);
            throw enhancedError;
        }
    }
    /**
     * List all providers in the secondary directory
     */
    async getProviders() {
        return this.fetchWithCache("providers", async () => {
            const response = await this.http.get("/providers.json");
            return response.data;
        }, constants_js_1.CACHE_TTL.PROVIDERS);
    }
    /**
     * List all APIs for a particular provider
     */
    async getProvider(provider) {
        return this.fetchWithCache(`provider:${provider}`, async () => {
            const response = await this.http.get(`/${provider}.json`);
            return response.data;
        });
    }
    /**
     * List all serviceNames for a particular provider
     */
    async getServices(provider) {
        return this.fetchWithCache(`services:${provider}`, async () => {
            const response = await this.http.get(`/${provider}/services.json`);
            return response.data;
        });
    }
    /**
     * Retrieve one version of a particular API (without service)
     */
    async getAPI(provider, api) {
        return this.fetchWithCache(`api:${provider}:${api}`, async () => {
            const response = await this.http.get(`/specs/${provider}/${api}.json`);
            return response.data;
        });
    }
    /**
     * Retrieve one version of a particular API with a serviceName
     */
    async getServiceAPI(provider, service, api) {
        return this.fetchWithCache(`api:${provider}:${service}:${api}`, async () => {
            const response = await this.http.get(`/specs/${provider}/${service}/${api}.json`);
            return response.data;
        });
    }
    /**
     * List all APIs in the secondary directory
     */
    async listAPIs() {
        return this.fetchWithCache("all_apis", async () => {
            const response = await this.http.get("/list.json");
            return response.data;
        }, constants_js_1.CACHE_TTL.APIS);
    }
    /**
     * Get basic metrics for the secondary directory
     */
    async getMetrics() {
        return this.fetchWithCache("metrics", async () => {
            const response = await this.http.get("/metrics.json");
            return response.data;
        }, constants_js_1.CACHE_TTL.METRICS);
    }
    /**
     * Get OpenAPI specification for a specific API version
     */
    async getOpenAPISpec(url) {
        return this.fetchWithCache(`spec:${url}`, async () => {
            const response = await axios_1.default.get(url, {
                timeout: constants_js_1.HTTP_TIMEOUTS.SPEC_FETCH,
            });
            return response.data;
        }, constants_js_1.CACHE_TTL.SPECS);
    }
    /**
     * Check if the secondary API has data for a specific provider
     */
    async hasProvider(provider) {
        try {
            const providers = await this.getProviders();
            return providers.data.includes(provider);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Check if the secondary API has a specific API
     */
    async hasAPI(apiId) {
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
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get provider statistics for secondary source
     */
    async getProviderStats(provider) {
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
    async getAPISummaryById(apiId) {
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
    async searchAPIs(query, limit, page) {
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
    async getPopularAPIs(limit) {
        return this.fetchWithCache(`popular:${limit}`, async () => {
            const allAPIs = await this.listAPIs();
            const apiList = Object.entries(allAPIs).map(([id, api]) => ({
                id,
                ...api,
            }));
            // Sort by preferred version (as proxy for popularity)
            apiList.sort((a, b) => (b.preferred || "").localeCompare(a.preferred || ""));
            return {
                results: apiList.slice(0, limit || 20),
                source: "secondary",
            };
        });
    }
    /**
     * Get recently updated APIs from secondary source
     */
    async getRecentlyUpdatedAPIs(limit) {
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
    async getEndpointDetails(apiId, method, path) {
        const cacheKey = `endpoint_details:${apiId}:${method}:${path}`;
        return this.fetchWithCache(cacheKey, async () => {
            const endpoints = await this.getAPIEndpoints(apiId);
            const endpoint = endpoints.results.find((e) => e.method.toUpperCase() === method.toUpperCase() && e.path === path);
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
    async getEndpointSchema(apiId, method, path) {
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
            const specUrl = preferredVersion.swaggerUrl;
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
    async getEndpointExamples(apiId, method, path) {
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
    async getAPIEndpoints(apiId, page = 1, limit = 30, tag) {
        // Ensure limit is within bounds
        limit = Math.min(Math.max(limit, 1), 100);
        const cacheKey = `secondary:endpoints:${apiId}:${page}:${limit}:${tag || "all"}`;
        return this.fetchWithCache(cacheKey, async () => {
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
            const specUrl = preferredVersion.swaggerUrl;
            const spec = await this.getOpenAPISpec(specUrl);
            // Extract endpoints from spec
            const endpoints = [];
            const availableTagsSet = new Set();
            if (spec.paths) {
                for (const [path, pathItem] of Object.entries(spec.paths)) {
                    if (typeof pathItem === "object" && pathItem !== null) {
                        for (const [method, operation] of Object.entries(pathItem)) {
                            if (typeof operation === "object" &&
                                operation !== null &&
                                method !== "parameters") {
                                const op = operation;
                                const tags = op.tags || [];
                                // Add tags to available tags
                                tags.forEach((tag) => availableTagsSet.add(tag));
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
                if (a.path !== b.path)
                    return a.path.localeCompare(b.path);
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
        }, 600000);
    }
}
exports.SecondaryApiClient = SecondaryApiClient;
