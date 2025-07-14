"use strict";
/**
 * Custom error types for better error categorization and user-friendly messages
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = exports.ErrorFactory = exports.ServerError = exports.AuthError = exports.SpecParseError = exports.CacheError = exports.RateLimitError = exports.NotFoundError = exports.ValidationError = exports.TimeoutError = exports.NetworkError = exports.OpenAPIDirectoryError = void 0;
const constants_js_1 = require("./constants.js");
/**
 * Base error class with enhanced context and user-friendly messages
 */
class OpenAPIDirectoryError extends Error {
    constructor(message, code = constants_js_1.ERROR_CODES.UNKNOWN_ERROR, context = {}, userMessage) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.context = context;
        this.timestamp = new Date();
        this.userMessage = userMessage || this.generateUserMessage();
        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
    generateUserMessage() {
        const { operation, source, provider, apiId } = this.context;
        switch (this.code) {
            case constants_js_1.ERROR_CODES.NETWORK_ERROR:
                return `Unable to connect to ${source || "API"} service. Please check your internet connection and try again.`;
            case constants_js_1.ERROR_CODES.TIMEOUT_ERROR:
                return `The ${operation || "operation"} took too long to complete. Please try again or contact support if the problem persists.`;
            case constants_js_1.ERROR_CODES.NOT_FOUND_ERROR:
                if (apiId) {
                    return `The API "${apiId}" was not found in the ${source || ""} source. Please verify the API identifier.`;
                }
                if (provider) {
                    return `The provider "${provider}" was not found. Please check the provider name.`;
                }
                return `The requested resource was not found. Please verify your request and try again.`;
            case constants_js_1.ERROR_CODES.VALIDATION_ERROR:
                return `The provided data is invalid. Please check your input and try again.`;
            case constants_js_1.ERROR_CODES.RATE_LIMIT_ERROR:
                return `Too many requests. Please wait a moment before trying again.`;
            case constants_js_1.ERROR_CODES.SPEC_PARSE_ERROR:
                return `Unable to parse the OpenAPI specification. The file may be corrupted or in an unsupported format.`;
            case constants_js_1.ERROR_CODES.AUTH_ERROR:
                return `Authentication failed. Please check your credentials and try again.`;
            case constants_js_1.ERROR_CODES.SERVER_ERROR:
                return `The server encountered an error. Please try again later or contact support.`;
            default:
                return `An unexpected error occurred${operation ? ` during ${operation}` : ""}. Please try again or contact support.`;
        }
    }
    /**
     * Get a JSON representation of the error
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            userMessage: this.userMessage,
            code: this.code,
            context: this.context,
            timestamp: this.timestamp.toISOString(),
            stack: this.stack,
        };
    }
}
exports.OpenAPIDirectoryError = OpenAPIDirectoryError;
/**
 * Network-related errors
 */
class NetworkError extends OpenAPIDirectoryError {
    constructor(message, context = {}) {
        super(message, constants_js_1.ERROR_CODES.NETWORK_ERROR, context);
    }
}
exports.NetworkError = NetworkError;
/**
 * Timeout-related errors
 */
class TimeoutError extends OpenAPIDirectoryError {
    constructor(message, context = {}) {
        super(message, constants_js_1.ERROR_CODES.TIMEOUT_ERROR, context);
    }
}
exports.TimeoutError = TimeoutError;
/**
 * Validation-related errors
 */
class ValidationError extends OpenAPIDirectoryError {
    constructor(message, context = {}) {
        super(message, constants_js_1.ERROR_CODES.VALIDATION_ERROR, context);
    }
}
exports.ValidationError = ValidationError;
/**
 * Resource not found errors
 */
class NotFoundError extends OpenAPIDirectoryError {
    constructor(message, context = {}) {
        super(message, constants_js_1.ERROR_CODES.NOT_FOUND_ERROR, context);
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Rate limiting errors
 */
class RateLimitError extends OpenAPIDirectoryError {
    constructor(message, context = {}) {
        super(message, constants_js_1.ERROR_CODES.RATE_LIMIT_ERROR, context);
    }
}
exports.RateLimitError = RateLimitError;
/**
 * Cache-related errors
 */
class CacheError extends OpenAPIDirectoryError {
    constructor(message, context = {}) {
        super(message, constants_js_1.ERROR_CODES.CACHE_ERROR, context);
    }
}
exports.CacheError = CacheError;
/**
 * OpenAPI specification parsing errors
 */
class SpecParseError extends OpenAPIDirectoryError {
    constructor(message, context = {}) {
        super(message, constants_js_1.ERROR_CODES.SPEC_PARSE_ERROR, context);
    }
}
exports.SpecParseError = SpecParseError;
/**
 * Authentication errors
 */
class AuthError extends OpenAPIDirectoryError {
    constructor(message, context = {}) {
        super(message, constants_js_1.ERROR_CODES.AUTH_ERROR, context);
    }
}
exports.AuthError = AuthError;
/**
 * Server errors (5xx responses)
 */
class ServerError extends OpenAPIDirectoryError {
    constructor(message, context = {}) {
        super(message, constants_js_1.ERROR_CODES.SERVER_ERROR, context);
    }
}
exports.ServerError = ServerError;
/**
 * Error factory for creating appropriate error types from HTTP responses
 */
class ErrorFactory {
    static fromHttpError(error, context = {}) {
        const status = error.response?.status || error.status;
        const message = error.message || "Unknown error";
        if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
            return new NetworkError(message, context);
        }
        if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
            return new TimeoutError(message, context);
        }
        if (status) {
            if (status === 404) {
                return new NotFoundError(message, context);
            }
            if (status === 401 || status === 403) {
                return new AuthError(message, context);
            }
            if (status === 429) {
                return new RateLimitError(message, context);
            }
            if (status >= 400 && status < 500) {
                return new ValidationError(message, context);
            }
            if (status >= 500) {
                return new ServerError(message, context);
            }
        }
        return new OpenAPIDirectoryError(message, constants_js_1.ERROR_CODES.UNKNOWN_ERROR, context);
    }
    static fromCacheError(error, context = {}) {
        return new CacheError(error.message || "Cache operation failed", context);
    }
    static fromValidationError(message, context = {}) {
        return new ValidationError(message, context);
    }
    static fromSpecParseError(error, context = {}) {
        return new SpecParseError(error.message || "Failed to parse OpenAPI specification", context);
    }
}
exports.ErrorFactory = ErrorFactory;
/**
 * Error handler utility for consistent error processing
 */
class ErrorHandler {
    /**
     * Log error with appropriate level based on severity
     */
    static logError(error) {
        if (error instanceof OpenAPIDirectoryError) {
            const level = ErrorHandler.getLogLevel(error.code);
            // eslint-disable-next-line no-console
            console[level](`[${error.code}] ${error.message}`, {
                userMessage: error.userMessage,
                context: error.context,
                timestamp: error.timestamp,
            });
        }
        else {
            // eslint-disable-next-line no-console
            console.error("Unhandled error:", error);
        }
    }
    /**
     * Get appropriate log level for error code
     */
    static getLogLevel(code) {
        switch (code) {
            case constants_js_1.ERROR_CODES.NETWORK_ERROR:
            case constants_js_1.ERROR_CODES.SERVER_ERROR:
            case constants_js_1.ERROR_CODES.UNKNOWN_ERROR:
                return "error";
            case constants_js_1.ERROR_CODES.TIMEOUT_ERROR:
            case constants_js_1.ERROR_CODES.RATE_LIMIT_ERROR:
            case constants_js_1.ERROR_CODES.CACHE_ERROR:
                return "warn";
            case constants_js_1.ERROR_CODES.NOT_FOUND_ERROR:
            case constants_js_1.ERROR_CODES.VALIDATION_ERROR:
                return "info";
            default:
                return "error";
        }
    }
    /**
     * Check if error is retryable
     */
    static isRetryable(error) {
        if (!(error instanceof OpenAPIDirectoryError)) {
            return false;
        }
        const retryableCodes = [
            constants_js_1.ERROR_CODES.NETWORK_ERROR,
            constants_js_1.ERROR_CODES.TIMEOUT_ERROR,
            constants_js_1.ERROR_CODES.RATE_LIMIT_ERROR,
            constants_js_1.ERROR_CODES.SERVER_ERROR,
        ];
        return retryableCodes.includes(error.code);
    }
    /**
     * Handle error with proper logging and conversion
     */
    static handleError(error, message, code, context) {
        let processedError;
        if (error instanceof OpenAPIDirectoryError) {
            processedError = error;
        }
        else if (error instanceof Error) {
            processedError = new OpenAPIDirectoryError(message, code, context || {}, message);
            if (error.stack) {
                processedError.stack = error.stack;
            }
        }
        else {
            processedError = new OpenAPIDirectoryError(message, code, context || {}, message);
        }
        // Log the error
        ErrorHandler.logError(processedError);
        // Re-throw the processed error
        throw processedError;
    }
}
exports.ErrorHandler = ErrorHandler;
