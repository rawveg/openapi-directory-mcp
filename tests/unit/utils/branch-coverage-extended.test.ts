import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { RateLimiter, rateLimiters, cleanupRateLimiters } from '../../../src/utils/rate-limiter.js';
import { MCPLogger } from '../../../src/utils/mcp-logger.js';
import { 
  ErrorHandler, 
  OpenAPIDirectoryError, 
  NetworkError,
  TimeoutError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  CacheError,
  SpecParseError,
  AuthError,
  ServerError,
  ErrorFactory
} from '../../../src/utils/errors.js';
import { ERROR_CODES } from '../../../src/utils/constants.js';
import { calculateProviderStats } from '../../../src/utils/version-data.js';

describe('Branch Coverage Improvements', () => {
  describe('RateLimiter - Additional Branch Coverage', () => {
    afterEach(() => {
      cleanupRateLimiters();
    });

    test('should handle cleanupRateLimiters when _rateLimiters is already null', () => {
      // First cleanup to set _rateLimiters to null
      cleanupRateLimiters();
      
      // Second cleanup should handle null case
      expect(() => cleanupRateLimiters()).not.toThrow();
    });

    test('should handle cleanupRateLimiters with limiter that has no clear method', () => {
      // Create a mock rate limiter without clear method
      const mockLimiter = { someOtherMethod: jest.fn() };
      (rateLimiters as any).testLimiter = mockLimiter;
      
      expect(() => cleanupRateLimiters()).not.toThrow();
    });

    test('should handle cleanupRateLimiters with null limiter in collection', () => {
      // Create a rate limiter then set it to null
      const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });
      (rateLimiters as any).testLimiter = null;
      
      expect(() => cleanupRateLimiters()).not.toThrow();
    });

    test('should handle status calculation when window has expired', () => {
      const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
      
      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      Date.now = jest.fn().mockReturnValue(originalNow() + 2000); // 2 seconds later
      
      const status = limiter.getStatus();
      expect(status.requestsInWindow).toBe(0);
      expect(status.canMakeRequest).toBe(true);
      
      Date.now = originalNow;
    });

    test('should handle execute with synchronous function that throws', async () => {
      const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
      
      const syncError = new Error('Sync error');
      const fn = jest.fn().mockImplementation(() => {
        throw syncError;
      });
      
      await expect(limiter.execute(fn)).rejects.toThrow('Sync error');
      expect(fn).toHaveBeenCalled();
    });

    test('should handle proxy get trap for non-existent property', () => {
      const result = (rateLimiters as any).nonExistentProperty;
      expect(result).toBeUndefined();
    });

    test('should handle proxy get trap when _rateLimiters is null', () => {
      cleanupRateLimiters();
      const result = (rateLimiters as any).someProperty;
      expect(result).toBeUndefined();
    });
  });

  describe('MCPLogger - Additional Branch Coverage', () => {
    let originalArgv: string[];
    let originalEnv: NodeJS.ProcessEnv;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    let consoleInfoSpy: jest.SpyInstance;
    let consoleDebugSpy: jest.SpyInstance;

    beforeEach(() => {
      originalArgv = process.argv;
      originalEnv = process.env;
      process.env = { ...originalEnv };
      
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
      consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    });

    afterEach(() => {
      process.argv = originalArgv;
      process.env = originalEnv;
      
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleInfoSpy.mockRestore();
      consoleDebugSpy.mockRestore();
    });

    test('should detect MCP mode when process.argv has only 2 elements', () => {
      process.argv = ['node', 'script.js'];
      delete process.env.MCP_DISABLE_LOGGING;
      
      MCPLogger.log('test');
      expect(consoleLogSpy).not.toHaveBeenCalled();
      
      MCPLogger.error('test');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      
      MCPLogger.warn('test');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      
      MCPLogger.info('test');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      
      MCPLogger.debug('test');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    test('should not detect MCP mode when MCP_DISABLE_LOGGING is set', () => {
      process.argv = ['node', 'script.js'];
      process.env.MCP_DISABLE_LOGGING = 'true';
      
      MCPLogger.log('test');
      expect(consoleLogSpy).toHaveBeenCalledWith('test');
      
      MCPLogger.error('test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('test error');
      
      MCPLogger.warn('test warn');
      expect(consoleWarnSpy).toHaveBeenCalledWith('test warn');
      
      MCPLogger.info('test info');
      expect(consoleInfoSpy).toHaveBeenCalledWith('test info');
      
      MCPLogger.debug('test debug');
      expect(consoleDebugSpy).toHaveBeenCalledWith('test debug');
    });

    test('should initialize MCP compliance and override console methods', () => {
      process.argv = ['node', 'script.js'];
      delete process.env.MCP_DISABLE_LOGGING;
      
      MCPLogger.initializeMCPCompliance();
      
      // Test that console methods are overridden
      console.log('test');
      console.error('test');
      console.warn('test');
      console.info('test');
      console.debug('test');
      
      // Since they're overridden to no-op, the spies shouldn't be called
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    test('should not override console methods when not in MCP mode', () => {
      process.argv = ['node', 'script.js', 'arg1'];
      
      MCPLogger.initializeMCPCompliance();
      
      // Console methods should still work normally
      console.log('test');
      expect(consoleLogSpy).toHaveBeenCalledWith('test');
    });
  });

  describe('ErrorHandler - Additional Branch Coverage', () => {
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    let consoleInfoSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleInfoSpy.mockRestore();
    });

    test('should log with warn level for timeout errors', () => {
      const error = new TimeoutError('Timeout occurred');
      ErrorHandler.logError(error);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TIMEOUT_ERROR]'),
        expect.any(Object)
      );
    });

    test('should log with warn level for rate limit errors', () => {
      const error = new RateLimitError('Rate limit exceeded');
      ErrorHandler.logError(error);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RATE_LIMIT_ERROR]'),
        expect.any(Object)
      );
    });

    test('should log with warn level for cache errors', () => {
      const error = new CacheError('Cache operation failed');
      ErrorHandler.logError(error);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CACHE_ERROR]'),
        expect.any(Object)
      );
    });

    test('should log with info level for not found errors', () => {
      const error = new NotFoundError('Resource not found');
      ErrorHandler.logError(error);
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[NOT_FOUND_ERROR]'),
        expect.any(Object)
      );
    });

    test('should log with info level for validation errors', () => {
      const error = new ValidationError('Validation failed');
      ErrorHandler.logError(error);
      
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[VALIDATION_ERROR]'),
        expect.any(Object)
      );
    });

    test('should log with error level for unknown error codes', () => {
      const error = new OpenAPIDirectoryError('Unknown error', 'CUSTOM_ERROR' as any);
      ErrorHandler.logError(error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CUSTOM_ERROR]'),
        expect.any(Object)
      );
    });

    test('should log non-OpenAPIDirectoryError as unhandled error', () => {
      const error = new Error('Regular error');
      ErrorHandler.logError(error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Unhandled error:', error);
    });

    test('should identify retryable errors', () => {
      expect(ErrorHandler.isRetryable(new NetworkError('Network failed'))).toBe(true);
      expect(ErrorHandler.isRetryable(new TimeoutError('Timeout'))).toBe(true);
      expect(ErrorHandler.isRetryable(new ServerError('Server error'))).toBe(true);
      expect(ErrorHandler.isRetryable(new RateLimitError('Rate limited'))).toBe(true);
    });

    test('should identify non-retryable errors', () => {
      expect(ErrorHandler.isRetryable(new ValidationError('Invalid data'))).toBe(false);
      expect(ErrorHandler.isRetryable(new NotFoundError('Not found'))).toBe(false);
      expect(ErrorHandler.isRetryable(new AuthError('Unauthorized'))).toBe(false);
      expect(ErrorHandler.isRetryable(new SpecParseError('Parse error'))).toBe(false);
      expect(ErrorHandler.isRetryable(new CacheError('Cache error'))).toBe(false);
    });

    test('should handle non-OpenAPIDirectoryError in isRetryable', () => {
      const regularError = new Error('Regular error');
      expect(ErrorHandler.isRetryable(regularError)).toBe(false);
    });

    test('should handle error with proper logging and conversion', () => {
      // Test handleError method which exists in the actual code
      expect(() => {
        ErrorHandler.handleError(
          new Error('Test error'),
          'Custom message',
          ERROR_CODES.NETWORK_ERROR,
          { url: '/test' }
        );
      }).toThrow(OpenAPIDirectoryError);

      try {
        ErrorHandler.handleError(
          new Error('Test error'),
          'Custom message',
          ERROR_CODES.NETWORK_ERROR,
          { url: '/test' }
        );
      } catch (error) {
        expect((error as OpenAPIDirectoryError).message).toBe('Custom message');
        expect((error as OpenAPIDirectoryError).code).toBe(ERROR_CODES.NETWORK_ERROR);
      }
    });

    test('should handle non-Error objects in handleError', () => {
      expect(() => {
        ErrorHandler.handleError(
          'String error',
          'Custom message',
          ERROR_CODES.UNKNOWN_ERROR
        );
      }).toThrow(OpenAPIDirectoryError);

      try {
        ErrorHandler.handleError(
          'String error',
          'Custom message',
          ERROR_CODES.UNKNOWN_ERROR
        );
      } catch (error) {
        expect((error as OpenAPIDirectoryError).message).toBe('Custom message');
      }
    });
  });

  describe('ErrorFactory - Additional Branch Coverage', () => {

    test('should create cache error from any error', () => {
      const originalError = new Error('Cache failed');
      const error = ErrorFactory.fromCacheError(originalError, { key: 'test-key' });
      
      expect(error).toBeInstanceOf(CacheError);
      expect(error.message).toBe('Cache failed');
      expect(error.context).toEqual({ key: 'test-key' });
    });

    test('should create spec parse error from any error', () => {
      const originalError = new Error('Parse failed');
      const error = ErrorFactory.fromSpecParseError(originalError, { spec: 'test.yaml' });
      
      expect(error).toBeInstanceOf(SpecParseError);
      expect(error.message).toBe('Parse failed');
      expect(error.context).toEqual({ spec: 'test.yaml' });
    });

    test('should handle error without message in factory methods', () => {
      const errorWithoutMessage = {};
      
      const cacheError = ErrorFactory.fromCacheError(errorWithoutMessage);
      expect(cacheError.message).toBe('Cache operation failed');
      
      const specError = ErrorFactory.fromSpecParseError(errorWithoutMessage);
      expect(specError.message).toBe('Failed to parse OpenAPI specification');
    });

    test('should handle toJSON method', () => {
      const error = new OpenAPIDirectoryError('Test error', ERROR_CODES.NETWORK_ERROR, { key: 'value' });
      const json = error.toJSON();
      
      expect(json).toHaveProperty('name');
      expect(json).toHaveProperty('message');
      expect(json).toHaveProperty('code');
      expect(json).toHaveProperty('context');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe(ERROR_CODES.NETWORK_ERROR);
    });

    test('should test OpenAPIDirectoryError constructor branches', () => {
      // Test different combinations to hit uncovered branches
      const error1 = new OpenAPIDirectoryError('Test message', ERROR_CODES.VALIDATION_ERROR);
      expect(error1.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      
      const error2 = new OpenAPIDirectoryError('Test', ERROR_CODES.NOT_FOUND_ERROR, { source: 'test' });
      expect(error2.context).toEqual({ source: 'test' });
    });

    test('should generate user message with apiId', () => {
      const error = new NotFoundError('API not found', { apiId: 'test-api' });
      expect(error.userMessage).toContain('test-api');
    });

    test('should generate user message with provider', () => {
      const error = new NotFoundError('Provider not found', { provider: 'test-provider' });
      expect(error.userMessage).toContain('test-provider');
    });
  });

  describe('calculateProviderStats - Additional Branch Coverage', () => {
    test('should handle empty provider APIs', () => {
      const stats = calculateProviderStats({});
      
      expect(stats.totalAPIs).toBe(0);
      expect(stats.totalVersions).toBe(0);
      expect(stats.latestUpdate).toBe(new Date(0).toISOString());
      expect(stats.oldestAPI).toBe('');
      expect(stats.newestAPI).toBe('');
    });

    test('should handle null provider APIs', () => {
      const stats = calculateProviderStats(null as any);
      
      expect(stats.totalAPIs).toBe(0);
      expect(stats.totalVersions).toBe(0);
    });

    test('should handle provider APIs with primary format (direct version data)', () => {
      const providerAPIs = {
        'api1': {
          updated: '2023-01-02T10:00:00Z',
          added: '2023-01-01T10:00:00Z',
          swaggerUrl: 'test.json'
        },
        'api2': {
          updated: '2023-01-03T10:00:00Z',
          added: '2023-01-01T12:00:00Z',
          swaggerUrl: 'test2.json'
        }
      };
      
      const stats = calculateProviderStats(providerAPIs);
      
      expect(stats.totalAPIs).toBe(2);
      expect(stats.totalVersions).toBe(2);
      expect(stats.latestUpdate).toBe('2023-01-03T10:00:00.000Z');
      expect(stats.oldestAPI).toBe('api1');
      expect(stats.newestAPI).toBe('api2');
    });

    test('should handle provider APIs with secondary format (versions object)', () => {
      const providerAPIs = {
        'api1': {
          versions: {
            'v1': {
              updated: '2023-01-02T10:00:00Z',
              added: '2023-01-01T10:00:00Z'
            },
            'v2': {
              updated: '2023-01-04T10:00:00Z',
              added: '2023-01-03T10:00:00Z'
            }
          }
        }
      };
      
      const stats = calculateProviderStats(providerAPIs);
      
      expect(stats.totalAPIs).toBe(1);
      expect(stats.totalVersions).toBe(2);
      expect(stats.latestUpdate).toBe('2023-01-04T10:00:00.000Z');
      expect(stats.oldestAPI).toBe('api1');
      expect(stats.newestAPI).toBe('api1');
    });

    test('should handle mixed format APIs', () => {
      const providerAPIs = {
        'api1': {
          updated: '2023-01-02T10:00:00Z',
          added: '2023-01-01T10:00:00Z'
        },
        'api2': {
          versions: {
            'v1': {
              updated: '2023-01-05T10:00:00Z',
              added: '2023-01-04T10:00:00Z'
            }
          }
        },
        'api3': {
          someOtherProperty: 'value'
        }
      };
      
      const stats = calculateProviderStats(providerAPIs);
      
      expect(stats.totalAPIs).toBe(3);
      expect(stats.totalVersions).toBe(2); // api1 + api2.v1
      expect(stats.latestUpdate).toBe('2023-01-05T10:00:00.000Z');
      expect(stats.oldestAPI).toBe('api1');
      expect(stats.newestAPI).toBe('api2');
    });

    test('should handle invalid date strings', () => {
      const providerAPIs = {
        'api1': {
          updated: 'invalid-date',
          added: 'also-invalid'
        },
        'api2': {
          updated: '2023-01-02T10:00:00Z',
          added: '2023-01-01T10:00:00Z'
        }
      };
      
      const stats = calculateProviderStats(providerAPIs);
      
      expect(stats.totalAPIs).toBe(2);
      expect(stats.latestUpdate).toBe('2023-01-02T10:00:00.000Z');
      // When api1 has invalid dates, it gets DEFAULT_DATE (epoch), making it oldest
      expect(stats.oldestAPI).toBe('api1');
      expect(stats.newestAPI).toBe('api2');
    });

    test('should handle versions object with non-version data properties', () => {
      const providerAPIs = {
        'api1': {
          versions: {
            'v1': {
              updated: '2023-01-02T10:00:00Z',
              added: '2023-01-01T10:00:00Z'
            },
            'metadata': 'not-a-version'
          }
        }
      };
      
      const stats = calculateProviderStats(providerAPIs);
      
      expect(stats.totalAPIs).toBe(1);
      expect(stats.totalVersions).toBe(2); // Both v1 and metadata are counted as Object.values
    });

    test('should handle APIs where versions is not an object', () => {
      const providerAPIs = {
        'api1': {
          versions: 'not-an-object'
        },
        'api2': {
          versions: null
        },
        'api3': {
          versions: []
        }
      };
      
      const stats = calculateProviderStats(providerAPIs);
      
      expect(stats.totalAPIs).toBe(3);
      expect(stats.totalVersions).toBe(0);
    });

    test('should handle version data with missing properties', () => {
      const providerAPIs = {
        'api1': {
          versions: {
            'v1': {
              // Missing updated and added fields
            }
          },
          preferred: 'v1'
        }
      };
      
      const stats = calculateProviderStats(providerAPIs);
      
      expect(stats.totalAPIs).toBe(1);
      expect(stats.totalVersions).toBe(1);
      // When no valid dates are found, oldestAPI should be empty
      expect(stats.oldestAPI).toBe('');
    });
  });
});