// @ts-nocheck
"use strict";
/**
 * Shared types and constants for version data handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CACHE_TTL = exports.CACHE_KEYS = exports.DEFAULT_DATE = exports.EPOCH_DATE = void 0;
exports.calculateProviderStats = calculateProviderStats;
/**
 * Constants for default date values
 */
exports.EPOCH_DATE = new Date(0);
exports.DEFAULT_DATE = exports.EPOCH_DATE;
/**
 * Cache key prefixes to avoid duplication across clients
 */
exports.CACHE_KEYS = {
    STATS_PREFIX: "stats:",
    PROVIDER_PREFIX: "provider:",
    API_PREFIX: "api:",
    SERVICES_PREFIX: "services:",
    PROVIDERS: "providers",
};
/**
 * Cache TTL constants for consistency across clients
 */
exports.CACHE_TTL = {
    PROVIDER_STATS: 1800000, // 30 minutes
    PROVIDER_DATA: 3600000, // 1 hour
    API_DATA: 600000, // 10 minutes
};
/**
 * Safely parse a date string with validation
 */
function safeParseDate(dateString) {
    if (!dateString || typeof dateString !== "string") {
        return exports.DEFAULT_DATE;
    }
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? exports.DEFAULT_DATE : date;
}
/**
 * Type guard to check if an object has version data properties
 */
function hasVersionData(obj) {
    return (obj !== null &&
        typeof obj === "object" &&
        "updated" in obj &&
        "added" in obj &&
        typeof obj.updated === "string" &&
        typeof obj.added === "string");
}
/**
 * Calculate provider statistics from API data
 * This shared function handles the common logic for computing stats from provider APIs
 */
function calculateProviderStats(providerAPIs) {
    // Handle case where provider doesn't exist or returns empty result
    if (!providerAPIs || Object.keys(providerAPIs).length === 0) {
        return {
            totalAPIs: 0,
            totalVersions: 0,
            latestUpdate: exports.DEFAULT_DATE.toISOString(),
            oldestAPI: "",
            newestAPI: "",
        };
    }
    let totalVersions = 0;
    let latestUpdate = exports.DEFAULT_DATE;
    let oldestAPI = "";
    let newestAPI = "";
    let oldestDate = new Date(8640000000000000); // Max safe date (far future)
    let newestDate = exports.DEFAULT_DATE;
    for (const [apiId, api] of Object.entries(providerAPIs)) {
        // Handle different API formats:
        // - Secondary/Custom format: has 'versions' property with multiple versions
        // - Primary format: API object is the version data directly
        let versions = [];
        if (api &&
            typeof api === "object" &&
            "versions" in api &&
            api.versions &&
            typeof api.versions === "object") {
            // Secondary/Custom format
            versions = Object.values(api.versions);
        }
        else if (hasVersionData(api)) {
            // Primary format - treat the API object as a single version
            versions = [api];
        }
        totalVersions += versions.length;
        for (const version of versions) {
            if (!hasVersionData(version))
                continue;
            const updated = safeParseDate(version.updated);
            const added = safeParseDate(version.added);
            if (!isNaN(updated.getTime()) && updated > latestUpdate) {
                latestUpdate = updated;
            }
            if (!isNaN(added.getTime())) {
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
    }
    return {
        totalAPIs: Object.keys(providerAPIs).length,
        totalVersions,
        latestUpdate: latestUpdate.toISOString(),
        oldestAPI,
        newestAPI,
    };
}
