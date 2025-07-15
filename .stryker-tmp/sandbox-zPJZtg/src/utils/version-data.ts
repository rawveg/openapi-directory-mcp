/**
 * Shared types and constants for version data handling
 */
// @ts-nocheck


/**
 * Interface for version data in provider statistics
 */
export interface VersionData {
  updated: string;
  added: string;
  [key: string]: unknown; // Allow additional properties for flexibility while maintaining type safety
}

/**
 * Interface for provider statistics return type
 */
export interface ProviderStats {
  totalAPIs: number;
  totalVersions: number;
  latestUpdate: string;
  oldestAPI: string;
  newestAPI: string;
}

/**
 * Union type for different API formats across provider sources
 * Using unknown for maximum flexibility while maintaining some type safety
 */
export type ProviderAPI =
  | VersionData
  | { versions: Record<string, unknown>; preferred?: string }
  | unknown;

/**
 * Constants for default date values
 */
export const EPOCH_DATE = new Date(0);
export const DEFAULT_DATE = EPOCH_DATE;

/**
 * Cache key prefixes to avoid duplication across clients
 */
export const CACHE_KEYS = {
  STATS_PREFIX: "stats:",
  PROVIDER_PREFIX: "provider:",
  API_PREFIX: "api:",
  SERVICES_PREFIX: "services:",
  PROVIDERS: "providers",
} as const;

/**
 * Cache TTL constants for consistency across clients
 */
export const CACHE_TTL = {
  PROVIDER_STATS: 1800000, // 30 minutes
  PROVIDER_DATA: 3600000, // 1 hour
  API_DATA: 600000, // 10 minutes
} as const;

/**
 * Safely parse a date string with validation
 */
function safeParseDate(dateString: string): Date {
  if (!dateString || typeof dateString !== "string") {
    return DEFAULT_DATE;
  }
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? DEFAULT_DATE : date;
}

/**
 * Type guard to check if an object has version data properties
 */
function hasVersionData(obj: unknown): obj is VersionData {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "updated" in obj &&
    "added" in obj &&
    typeof (obj as any).updated === "string" &&
    typeof (obj as any).added === "string"
  );
}

/**
 * Calculate provider statistics from API data
 * This shared function handles the common logic for computing stats from provider APIs
 */
export function calculateProviderStats(
  providerAPIs: Record<string, unknown>,
): ProviderStats {
  // Handle case where provider doesn't exist or returns empty result
  if (!providerAPIs || Object.keys(providerAPIs).length === 0) {
    return {
      totalAPIs: 0,
      totalVersions: 0,
      latestUpdate: DEFAULT_DATE.toISOString(),
      oldestAPI: "",
      newestAPI: "",
    };
  }

  let totalVersions = 0;
  let latestUpdate = DEFAULT_DATE;
  let oldestAPI = "";
  let newestAPI = "";
  let oldestDate = new Date(8640000000000000); // Max safe date (far future)
  let newestDate = DEFAULT_DATE;

  for (const [apiId, api] of Object.entries(providerAPIs)) {
    // Handle different API formats:
    // - Secondary/Custom format: has 'versions' property with multiple versions
    // - Primary format: API object is the version data directly
    let versions: unknown[] = [];

    if (
      api &&
      typeof api === "object" &&
      "versions" in api &&
      api.versions &&
      typeof api.versions === "object"
    ) {
      // Secondary/Custom format
      versions = Object.values(api.versions);
    } else if (hasVersionData(api)) {
      // Primary format - treat the API object as a single version
      versions = [api];
    }

    totalVersions += versions.length;

    for (const version of versions) {
      if (!hasVersionData(version)) continue;

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
