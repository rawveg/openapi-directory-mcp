/**
 * Custom error types for better error categorization and user-friendly messages
 */
// @ts-nocheck


import { ERROR_CODES } from "./constants.js";

export interface ErrorContext {
  operation?: string;
  source?: "primary" | "secondary" | "custom" | "triple";
  provider?: string;
  apiId?: string;
  details?: Record<string, any>;
}

/**
 * Base error class with enhanced context and user-friendly messages
 */
export class OpenAPIDirectoryError extends Error {
  public readonly code: string;
  public readonly context: ErrorContext;
  public readonly timestamp: Date;
  public readonly userMessage: string;

  constructor(
    message: string,
    code: string = ERROR_CODES.UNKNOWN_ERROR,
    context: ErrorContext = {},
    userMessage?: string,
  ) {
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

  private generateUserMessage(): string {
    const { operation, source, provider, apiId } = this.context;

    switch (this.code) {
      case ERROR_CODES.NETWORK_ERROR:
        return `Unable to connect to ${source || "API"} service. Please check your internet connection and try again.`;

      case ERROR_CODES.TIMEOUT_ERROR:
        return `The ${operation || "operation"} took too long to complete. Please try again or contact support if the problem persists.`;

      case ERROR_CODES.NOT_FOUND_ERROR:
        if (apiId) {
          return `The API "${apiId}" was not found in the ${source || ""} source. Please verify the API identifier.`;
        }
        if (provider) {
          return `The provider "${provider}" was not found. Please check the provider name.`;
        }
        return `The requested resource was not found. Please verify your request and try again.`;

      case ERROR_CODES.VALIDATION_ERROR:
        return `The provided data is invalid. Please check your input and try again.`;

      case ERROR_CODES.RATE_LIMIT_ERROR:
        return `Too many requests. Please wait a moment before trying again.`;

      case ERROR_CODES.SPEC_PARSE_ERROR:
        return `Unable to parse the OpenAPI specification. The file may be corrupted or in an unsupported format.`;

      case ERROR_CODES.AUTH_ERROR:
        return `Authentication failed. Please check your credentials and try again.`;

      case ERROR_CODES.SERVER_ERROR:
        return `The server encountered an error. Please try again later or contact support.`;

      default:
        return `An unexpected error occurred${operation ? ` during ${operation}` : ""}. Please try again or contact support.`;
    }
  }

  /**
   * Get a JSON representation of the error
   */
  toJSON(): Record<string, any> {
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

/**
 * Network-related errors
 */
export class NetworkError extends OpenAPIDirectoryError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ERROR_CODES.NETWORK_ERROR, context);
  }
}

/**
 * Timeout-related errors
 */
export class TimeoutError extends OpenAPIDirectoryError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ERROR_CODES.TIMEOUT_ERROR, context);
  }
}

/**
 * Validation-related errors
 */
export class ValidationError extends OpenAPIDirectoryError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ERROR_CODES.VALIDATION_ERROR, context);
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends OpenAPIDirectoryError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ERROR_CODES.NOT_FOUND_ERROR, context);
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends OpenAPIDirectoryError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ERROR_CODES.RATE_LIMIT_ERROR, context);
  }
}

/**
 * Cache-related errors
 */
export class CacheError extends OpenAPIDirectoryError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ERROR_CODES.CACHE_ERROR, context);
  }
}

/**
 * OpenAPI specification parsing errors
 */
export class SpecParseError extends OpenAPIDirectoryError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ERROR_CODES.SPEC_PARSE_ERROR, context);
  }
}

/**
 * Authentication errors
 */
export class AuthError extends OpenAPIDirectoryError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ERROR_CODES.AUTH_ERROR, context);
  }
}

/**
 * Server errors (5xx responses)
 */
export class ServerError extends OpenAPIDirectoryError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ERROR_CODES.SERVER_ERROR, context);
  }
}

/**
 * Error factory for creating appropriate error types from HTTP responses
 */
export class ErrorFactory {
  static fromHttpError(
    error: any,
    context: ErrorContext = {},
  ): OpenAPIDirectoryError {
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

    return new OpenAPIDirectoryError(
      message,
      ERROR_CODES.UNKNOWN_ERROR,
      context,
    );
  }

  static fromCacheError(error: any, context: ErrorContext = {}): CacheError {
    return new CacheError(error.message || "Cache operation failed", context);
  }

  static fromValidationError(
    message: string,
    context: ErrorContext = {},
  ): ValidationError {
    return new ValidationError(message, context);
  }

  static fromSpecParseError(
    error: any,
    context: ErrorContext = {},
  ): SpecParseError {
    return new SpecParseError(
      error.message || "Failed to parse OpenAPI specification",
      context,
    );
  }
}

/**
 * Error handler utility for consistent error processing
 */
export class ErrorHandler {
  /**
   * Log error with appropriate level based on severity
   */
  static logError(error: OpenAPIDirectoryError | Error): void {
    if (error instanceof OpenAPIDirectoryError) {
      const level = ErrorHandler.getLogLevel(error.code);
      // eslint-disable-next-line no-console
      console[level](`[${error.code}] ${error.message}`, {
        userMessage: error.userMessage,
        context: error.context,
        timestamp: error.timestamp,
      });
    } else {
      // eslint-disable-next-line no-console
      console.error("Unhandled error:", error);
    }
  }

  /**
   * Get appropriate log level for error code
   */
  private static getLogLevel(code: string): "error" | "warn" | "info" {
    switch (code) {
      case ERROR_CODES.NETWORK_ERROR:
      case ERROR_CODES.SERVER_ERROR:
      case ERROR_CODES.UNKNOWN_ERROR:
        return "error";

      case ERROR_CODES.TIMEOUT_ERROR:
      case ERROR_CODES.RATE_LIMIT_ERROR:
      case ERROR_CODES.CACHE_ERROR:
        return "warn";

      case ERROR_CODES.NOT_FOUND_ERROR:
      case ERROR_CODES.VALIDATION_ERROR:
        return "info";

      default:
        return "error";
    }
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: OpenAPIDirectoryError | Error): boolean {
    if (!(error instanceof OpenAPIDirectoryError)) {
      return false;
    }

    const retryableCodes = [
      ERROR_CODES.NETWORK_ERROR,
      ERROR_CODES.TIMEOUT_ERROR,
      ERROR_CODES.RATE_LIMIT_ERROR,
      ERROR_CODES.SERVER_ERROR,
    ];

    return retryableCodes.includes(error.code as any);
  }

  /**
   * Handle error with proper logging and conversion
   */
  static handleError(
    error: unknown,
    message: string,
    code: string,
    context?: ErrorContext,
  ): never {
    let processedError: OpenAPIDirectoryError;

    if (error instanceof OpenAPIDirectoryError) {
      processedError = error;
    } else if (error instanceof Error) {
      processedError = new OpenAPIDirectoryError(
        message,
        code,
        context || {},
        message,
      );
      if (error.stack) {
        processedError.stack = error.stack;
      }
    } else {
      processedError = new OpenAPIDirectoryError(
        message,
        code,
        context || {},
        message,
      );
    }

    // Log the error
    ErrorHandler.logError(processedError);

    // Re-throw the processed error
    throw processedError;
  }
}
