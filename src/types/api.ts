/**
 * Type definitions for APIs.guru API responses
 */

export interface ApiGuruProvider {
  data: string[];
}

export interface ApiGuruServices {
  data: string[];
}

export interface ApiGuruAPI {
  added: string;
  preferred: string;
  versions: Record<string, ApiGuruApiVersion>;
}

export interface ApiGuruApiVersion {
  added: string;
  updated: string;
  swaggerUrl: string;
  swaggerYamlUrl: string;
  link?: string;
  info: ApiGuruInfo;
  externalDocs?: ApiGuruExternalDocs;
  openapiVer: string;
}

export interface ApiGuruInfo {
  title?: string;
  version: string;
  description?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name?: string;
    url?: string;
  };
  termsOfService?: string;
  "x-apiClientRegistration"?: {
    url?: string;
  };
  "x-logo"?: {
    url?: string;
  };
  "x-origin"?: {
    format?: string;
    url?: string;
    version?: string;
  };
  "x-preferred"?: boolean;
  "x-providerName"?: string;
  "x-serviceName"?: string;
  "x-tags"?: string[];
  "x-unofficialSpec"?: boolean;
  "x-apisguru-categories"?: string[];
  "x-apisguru-driver"?: string;
  "x-apisguru-popularity"?: number;
  [key: string]: any;
}

export interface ApiGuruExternalDocs {
  description?: string;
  url: string;
}

export interface ApiGuruMetrics {
  numSpecs: number;
  numAPIs: number;
  numEndpoints: number;
  unreachable?: number;
  invalid?: number;
  unofficial?: number;
  fixes?: number;
  fixedPct?: number;
  datasets?: any[];
  stars?: number;
  issues?: number;
  thisWeek?: {
    added: number;
    updated: number;
  };
  numDrivers?: number;
  numProviders?: number;
}

/**
 * Tool argument types
 */
export interface GetProviderArgs {
  provider: string;
}

export interface GetServicesArgs {
  provider: string;
}

export interface GetAPIArgs {
  provider: string;
  api: string;
  service?: string;
}

export interface SearchAPIsArgs {
  query: string;
  provider?: string;
}

/**
 * Search result types
 */
export interface ApiSearchResult {
  id: string;
  title: string;
  description?: string;
  provider: string;
  service?: string;
  version: string;
  preferred: boolean;
  added: string;
  updated: string;
  swaggerUrl: string;
  swaggerYamlUrl: string;
  categories?: string[];
  popularity?: number;
  unofficial?: boolean;
}

/**
 * Enhanced API metadata
 */
export interface ApiMetadata {
  id: string;
  title: string;
  description?: string;
  provider: string;
  service?: string;
  versions: string[];
  preferredVersion: string;
  latestUpdate: string;
  categories?: string[];
  popularity?: number;
  unofficial?: boolean;
  logo?: string;
  homepage?: string;
  documentation?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name?: string;
    url?: string;
  };
}

/**
 * Statistics and analytics types
 */
export interface ProviderStats {
  totalAPIs: number;
  totalVersions: number;
  latestUpdate: string;
  oldestAPI: string;
  newestAPI: string;
}

export interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
}

export interface PopularityStats {
  mostPopular: ApiMetadata[];
  recentlyUpdated: ApiMetadata[];
  recentlyAdded: ApiMetadata[];
}

/**
 * Error types
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Cache types
 */
export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  memoryUsage: number;
}
