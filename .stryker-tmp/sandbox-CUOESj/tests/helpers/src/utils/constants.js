// @ts-nocheck
"use strict";
/**
 * Application-wide constants for timeouts, cache TTLs, and configuration values
 * Centralizes magic numbers for better maintainability
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALIDATION = exports.FILE_EXTENSIONS = exports.USER_AGENT = exports.ERROR_CODES = exports.RATE_LIMITS = exports.CACHE_LIMITS = exports.PAGINATION = exports.HTTP_TIMEOUTS = exports.CACHE_TTL = void 0;
exports.CACHE_TTL = {
    // Default cache TTL (24 hours)
    DEFAULT: 24 * 60 * 60 * 1000,
    // API data caching
    PROVIDERS: 24 * 60 * 60 * 1000, // 24 hours - providers change rarely
    APIS: 12 * 60 * 60 * 1000, // 12 hours - API list moderately stable
    SPECS: 6 * 60 * 60 * 1000, // 6 hours - specs can be updated
    ENDPOINTS: 10 * 60 * 1000, // 10 minutes - endpoint details
    // Search and discovery
    SEARCH: 5 * 60 * 1000, // 5 minutes - search results
    POPULAR: 60 * 60 * 1000, // 1 hour - popular APIs
    RECENT: 30 * 60 * 1000, // 30 minutes - recently updated
    // Metadata and stats
    STATS: 30 * 60 * 1000, // 30 minutes - provider stats
    METRICS: 60 * 60 * 1000, // 1 hour - general metrics
    // Testing and development
    TEST_SHORT: 5 * 60 * 1000, // 5 minutes - for testing
    TEST_MEDIUM: 15 * 60 * 1000, // 15 minutes - for integration tests
};
exports.HTTP_TIMEOUTS = {
    // API client timeouts (in milliseconds)
    DEFAULT: 30 * 1000, // 30 seconds default
    QUICK: 10 * 1000, // 10 seconds for quick operations
    SPEC_FETCH: 60 * 1000, // 1 minute for large spec downloads
    SEARCH: 15 * 1000, // 15 seconds for search operations
    // Testing timeouts
    TEST_OPERATION: 20 * 1000, // 20 seconds per test operation
    TEST_SUITE: 5 * 60 * 1000, // 5 minutes for full test suite
};
exports.PAGINATION = {
    // Default page sizes
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    MIN_LIMIT: 1,
    // Large data fetch limits (as noted in code review)
    LARGE_FETCH_LIMIT: 1000, // Reduced from 10,000
    CHUNKED_FETCH_SIZE: 100, // Chunk size for large fetches
};
exports.CACHE_LIMITS = {
    // Cache size limits
    MAX_KEYS: 1000,
    MAX_MEMORY_MB: 100,
    // Cache check intervals
    CHECK_PERIOD_RATIO: 0.1, // Check every 10% of TTL
};
exports.RATE_LIMITS = {
    // API rate limiting
    EXTERNAL_API_REQUESTS_PER_MINUTE: 10,
    PRIMARY_API_REQUESTS_PER_MINUTE: 30,
    SECONDARY_API_REQUESTS_PER_MINUTE: 20,
    TESTING_REQUESTS_PER_MINUTE: 5,
    // Burst limits
    BURST_MULTIPLIER: 1.5,
};
exports.ERROR_CODES = {
    // Custom error codes for better categorization
    NETWORK_ERROR: "NETWORK_ERROR",
    TIMEOUT_ERROR: "TIMEOUT_ERROR",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    NOT_FOUND_ERROR: "NOT_FOUND_ERROR",
    RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",
    CACHE_ERROR: "CACHE_ERROR",
    SPEC_PARSE_ERROR: "SPEC_PARSE_ERROR",
    AUTH_ERROR: "AUTH_ERROR",
    SERVER_ERROR: "SERVER_ERROR",
    UNKNOWN_ERROR: "UNKNOWN_ERROR",
};
exports.USER_AGENT = {
    // User agent strings
    DEFAULT: "openapi-directory-mcp/1.3.5",
    WITH_DUAL_SOURCE: "openapi-directory-mcp/1.3.5-dual-source",
    TESTING: "openapi-directory-mcp/1.3.5-testing",
};
exports.FILE_EXTENSIONS = {
    // Supported file extensions
    OPENAPI: [".json", ".yaml", ".yml"],
    SPECS: [".json", ".yaml", ".yml", ".openapi"],
    COMPRESSED: [".gz", ".tar.gz", ".zip"],
};
exports.VALIDATION = {
    // Validation limits
    MAX_FILE_SIZE_MB: 50,
    MAX_SPEC_SIZE_MB: 10,
    MIN_SPEC_SIZE_BYTES: 100,
    // Path validation
    MAX_PATH_LENGTH: 4096,
    ALLOWED_PATH_CHARS: /^[a-zA-Z0-9._\-/\\:]+$/,
};
