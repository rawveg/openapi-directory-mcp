"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MergeUtilities = void 0;
class MergeUtilities {
    /**
     * Merge API lists from both sources with secondary taking precedence
     */
    static mergeAPILists(primaryAPIs, secondaryAPIs) {
        const merged = { ...primaryAPIs };
        // Secondary APIs override primary ones
        for (const [apiId, api] of Object.entries(secondaryAPIs)) {
            merged[apiId] = api;
        }
        return merged;
    }
    /**
     * Merge provider lists from both sources
     */
    static mergeProviders(primaryProviders, secondaryProviders) {
        const uniqueProviders = new Set([
            ...primaryProviders.data,
            ...secondaryProviders.data,
        ]);
        return {
            data: Array.from(uniqueProviders).sort(),
        };
    }
    /**
     * Merge search results with intelligent ranking
     */
    static mergeSearchResults(primaryResults, secondaryResults, query, page, limit) {
        // Combine all results
        const allResults = [
            ...primaryResults.results.map((r) => ({
                ...r,
                source: "primary",
            })),
            ...secondaryResults.results.map((r) => ({
                ...r,
                source: "secondary",
            })),
        ];
        // Remove duplicates, secondary takes precedence
        const uniqueResults = new Map();
        // Add primary results first
        for (const result of allResults.filter((r) => r.source === "primary")) {
            uniqueResults.set(result.id, result);
        }
        // Add secondary results, overriding primary
        for (const result of allResults.filter((r) => r.source === "secondary")) {
            uniqueResults.set(result.id, result);
        }
        // Convert back to array and sort by relevance
        const mergedResults = Array.from(uniqueResults.values());
        // Sort results by relevance (same logic as in search)
        mergedResults.sort((a, b) => {
            const queryLower = query.toLowerCase();
            const scoreMatch = (id, provider, title) => {
                if (provider.toLowerCase() === queryLower)
                    return 100;
                if (provider.toLowerCase().includes(queryLower))
                    return 80;
                if (id.toLowerCase().startsWith(queryLower))
                    return 60;
                if (id.toLowerCase().includes(queryLower))
                    return 40;
                if (title.toLowerCase().includes(queryLower))
                    return 20;
                return 10;
            };
            const scoreA = scoreMatch(a.id, a.provider, a.title);
            const scoreB = scoreMatch(b.id, b.provider, b.title);
            // Secondary source gets slight boost in case of ties
            const sourceBoostA = a.source === "secondary" ? 1 : 0;
            const sourceBoostB = b.source === "secondary" ? 1 : 0;
            if (scoreA !== scoreB) {
                return scoreB - scoreA;
            }
            if (sourceBoostA !== sourceBoostB) {
                return sourceBoostB - sourceBoostA;
            }
            return a.id.localeCompare(b.id);
        });
        // Apply pagination
        const total_results = mergedResults.length;
        const total_pages = Math.ceil(total_results / limit);
        const offset = (page - 1) * limit;
        const paginatedResults = mergedResults.slice(offset, offset + limit);
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
        };
    }
    /**
     * Merge paginated API results
     */
    static mergePaginatedAPIs(primaryResults, secondaryResults, page, limit) {
        // Get unique APIs by merging both sources
        const primaryAPIs = {};
        const secondaryAPIs = {};
        // Convert paginated results back to API objects for merging
        for (const result of primaryResults.results) {
            primaryAPIs[result.id] = {
                added: new Date().toISOString(),
                preferred: result.preferred,
                versions: {
                    [result.preferred]: {
                        info: {
                            title: result.title,
                            version: result.preferred,
                            description: result.description,
                            "x-providerName": result.provider,
                            "x-apisguru-categories": result.categories,
                        },
                        updated: new Date().toISOString(),
                        added: new Date().toISOString(),
                        swaggerUrl: "",
                        swaggerYamlUrl: "",
                        openapiVer: "3.0.0",
                    },
                },
            };
        }
        for (const result of secondaryResults.results) {
            secondaryAPIs[result.id] = {
                added: new Date().toISOString(),
                preferred: result.preferred,
                versions: {
                    [result.preferred]: {
                        info: {
                            title: result.title,
                            version: result.preferred,
                            description: result.description,
                            "x-providerName": result.provider,
                            "x-apisguru-categories": result.categories,
                        },
                        updated: new Date().toISOString(),
                        added: new Date().toISOString(),
                        swaggerUrl: "",
                        swaggerYamlUrl: "",
                        openapiVer: "3.0.0",
                    },
                },
            };
        }
        // Merge with secondary taking precedence
        const mergedAPIs = this.mergeAPILists(primaryAPIs, secondaryAPIs);
        const apiEntries = Object.entries(mergedAPIs);
        // Calculate pagination
        const total_results = apiEntries.length;
        const total_pages = Math.ceil(total_results / limit);
        const offset = (page - 1) * limit;
        // Get page slice and transform back to minimal data
        const pageEntries = apiEntries.slice(offset, offset + limit);
        const results = pageEntries.map(([id, api]) => {
            const preferredVersion = api.versions[api.preferred];
            return {
                id,
                title: preferredVersion?.info.title || "Untitled API",
                description: (preferredVersion?.info.description || "").substring(0, 200) +
                    (preferredVersion?.info.description &&
                        preferredVersion.info.description.length > 200
                        ? "..."
                        : ""),
                provider: preferredVersion?.info["x-providerName"] ||
                    id.split(":")[0] ||
                    "Unknown",
                preferred: api.preferred,
                categories: preferredVersion?.info["x-apisguru-categories"] || [],
            };
        });
        return {
            results,
            pagination: {
                page,
                limit,
                total_results,
                total_pages,
                has_next: page < total_pages,
                has_previous: page > 1,
            },
        };
    }
    /**
     * Aggregate metrics from both sources accounting for overlaps
     */
    static async aggregateMetrics(primaryMetrics, secondaryMetrics, primaryAPIs, secondaryAPIs) {
        // Identify overlaps
        const primaryApiIds = new Set(Object.keys(primaryAPIs));
        const secondaryApiIds = new Set(Object.keys(secondaryAPIs));
        const overlappingApiIds = new Set([...secondaryApiIds].filter((id) => primaryApiIds.has(id)));
        // Calculate unique providers
        const primaryProviders = new Set();
        const secondaryProviders = new Set();
        Object.entries(primaryAPIs).forEach(([id, api]) => {
            const preferredVersion = api.versions[api.preferred];
            const provider = preferredVersion?.info["x-providerName"] || id.split(":")[0];
            if (provider)
                primaryProviders.add(provider);
        });
        Object.entries(secondaryAPIs).forEach(([id, api]) => {
            const preferredVersion = api.versions[api.preferred];
            const provider = preferredVersion?.info["x-providerName"] || id.split(":")[0];
            if (provider)
                secondaryProviders.add(provider);
        });
        // Calculate unique APIs (secondary takes precedence for overlaps)
        const uniqueApiCount = primaryApiIds.size + secondaryApiIds.size - overlappingApiIds.size;
        // Calculate endpoints (this is approximate since we'd need to fetch all specs)
        // For now, we'll use a weighted approach based on API counts
        const primaryWeight = (primaryApiIds.size - overlappingApiIds.size) / primaryApiIds.size;
        const estimatedEndpoints = Math.round((primaryMetrics.numEndpoints || 0) * primaryWeight +
            (secondaryMetrics.numEndpoints || 0));
        // Calculate specifications
        let totalSpecs = primaryMetrics.numSpecs || uniqueApiCount;
        if (secondaryMetrics.numSpecs) {
            totalSpecs =
                (primaryMetrics.numSpecs || 0) +
                    secondaryMetrics.numSpecs -
                    overlappingApiIds.size;
        }
        return {
            ...primaryMetrics, // Keep other fields from primary
            // Update the key metrics with our calculated values
            numSpecs: totalSpecs,
            numAPIs: uniqueApiCount,
            numEndpoints: estimatedEndpoints,
        };
    }
    /**
     * Get conflict information for debugging/monitoring
     */
    static getConflictInfo(primaryAPIs, secondaryAPIs) {
        const primaryApiIds = new Set(Object.keys(primaryAPIs));
        const secondaryApiIds = new Set(Object.keys(secondaryAPIs));
        const conflictingAPIs = [...secondaryApiIds].filter((id) => primaryApiIds.has(id));
        const primaryOnlyCount = primaryApiIds.size - conflictingAPIs.length;
        const secondaryOnlyCount = secondaryApiIds.size - conflictingAPIs.length;
        return {
            totalConflicts: conflictingAPIs.length,
            conflictingAPIs,
            primaryOnlyCount,
            secondaryOnlyCount,
        };
    }
}
exports.MergeUtilities = MergeUtilities;
