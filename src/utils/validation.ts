/**
 * Validation utilities for enhanced security and data integrity
 */

import { createHash } from "crypto";
import { homedir } from "os";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { VALIDATION, FILE_EXTENSIONS } from "./constants.js";
import { ValidationError, ErrorHandler } from "./errors.js";

/**
 * Path validation to prevent path traversal attacks
 */
export class PathValidator {
  /**
   * Validate file path for security
   */
  static validatePath(path: string): void {
    if (!path) {
      throw new ValidationError("Path cannot be empty");
    }

    if (path.length > VALIDATION.MAX_PATH_LENGTH) {
      throw new ValidationError(
        `Path too long (max ${VALIDATION.MAX_PATH_LENGTH} characters)`,
      );
    }

    // Check for path traversal attempts
    if (path.includes("..") || path.includes("~")) {
      throw new ValidationError("Path traversal detected");
    }

    // Check for suspicious characters
    if (!VALIDATION.ALLOWED_PATH_CHARS.test(path)) {
      throw new ValidationError("Path contains invalid characters");
    }

    // Check for absolute paths outside allowed directories
    if (path.startsWith("/") && !PathValidator.isAllowedAbsolutePath(path)) {
      throw new ValidationError("Absolute path not allowed");
    }
  }

  /**
   * Check if absolute path is in allowed directories
   */
  private static isAllowedAbsolutePath(path: string): boolean {
    const allowedPrefixes = [
      "/tmp/",
      "/var/tmp/",
      process.cwd(),
      homedir(), // Allow home directory for cache files
    ];

    return allowedPrefixes.some((prefix) => path.startsWith(prefix));
  }

