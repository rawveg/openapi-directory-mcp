/**
 * Simple logger utility for consistent logging across the application
 * Uses debug levels to control output in different environments
 */
// @ts-nocheck


export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  private static logLevel: LogLevel = this.getLogLevelFromEnv();

  private static getLogLevelFromEnv(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase();
    switch (level) {
      case "ERROR":
        return LogLevel.ERROR;
      case "WARN":
        return LogLevel.WARN;
      case "INFO":
        return LogLevel.INFO;
      case "DEBUG":
        return LogLevel.DEBUG;
      default:
        // Default to WARN in production, DEBUG in development/test
        return process.env.NODE_ENV === "production"
          ? LogLevel.WARN
          : LogLevel.DEBUG;
    }
  }

  static error(message: string, ...args: any[]): void {
    if (this.logLevel >= LogLevel.ERROR) {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  static warn(message: string, ...args: any[]): void {
    if (this.logLevel >= LogLevel.WARN) {
      // eslint-disable-next-line no-console
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  static info(message: string, ...args: any[]): void {
    if (this.logLevel >= LogLevel.INFO) {
      // eslint-disable-next-line no-console
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  static debug(message: string, ...args: any[]): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      // eslint-disable-next-line no-console
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Special method for cache operations - uses debug level
   * to avoid cluttering production logs
   */
  static cache(operation: string, key?: string, details?: any): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      const sanitizedKey = key ? this.sanitizeKey(key) : "";
      const message = details
        ? `[CACHE] ${operation}: ${sanitizedKey} - ${JSON.stringify(details)}`
        : `[CACHE] ${operation}: ${sanitizedKey}`;
      // eslint-disable-next-line no-console
      console.log(message);
    }
  }

  /**
   * Sanitize cache keys to avoid exposing sensitive information
   */
  private static sanitizeKey(key: string): string {
    // Truncate long keys and mask potentially sensitive parts
    if (key.length > 50) {
      return `${key.substring(0, 20)}...${key.substring(key.length - 20)}`;
    }
    return key;
  }

  /**
   * Set log level dynamically
   */
  static setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}
