"use strict";
/**
 * Custom spec client - filesystem-based implementation following ApiClient interface
 * Provides same interface as primary/secondary clients for seamless integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomSpecClient = void 0;
const manifest_manager_js_1 = require("./manifest-manager.js");
/**
 * Custom specification client that reads from local filesystem
 * Implements same interface as ApiClient and SecondaryApiClient
 */
class CustomSpecClient {
    constructor(cacheManager) {
        this.manifestManager = new manifest_manager_js_1.ManifestManager();
        this.cache = cacheManager;
    }
    async fetchWithCache(key, fetchFn, ttl) {
        const cached = this.cache.get(`custom:${key}`);
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
    async getProviders() {
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
    async getProvider(provider) {
        if (provider !== "custom") {
            return {};
        }
        return this.fetchWithCache(`provider:${provider}`, async () => {
            const specs = this.manifestManager.listSpecs();
            const apis = {};
            for (const specEntry of specs) {
                try {
                    const parsed = this.manifestManager.parseSpecId(specEntry.id);
                    if (!parsed)
                        continue;
                    const specContent = this.manifestManager.readSpecFile(parsed.name, parsed.version);
                    const spec = JSON.parse(specContent);
                    apis[specEntry.id] = spec;
                }
                catch (error) {
                    console.warn(`Failed to load spec ${specEntry.id}: ${error}`);
                }
            }
            return apis;
        });
    }
    /**
     * List all services for custom provider (returns names of imported APIs)
     */
    async getServices(provider) {
        if (provider !== "custom") {
            throw new Error(`Provider ${provider} not found in custom specs`);
        }
        return this.fetchWithCache(`services:${provider}`, async () => {
            const specs = this.manifestManager.listSpecs();
            const services = new Set();
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
    async getAPI(provider, api) {
        if (provider !== "custom") {
            throw new Error(`Provider ${provider} not found in custom specs`);
        }
        return this.fetchWithCache(`api:${provider}:${api}`, async () => {
            const specs = this.manifestManager.listSpecs();
            // Find spec by name (api parameter is the name part)
            const specEntry = specs.find((s) => {
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
    async getServiceAPI(provider, service, _api) {
        // For custom specs, service is the API name and api is the version
        // Just use service as the API name since custom specs are identified by name
        return this.getAPI(provider, service);
    }
    /**
     * List all APIs from custom specs
     */
    async listAPIs() {
        return this.fetchWithCache("all_apis", async () => {
            const specs = this.manifestManager.listSpecs();
            const apis = {};
            for (const specEntry of specs) {
                try {
                    const parsed = this.manifestManager.parseSpecId(specEntry.id);
                    if (!parsed)
                        continue;
                    const specContent = this.manifestManager.readSpecFile(parsed.name, parsed.version);
                    const spec = JSON.parse(specContent);
                    // The spec file is already in ApiGuruAPI format
                    apis[specEntry.id] = spec;
                }
                catch (error) {
                    console.warn(`Failed to load spec ${specEntry.id}: ${error}`);
                }
            }
            return apis;
        });
    }
    /**
     * Get metrics for custom specs
     */
    async getMetrics() {
        return this.fetchWithCache("metrics", async () => {
            const stats = this.manifestManager.getStats();
            const specs = this.manifestManager.listSpecs();
            // Calculate approximate endpoints by parsing specs
            let totalEndpoints = 0;
            for (const specEntry of specs) {
                try {
                    const parsed = this.manifestManager.parseSpecId(specEntry.id);
                    if (!parsed)
                        continue;
                    const specContent = this.manifestManager.readSpecFile(parsed.name, parsed.version);
                    const specData = JSON.parse(specContent);
                    // Count endpoints from the latest version
                    const latestVersion = specData.versions[specData.preferred];
                    if (latestVersion && latestVersion.spec && latestVersion.spec.paths) {
                        const paths = Object.keys(latestVersion.spec.paths);
                        totalEndpoints += paths.reduce((count, path) => {
                            const methods = Object.keys(latestVersion.spec.paths[path]);
                            return (count +
                                methods.filter((m) => [
                                    "get",
                                    "post",
                                    "put",
                                    "delete",
                                    "patch",
                                    "head",
                                    "options",
                                ].includes(m.toLowerCase())).length);
                        }, 0);
                    }
                }
                catch (error) {
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
    async hasAPI(apiId) {
        return this.manifestManager.hasSpec(apiId);
    }
    /**
     * Check if custom specs has a specific provider
     */
    async hasProvider(provider) {
        if (provider !== "custom") {
            return false;
        }
        const specs = this.manifestManager.listSpecs();
        return specs.length > 0;
    }
    /**
     * Get paginated APIs (for compatibility)
     */
    async getPaginatedAPIs(page = 1, limit = 50) {
        return this.fetchWithCache(`paginated_apis:${page}:${limit}`, async () => {
            const specs = this.manifestManager.listSpecs();
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedSpecs = specs.slice(startIndex, endIndex);
            const results = paginatedSpecs.map((spec) => {
                const parsed = this.manifestManager.parseSpecId(spec.id);
                return {
                    id: spec.id,
                    title: spec.title,
                    description: spec.description.substring(0, 200) +
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
        }, 300000);
    }
    /**
     * Search APIs in custom specs
     */
    async searchAPIs(query, provider, page = 1, limit = 20) {
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
        return this.fetchWithCache(cacheKey, async () => {
            const specs = this.manifestManager.listSpecs();
            const queryLower = query.toLowerCase();
            // Filter specs that match the query
            const matchingSpecs = specs.filter((spec) => {
                return (spec.id.toLowerCase().includes(queryLower) ||
                    spec.title.toLowerCase().includes(queryLower) ||
                    spec.description.toLowerCase().includes(queryLower) ||
                    spec.name.toLowerCase().includes(queryLower));
            });
            // Paginate results
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedSpecs = matchingSpecs.slice(startIndex, endIndex);
            const results = paginatedSpecs.map((spec) => {
                const parsed = this.manifestManager.parseSpecId(spec.id);
                return {
                    id: spec.id,
                    title: spec.title,
                    description: spec.description.substring(0, 200) +
                        (spec.description.length > 200 ? "..." : ""),
                    provider: "custom",
                    preferred: parsed?.version || "1.0.0",
                    categories: ["custom"],
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
        }, 300000);
    }
    /**
     * Get manifest manager for direct access
     */
    getManifestManager() {
        return this.manifestManager;
    }
    /**
     * Invalidate all custom spec caches (called when specs are imported/removed)
     */
    invalidateCache() {
        const deletedCount = this.cache.invalidatePattern("custom:*");
        console.log(`Invalidated ${deletedCount} custom spec cache entries`);
    }
    /**
     * Get summary information for all custom specs
     */
    async getCustomSpecsSummary() {
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
                        security_issues: spec.securityScan.summary.critical +
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
    async getAPIEndpoints(apiId, page = 1, limit = 30, tag) {
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
        const allEndpoints = [];
        for (const [path, pathMethods] of Object.entries(paths)) {
            for (const [method, operation] of Object.entries(pathMethods)) {
                if (["get", "post", "put", "delete", "patch", "head", "options"].includes(method.toLowerCase())) {
                    const op = operation; // Type assertion for OpenAPI operation object
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
    async getProviderStats(provider) {
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
    async getAPISummaryById(apiId) {
        return this.fetchWithCache(`api_summary:${apiId}`, async () => {
            const [, name, version] = apiId.split(":");
            if (!name || !version) {
                throw new Error(`Invalid custom API ID format: ${apiId}. Expected format: custom:name:version`);
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
    async getPopularAPIs(limit) {
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
    async getRecentlyUpdatedAPIs(limit) {
        return this.fetchWithCache(`recent:${limit}`, async () => {
            const specs = this.manifestManager.listSpecs();
            // Sort by imported date (most recent first)
            specs.sort((a, b) => new Date(b.imported).getTime() - new Date(a.imported).getTime());
            return {
                results: specs.slice(0, limit || 10).map((spec) => spec),
                source: "custom",
            };
        });
    }
    /**
     * Get OpenAPI specification for a custom API
     */
    async getOpenAPISpec(url) {
        // For custom specs, the URL might be a spec ID
        if (url.startsWith("custom:")) {
            return this.fetchWithCache(`spec:${url}`, async () => {
                const [, name, version] = url.split(":");
                if (!name || !version) {
                    throw new Error(`Invalid custom API ID format: ${url}`);
                }
                const specContent = this.manifestManager.readSpecFile(name, version);
                const api = JSON.parse(specContent);
                // Return the actual OpenAPI spec from the preferred version
                const preferredVersion = api.versions[api.preferred];
                return preferredVersion.spec;
            });
        }
        // For external URLs, throw error since custom client doesn't fetch external specs
        throw new Error(`External URL not supported in custom client: ${url}`);
    }
    /**
     * Get endpoint schema for custom source
     */
    async getEndpointSchema(apiId, method, path) {
        const cacheKey = `endpoint_schema:${apiId}:${method}:${path}`;
        return this.fetchWithCache(cacheKey, async () => {
            const [, name, version] = apiId.split(":");
            if (!name || !version) {
                throw new Error(`Invalid custom API ID format: ${apiId}. Expected format: custom:name:version`);
            }
            const specContent = this.manifestManager.readSpecFile(name, version);
            const api = JSON.parse(specContent);
            const preferredVersion = api.versions[api.preferred];
            const spec = preferredVersion.spec;
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
                source: "custom",
            };
        });
    }
    /**
     * Get endpoint examples for custom source
     */
    async getEndpointExamples(apiId, method, path) {
        const cacheKey = `endpoint_examples:${apiId}:${method}:${path}`;
        return this.fetchWithCache(cacheKey, async () => {
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
    async getEndpointDetails(apiId, method, path) {
        const cacheKey = `endpoint_details:${apiId}:${method.toLowerCase()}:${path}`;
        return this.fetchWithCache(cacheKey, async () => {
            // Get the custom spec - extract name and version from apiId
            const [, name, version] = apiId.split(":");
            if (!name || !version) {
                throw new Error(`Invalid custom API ID format: ${apiId}. Expected format: custom:name:version`);
            }
            const specEntry = this.manifestManager.getSpec(apiId);
            if (!specEntry) {
                throw new Error(`API not found: ${apiId}`);
            }
            // Load the OpenAPI spec - custom specs are stored in ApiGuruAPI format
            const specContent = this.manifestManager.readSpecFile(name, version);
            const apiData = JSON.parse(specContent);
            // Navigate to the actual OpenAPI spec
            const preferredVersion = apiData.versions[apiData.preferred];
            if (!preferredVersion || !preferredVersion.spec) {
                throw new Error(`OpenAPI spec not available for: ${apiId}`);
            }
            const spec = preferredVersion.spec;
            if (!spec.paths || !spec.paths[path]) {
                throw new Error(`Path not found: ${path} in API: ${apiId}`);
            }
            const pathItem = spec.paths[path];
            const operation = pathItem[method.toLowerCase()];
            if (!operation) {
                throw new Error(`Method ${method.toUpperCase()} not found for path: ${path} in API: ${apiId}`);
            }
            // Extract parameters
            const parameters = [];
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
            const responses = [];
            if (operation.responses) {
                for (const [code, response] of Object.entries(operation.responses)) {
                    const responseObj = response;
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
            const security = [];
            const securityRequirements = operation.security || spec.security || [];
            for (const securityReq of securityRequirements) {
                for (const [securityName, scopes] of Object.entries(securityReq)) {
                    const securityScheme = spec.components?.securitySchemes?.[securityName];
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
        }, 600000); // Cache for 10 minutes
    }
}
exports.CustomSpecClient = CustomSpecClient;