  /**
   * Sanitize path for safe usage
   */
  static sanitizePath(path: string): string {
    return path
      .replace(/\.\./g, "") // Remove path traversal
      .replace(/[<>:"|?*]/g, "") // Remove invalid filename chars
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .toLowerCase();
  }

  /**
   * Validate file extension
   */
  static validateFileExtension(
    path: string,
    allowedExtensions: readonly string[],
  ): void {
    const extension = path.toLowerCase().substring(path.lastIndexOf("."));

    if (!allowedExtensions.includes(extension)) {
      throw new ValidationError(
        `Invalid file extension. Allowed: ${allowedExtensions.join(", ")}`,
      );
    }
  }
}

/**
 * File validation utilities
 */
export class FileValidator {
  /**
   * Validate file size
   */
  static validateFileSize(
    sizeBytes: number,
    maxSizeMB: number = VALIDATION.MAX_FILE_SIZE_MB,
  ): void {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (sizeBytes > maxSizeBytes) {
      throw new ValidationError(
        `File too large (${Math.round(sizeBytes / 1024 / 1024)}MB). Maximum allowed: ${maxSizeMB}MB`,
      );
    }

    if (sizeBytes < VALIDATION.MIN_SPEC_SIZE_BYTES) {
      throw new ValidationError(
        `File too small (${sizeBytes} bytes). Minimum required: ${VALIDATION.MIN_SPEC_SIZE_BYTES} bytes`,
      );
    }
  }

  /**
   * Validate OpenAPI spec file
   */
  static validateOpenAPIFile(path: string, sizeBytes: number): void {
    PathValidator.validatePath(path);
    PathValidator.validateFileExtension(path, FILE_EXTENSIONS.OPENAPI);
    FileValidator.validateFileSize(sizeBytes, VALIDATION.MAX_SPEC_SIZE_MB);
  }

  /**
   * Validate file content structure
   */
  static validateOpenAPIContent(content: string | any): void {
    let parsedContent: any;

    // Parse content if it's a string
    if (typeof content === "string") {
      try {
        parsedContent = JSON.parse(content);
      } catch (error) {
        throw new ValidationError("Invalid JSON content");
      }
    } else {
      parsedContent = content;
    }

    if (!parsedContent || typeof parsedContent !== "object") {
      throw new ValidationError("Invalid OpenAPI content: must be an object");
    }

    // Check for required OpenAPI fields
    if (!parsedContent.openapi && !parsedContent.swagger) {
      throw new ValidationError(
        "Invalid OpenAPI content: missing version field",
      );
    }

    if (!parsedContent.info) {
      throw new ValidationError("Invalid OpenAPI content: missing info field");
    }

    if (!parsedContent.info.title) {
      throw new ValidationError(
        "Invalid OpenAPI content: missing title in info",
      );
    }

    // Basic structure validation
    if (parsedContent.paths && typeof parsedContent.paths !== "object") {
      throw new ValidationError(
        "Invalid OpenAPI content: paths must be an object",
      );
    }

    if (
      parsedContent.components &&
      typeof parsedContent.components !== "object"
    ) {
      throw new ValidationError(
        "Invalid OpenAPI content: components must be an object",
      );
    }
  }
}

/**
 * Cache validation utilities
 */
export class CacheValidator {
  /**
   * Validate cache entry integrity
   */
  static validateCacheEntry(_key: string, data: any): boolean {
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
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate cache integrity hash
   */
  static generateIntegrityHash(data: any): string {
    const serialized = JSON.stringify(data, Object.keys(data).sort());
    return createHash("sha256").update(serialized).digest("hex");
  }

  /**
   * Verify cache integrity
   */
  static verifyCacheIntegrity(data: any, expectedHash: string): boolean {
    try {
      const actualHash = CacheValidator.generateIntegrityHash(data);
      return actualHash === expectedHash;
    } catch (error) {
      return false;
    }
  }
}

/**
 * API data validation utilities
 */
export class APIDataValidator {
  /**
   * Validate provider name
   */
  static validateProviderName(provider: string): void {
    if (!provider || typeof provider !== "string") {
      throw new ValidationError("Provider name must be a non-empty string");
    }

    if (provider.length > 255) {
      throw new ValidationError("Provider name too long (max 255 characters)");
    }

    // Basic domain name validation
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(provider)) {
      throw new ValidationError("Invalid provider name format");
    }
  }

  /**
   * Validate API identifier
   */
  static validateAPIId(apiId: string): void {
    if (!apiId || typeof apiId !== "string") {
      throw new ValidationError("API ID must be a non-empty string");
    }

    if (apiId.length > 500) {
      throw new ValidationError("API ID too long (max 500 characters)");
    }

    // Check for valid format (provider:service:version or provider:service)
    const parts = apiId.split(":");
    if (parts.length < 2 || parts.length > 3) {
      throw new ValidationError(
        "Invalid API ID format (expected provider:service or provider:service:version)",
      );
    }

    parts.forEach((part, index) => {
      if (!part.trim()) {
        throw new ValidationError(`API ID part ${index + 1} cannot be empty`);
      }
    });
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(
    page?: number,
    limit?: number,
  ): { page: number; limit: number } {
    const validatedPage = Math.max(1, Math.floor(page || 1));
    const validatedLimit = Math.max(
      VALIDATION.MIN_SPEC_SIZE_BYTES,
      Math.min(100, Math.floor(limit || 20)),
    );

    return { page: validatedPage, limit: validatedLimit };
  }

  /**
   * Validate search query
   */
  static validateSearchQuery(query: string): void {
    if (!query || typeof query !== "string") {
      throw new ValidationError("Search query must be a non-empty string");
    }

    if (query.length < 2) {
      throw new ValidationError(
        "Search query too short (minimum 2 characters)",
      );
    }

    if (query.length > 1000) {
      throw new ValidationError(
        "Search query too long (maximum 1000 characters)",
      );
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(query))) {
      throw new ValidationError("Search query contains invalid content");
    }
  }
}

/**
 * URL validation utilities
 */
export class URLValidator {
  /**
   * Validate URL format and security
   */
  static validateURL(url: string): void {
    if (!url || typeof url !== "string") {
      throw new ValidationError("URL must be a non-empty string");
    }

    try {
      const parsedURL = new URL(url);

      // Only allow HTTP and HTTPS
      if (!["http:", "https:"].includes(parsedURL.protocol)) {
        throw new ValidationError("Only HTTP and HTTPS URLs are allowed");
      }

      // Block local/private addresses
      if (URLValidator.isLocalAddress(parsedURL.hostname)) {
        throw new ValidationError(
          "Local and private addresses are not allowed",
        );
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError("Invalid URL format");
    }
  }

  /**
   * Check if hostname is a local/private address
   */
  private static isLocalAddress(hostname: string): boolean {
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

/**
 * Data validation and sanitization utilities
 * Ensures all API responses are properly validated before use
 */

export interface ValidationResult<T> {
  isValid: boolean;
  data: T;
  errors: string[];
  warnings: string[];
}

/**
 * Validation utilities for API responses
 */
export class DataValidator {
  /**
   * Validate and sanitize provider list
   */
  static validateProviders(
    providers: any,
  ): ValidationResult<{ data: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitizedData: string[] = [];

    // Check if providers is an object with data property
    if (!providers || typeof providers !== "object") {
      errors.push("Providers response must be an object");
      return {
        isValid: false,
        data: { data: [] },
        errors,
        warnings,
      };
    }

    // Check if data property exists and is an array
    if (!Array.isArray(providers.data)) {
      errors.push("Providers data must be an array");
      return {
        isValid: false,
        data: { data: [] },
        errors,
        warnings,
      };
    }

    // Validate and sanitize each provider entry
    for (let i = 0; i < providers.data.length; i++) {
      const provider = providers.data[i];

      // Skip null, undefined, or empty values
      if (provider == null || provider === "") {
        warnings.push(`Skipped null/empty provider at index ${i}`);
        continue;
      }

      // Convert to string if not already
      if (typeof provider !== "string") {
        warnings.push(
          `Converted non-string provider at index ${i}: ${typeof provider}`,
        );
        const stringified = String(provider);
        if (stringified === "[object Object]") {
          warnings.push(`Skipped unparseable object at index ${i}`);
          continue;
        }
        sanitizedData.push(stringified);
        continue;
      }

      // Validate string is not empty after trim
      const trimmed = provider.trim();
      if (trimmed.length === 0) {
        warnings.push(`Skipped empty provider at index ${i}`);
        continue;
      }

      // Basic domain validation (contains dot and no spaces)
      if (!trimmed.includes(".") || trimmed.includes(" ")) {
        warnings.push(`Suspicious provider format at index ${i}: "${trimmed}"`);
      }

      // Check for potential XSS/injection attempts
      if (this.containsSuspiciousContent(trimmed)) {
        warnings.push(
          `Potentially malicious provider at index ${i}: "${trimmed}"`,
        );
        // Still include it but logged for monitoring
      }

      sanitizedData.push(trimmed);
    }

    return {
      isValid: true,
      data: { data: sanitizedData },
      errors,
      warnings,
    };
  }

  /**
   * Validate and sanitize search results
   */
  static validateSearchResults(searchResults: any): ValidationResult<{
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
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!searchResults || typeof searchResults !== "object") {
      errors.push("Search results must be an object");
      return {
        isValid: false,
        data: {
          results: [],
          pagination: {
            page: 1,
            limit: 20,
            total_results: 0,
            total_pages: 0,
            has_next: false,
            has_previous: false,
          },
        },
        errors,
        warnings,
      };
    }

    // Validate results array
    const results: any[] = [];
    if (Array.isArray(searchResults.results)) {
      for (let i = 0; i < searchResults.results.length; i++) {
        const result = searchResults.results[i];
        if (result && typeof result === "object") {
          const sanitized = {
            id: String(result.id || `unknown-${i}`),
            title: String(result.title || "Untitled API"),
            description: String(result.description || "").substring(0, 500),
            provider: String(result.provider || "unknown"),
            preferred: String(result.preferred || "v1"),
            categories: Array.isArray(result.categories)
              ? result.categories
                  .filter((c: any) => c != null && c !== "")
                  .map((c: any) => String(c))
                  .filter((c: string) => c.length > 0)
              : [],
          };

          // Check for suspicious content
          if (
            this.containsSuspiciousContent(sanitized.id) ||
            this.containsSuspiciousContent(sanitized.title) ||
            this.containsSuspiciousContent(sanitized.description)
          ) {
            warnings.push(
              `Potentially malicious content in search result ${i}`,
            );
          }

          results.push(sanitized);
        } else {
          warnings.push(`Skipped invalid search result at index ${i}`);
        }
      }
    } else {
      warnings.push(
        "Search results.results must be an array, using empty array",
      );
    }

    // Validate pagination
    const paginationPage = this.validateNumber(
      searchResults.pagination?.page,
      "pagination.page",
      warnings,
    );
    const paginationLimit = this.validateNumber(
      searchResults.pagination?.limit,
      "pagination.limit",
      warnings,
    );
    const paginationTotalResults = this.validateNumber(
      searchResults.pagination?.total_results,
      "pagination.total_results",
      warnings,
    );
    const paginationTotalPages = this.validateNumber(
      searchResults.pagination?.total_pages,
      "pagination.total_pages",
      warnings,
    );

    const pagination = {
      page: paginationPage > 0 ? paginationPage : 1,
      limit: paginationLimit > 0 ? paginationLimit : 20,
      total_results:
        paginationTotalResults >= 0 ? paginationTotalResults : results.length,
      total_pages: paginationTotalPages > 0 ? paginationTotalPages : 1,
      has_next: Boolean(searchResults.pagination?.has_next),
      has_previous: Boolean(searchResults.pagination?.has_previous),
    };

    return {
      isValid: true,
      data: { results, pagination },
      errors,
      warnings,
    };
  }

  /**
   * Validate and sanitize metrics data
   */
  static validateMetrics(metrics: any): ValidationResult<{
    numSpecs: number;
    numAPIs: number;
    numEndpoints: number;
    [key: string]: any;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!metrics || typeof metrics !== "object") {
      errors.push("Metrics response must be an object");
      return {
        isValid: false,
        data: { numSpecs: 0, numAPIs: 0, numEndpoints: 0 },
        errors,
        warnings,
      };
    }

    // Validate and sanitize numeric fields
    const numSpecs = this.validateNumber(
      metrics.numSpecs,
      "numSpecs",
      warnings,
    );
    const numAPIs = this.validateNumber(metrics.numAPIs, "numAPIs", warnings);
    const numEndpoints = this.validateNumber(
      metrics.numEndpoints,
      "numEndpoints",
      warnings,
    );

    // Preserve other fields but validate them
    const sanitizedMetrics = {
      numSpecs,
      numAPIs,
      numEndpoints,
      ...this.sanitizeObject(
        metrics,
        ["numSpecs", "numAPIs", "numEndpoints"],
        warnings,
      ),
    };

    return {
      isValid: true,
      data: sanitizedMetrics,
      errors,
      warnings,
    };
  }

  /**
   * Check for potentially suspicious content (XSS, injection attempts)
   * Uses DOMPurify for robust HTML sanitization instead of regex patterns
   */
  private static containsSuspiciousContent(str: string): boolean {
    try {
      // First check for non-HTML threats (URLs, standalone event handlers)
      const nonHtmlPatterns = [
        /javascript:/gi,
        /vbscript:/gi,
        /data:.*base64/gi,
        /on\w+\s*=/gi, // Event handlers like onclick=
      ];

      const hasNonHtmlThreats = nonHtmlPatterns.some((pattern) =>
        pattern.test(str),
      );

      // Check for SQL injection patterns
      const sqlPatterns = [
        /\bDROP\s+TABLE\b/gi,
        /\bSELECT\s+\*\s+FROM\b/gi,
        /['";].*--/gi,
      ];

      const hasSqlInjection = sqlPatterns.some((pattern) => pattern.test(str));

      // Use DOMPurify for HTML/XSS detection
      const window = new JSDOM("").window;
      const purify = DOMPurify(window as any);

      // Sanitize the string with very strict settings
      const sanitized = purify.sanitize(str, {
        ALLOWED_TAGS: [], // No HTML tags allowed
        ALLOWED_ATTR: [], // No attributes allowed
        KEEP_CONTENT: true, // Keep text content
        FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
        FORBID_ATTR: ["onclick", "onload", "onerror", "javascript", "vbscript"],
      });

      const hasHtmlThreats = sanitized !== str;

      // Return true if any threats are detected
      return hasNonHtmlThreats || hasSqlInjection || hasHtmlThreats;
    } catch (error) {
      // If DOMPurify fails, fall back to basic checks
      const basicPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /\bDROP\s+TABLE\b/gi,
        /\bSELECT\s+\*\s+FROM\b/gi,
      ];

      return basicPatterns.some((pattern) => pattern.test(str));
    }
  }

  /**
   * Validate a number field and provide fallback
   */
  private static validateNumber(
    value: any,
    fieldName: string,
    warnings: string[],
  ): number {
    if (typeof value === "number" && !isNaN(value) && value >= 0) {
      return Math.floor(value); // Ensure integer
    }

    if (typeof value === "string") {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        warnings.push(
          `Converted string to number for ${fieldName}: "${value}" -> ${parsed}`,
        );
        return parsed;
      }
    }

    warnings.push(`Invalid ${fieldName} value: ${value}, using 0`);
    return 0;
  }

  /**
   * Sanitize an object by excluding specified keys and validating remaining ones
   */
  private static sanitizeObject(
    obj: any,
    excludeKeys: string[],
    warnings: string[],
  ): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (excludeKeys.includes(key)) {
        continue;
      }

      // Skip functions and symbols
      if (typeof value === "function" || typeof value === "symbol") {
        warnings.push(`Skipped ${typeof value} property: ${key}`);
        continue;
      }

      // Handle potential XSS in string values
      if (typeof value === "string" && this.containsSuspiciousContent(value)) {
        warnings.push(`Potentially suspicious content in ${key}: "${value}"`);
      }

      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * Log validation results appropriately
   */
  static logValidationResults<T>(
    result: ValidationResult<T>,
    source: string,
  ): void {
    if (result.errors.length > 0) {
      ErrorHandler.logError({
        code: "VALIDATION_ERROR",
        message: `Validation errors in ${source}`,
        context: { errors: result.errors },
        timestamp: new Date(),
      } as any);
    }

    if (result.warnings.length > 0) {
      ErrorHandler.logError({
        code: "VALIDATION_WARNING",
        message: `Validation warnings in ${source}`,
        context: { warnings: result.warnings },
        timestamp: new Date(),
      } as any);
    }
  }
}

/**
 * Convenience function to validate and sanitize data with automatic logging
 */
export function validateAndSanitize<T>(
  data: any,
  validator: (data: any) => ValidationResult<T>,
  source: string,
): T {
  const result = validator(data);
  DataValidator.logValidationResults(result, source);
  return result.data;
}
