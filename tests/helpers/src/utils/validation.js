"use strict";
/**
 * Validation utilities for enhanced security and data integrity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.URLValidator = exports.APIDataValidator = exports.CacheValidator = exports.FileValidator = exports.PathValidator = void 0;
const crypto_1 = require("crypto");
const path_1 = require("path");
const url_1 = require("url");
const os_1 = require("os");
const constants_js_1 = require("./constants.js");
const errors_js_1 = require("./errors.js");
// ES module compatibility
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
/**
 * Path validation to prevent path traversal attacks
 */
class PathValidator {
    /**
     * Validate file path for security
     */
    static validatePath(path) {
        if (!path) {
            throw new errors_js_1.ValidationError("Path cannot be empty");
        }
        if (path.length > constants_js_1.VALIDATION.MAX_PATH_LENGTH) {
            throw new errors_js_1.ValidationError(`Path too long (max ${constants_js_1.VALIDATION.MAX_PATH_LENGTH} characters)`);
        }
        // Check for path traversal attempts
        if (path.includes("..") || path.includes("~")) {
            throw new errors_js_1.ValidationError("Path traversal detected");
        }
        // Check for suspicious characters
        if (!constants_js_1.VALIDATION.ALLOWED_PATH_CHARS.test(path)) {
            throw new errors_js_1.ValidationError("Path contains invalid characters");
        }
        // Check for absolute paths outside allowed directories
        if (path.startsWith("/") && !PathValidator.isAllowedAbsolutePath(path)) {
            throw new errors_js_1.ValidationError("Absolute path not allowed");
        }
    }
    /**
     * Check if absolute path is in allowed directories
     */
    static isAllowedAbsolutePath(path) {
        const allowedPrefixes = [
            "/tmp/",
            "/var/tmp/",
            process.cwd(),
            __dirname,
            (0, os_1.homedir)(), // Allow home directory for cache files
        ];
        return allowedPrefixes.some((prefix) => path.startsWith(prefix));
    }
    /**
     * Sanitize path for safe usage
     */
    static sanitizePath(path) {
        return path
            .replace(/\.\./g, "") // Remove path traversal
            .replace(/[<>:"|?*]/g, "") // Remove invalid filename chars
            .replace(/\s+/g, "_") // Replace spaces with underscores
            .toLowerCase();
    }
    /**
     * Validate file extension
     */
    static validateFileExtension(path, allowedExtensions) {
        const extension = path.toLowerCase().substring(path.lastIndexOf("."));
        if (!allowedExtensions.includes(extension)) {
            throw new errors_js_1.ValidationError(`Invalid file extension. Allowed: ${allowedExtensions.join(", ")}`);
        }
    }
}
exports.PathValidator = PathValidator;
/**
 * File validation utilities
 */
class FileValidator {
    /**
     * Validate file size
     */
    static validateFileSize(sizeBytes, maxSizeMB = constants_js_1.VALIDATION.MAX_FILE_SIZE_MB) {
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (sizeBytes > maxSizeBytes) {
            throw new errors_js_1.ValidationError(`File too large (${Math.round(sizeBytes / 1024 / 1024)}MB). Maximum allowed: ${maxSizeMB}MB`);
        }
        if (sizeBytes < constants_js_1.VALIDATION.MIN_SPEC_SIZE_BYTES) {
            throw new errors_js_1.ValidationError(`File too small (${sizeBytes} bytes). Minimum required: ${constants_js_1.VALIDATION.MIN_SPEC_SIZE_BYTES} bytes`);
        }
    }
    /**
     * Validate OpenAPI spec file
     */
    static validateOpenAPIFile(path, sizeBytes) {
        PathValidator.validatePath(path);
        PathValidator.validateFileExtension(path, constants_js_1.FILE_EXTENSIONS.OPENAPI);
        FileValidator.validateFileSize(sizeBytes, constants_js_1.VALIDATION.MAX_SPEC_SIZE_MB);
    }
    /**
     * Validate file content structure
     */
    static validateOpenAPIContent(content) {
        let parsedContent;
        // Parse content if it's a string
        if (typeof content === "string") {
            try {
                parsedContent = JSON.parse(content);
            }
            catch (error) {
                throw new errors_js_1.ValidationError("Invalid JSON content");
            }
        }
        else {
            parsedContent = content;
        }
        if (!parsedContent || typeof parsedContent !== "object") {
            throw new errors_js_1.ValidationError("Invalid OpenAPI content: must be an object");
        }
        // Check for required OpenAPI fields
        if (!parsedContent.openapi && !parsedContent.swagger) {
            throw new errors_js_1.ValidationError("Invalid OpenAPI content: missing version field");
        }
        if (!parsedContent.info) {
            throw new errors_js_1.ValidationError("Invalid OpenAPI content: missing info field");
        }
        if (!parsedContent.info.title) {
            throw new errors_js_1.ValidationError("Invalid OpenAPI content: missing title in info");
        }
        // Basic structure validation
        if (parsedContent.paths && typeof parsedContent.paths !== "object") {
            throw new errors_js_1.ValidationError("Invalid OpenAPI content: paths must be an object");
        }
        if (parsedContent.components &&
            typeof parsedContent.components !== "object") {
            throw new errors_js_1.ValidationError("Invalid OpenAPI content: components must be an object");
        }
    }
}
exports.FileValidator = FileValidator;
/**
 * Cache validation utilities
 */
class CacheValidator {
    /**
     * Validate cache entry integrity
     */
    static validateCacheEntry(_key, data) {
        try {
            // Basic structure validation
            if (!data || typeof data !== "object") {
                return false;
            }
            // Check for required metadata
            if (!data.timestamp || !data.value) {
                return false;
            }
            // Validate timestamp
            const timestamp = new Date(data.timestamp);
            if (isNaN(timestamp.getTime())) {
                return false;
            }
            // Check if data is too old (beyond any reasonable TTL)
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            if (Date.now() - timestamp.getTime() > maxAge) {
                return false;
            }
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Generate cache integrity hash
     */
    static generateIntegrityHash(data) {
        const serialized = JSON.stringify(data, Object.keys(data).sort());
        return (0, crypto_1.createHash)("sha256").update(serialized).digest("hex");
    }
    /**
     * Verify cache integrity
     */
    static verifyCacheIntegrity(data, expectedHash) {
        try {
            const actualHash = CacheValidator.generateIntegrityHash(data);
            return actualHash === expectedHash;
        }
        catch (error) {
            return false;
        }
    }
}
exports.CacheValidator = CacheValidator;
/**
 * API data validation utilities
 */
class APIDataValidator {
    /**
     * Validate provider name
     */
    static validateProviderName(provider) {
        if (!provider || typeof provider !== "string") {
            throw new errors_js_1.ValidationError("Provider name must be a non-empty string");
        }
        if (provider.length > 255) {
            throw new errors_js_1.ValidationError("Provider name too long (max 255 characters)");
        }
        // Basic domain name validation
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(provider)) {
            throw new errors_js_1.ValidationError("Invalid provider name format");
        }
    }
    /**
     * Validate API identifier
     */
    static validateAPIId(apiId) {
        if (!apiId || typeof apiId !== "string") {
            throw new errors_js_1.ValidationError("API ID must be a non-empty string");
        }
        if (apiId.length > 500) {
            throw new errors_js_1.ValidationError("API ID too long (max 500 characters)");
        }
        // Check for valid format (provider:service:version or provider:service)
        const parts = apiId.split(":");
        if (parts.length < 2 || parts.length > 3) {
            throw new errors_js_1.ValidationError("Invalid API ID format (expected provider:service or provider:service:version)");
        }
        parts.forEach((part, index) => {
            if (!part.trim()) {
                throw new errors_js_1.ValidationError(`API ID part ${index + 1} cannot be empty`);
            }
        });
    }
    /**
     * Validate pagination parameters
     */
    static validatePagination(page, limit) {
        const validatedPage = Math.max(1, Math.floor(page || 1));
        const validatedLimit = Math.max(constants_js_1.VALIDATION.MIN_SPEC_SIZE_BYTES, Math.min(100, Math.floor(limit || 20)));
        return { page: validatedPage, limit: validatedLimit };
    }
    /**
     * Validate search query
     */
    static validateSearchQuery(query) {
        if (!query || typeof query !== "string") {
            throw new errors_js_1.ValidationError("Search query must be a non-empty string");
        }
        if (query.length < 2) {
            throw new errors_js_1.ValidationError("Search query too short (minimum 2 characters)");
        }
        if (query.length > 1000) {
            throw new errors_js_1.ValidationError("Search query too long (maximum 1000 characters)");
        }
        // Check for suspicious patterns
        const suspiciousPatterns = [
            /<script/i,
            /javascript:/i,
            /data:/i,
            /vbscript:/i,
        ];
        if (suspiciousPatterns.some((pattern) => pattern.test(query))) {
            throw new errors_js_1.ValidationError("Search query contains invalid content");
        }
    }
}
exports.APIDataValidator = APIDataValidator;
/**
 * URL validation utilities
 */
class URLValidator {
    /**
     * Validate URL format and security
     */
    static validateURL(url) {
        if (!url || typeof url !== "string") {
            throw new errors_js_1.ValidationError("URL must be a non-empty string");
        }
        try {
            const parsedURL = new URL(url);
            // Only allow HTTP and HTTPS
            if (!["http:", "https:"].includes(parsedURL.protocol)) {
                throw new errors_js_1.ValidationError("Only HTTP and HTTPS URLs are allowed");
            }
            // Block local/private addresses
            if (URLValidator.isLocalAddress(parsedURL.hostname)) {
                throw new errors_js_1.ValidationError("Local and private addresses are not allowed");
            }
        }
        catch (error) {
            if (error instanceof errors_js_1.ValidationError) {
                throw error;
            }
            throw new errors_js_1.ValidationError("Invalid URL format");
        }
    }
    /**
     * Check if hostname is a local/private address
     */
    static isLocalAddress(hostname) {
        const localPatterns = [
            /^localhost$/i,
            /^127\./,
            /^192\.168\./,
            /^10\./,
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
            /^169\.254\./,
            /^::1$/,
            /^fe80:/i,
        ];
        return localPatterns.some((pattern) => pattern.test(hostname));
    }
}
exports.URLValidator = URLValidator;
