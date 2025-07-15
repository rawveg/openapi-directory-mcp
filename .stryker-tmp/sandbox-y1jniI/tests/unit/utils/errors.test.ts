// @ts-nocheck
import { describe, test, expect } from '@jest/globals';
import {
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

describe('Error Classes', () => {
  describe('OpenAPIDirectoryError', () => {
    test('should create error with all properties', () => {
      const error = new OpenAPIDirectoryError(
        'Test error message',
        ERROR_CODES.UNKNOWN_ERROR,
        { operation: 'test', source: 'primary' },
        'User-friendly message'
      );

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
      expect(error.userMessage).toBe('User-friendly message');
      expect(error.context).toEqual({ operation: 'test', source: 'primary' });
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('OpenAPIDirectoryError');
    });

    test('should have correct stack trace', () => {
      const error = new OpenAPIDirectoryError('Test', ERROR_CODES.UNKNOWN_ERROR);
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('OpenAPIDirectoryError');
    });

    test('should generate default user message', () => {
      const error = new OpenAPIDirectoryError(
        'Technical error',
        ERROR_CODES.NETWORK_ERROR,
        { source: 'primary' }
      );
      expect(error.userMessage).toContain('Unable to connect to primary service');
    });
  });

  describe('NetworkError', () => {
    test('should create network error with correct properties', () => {
      const context = { source: 'primary', url: 'https://api.example.com' };
      const error = new NetworkError('Connection failed', context);

      expect(error.code).toBe(ERROR_CODES.NETWORK_ERROR);
      expect(error.message).toBe('Connection failed');
      expect(error.context).toEqual(context);
      expect(error.userMessage).toContain('Unable to connect to primary service');
    });
  });

  describe('TimeoutError', () => {
    test('should create timeout error with correct properties', () => {
      const context = { source: 'secondary', timeout: 5000 };
      const error = new TimeoutError('Request timed out', context);

      expect(error.code).toBe(ERROR_CODES.TIMEOUT_ERROR);
      expect(error.message).toBe('Request timed out');
      expect(error.context).toEqual(context);
      expect(error.userMessage).toContain('took too long to complete');
    });
  });

  describe('ValidationError', () => {
    test('should create validation error with correct properties', () => {
      const context = { field: 'email', value: 'invalid-email' };
      const error = new ValidationError('Invalid email format', context);

      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(error.message).toBe('Invalid email format');
      expect(error.context).toEqual(context);
      expect(error.userMessage).toContain('provided data is invalid');
    });
  });

  describe('NotFoundError', () => {
    test('should create not found error with correct properties', () => {
      const context = { resource: 'api', id: 'nonexistent' };
      const error = new NotFoundError('API not found', context);

      expect(error.code).toBe(ERROR_CODES.NOT_FOUND_ERROR);
      expect(error.message).toBe('API not found');
      expect(error.context).toEqual(context);
      expect(error.userMessage).toContain('requested resource was not found');
    });
  });

  describe('RateLimitError', () => {
    test('should create rate limit error with correct properties', () => {
      const context = { limit: 100, window: '1h' };
      const error = new RateLimitError('Rate limit exceeded', context);

      expect(error.code).toBe(ERROR_CODES.RATE_LIMIT_ERROR);
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.context).toEqual(context);
      expect(error.userMessage).toContain('Too many requests');
    });
  });

  describe('CacheError', () => {
    test('should create cache error with correct properties', () => {
      const context = { operation: 'get', key: 'test-key' };
      const error = new CacheError('Cache miss', context);

      expect(error.code).toBe(ERROR_CODES.CACHE_ERROR);
      expect(error.message).toBe('Cache miss');
      expect(error.context).toEqual(context);
      expect(error.userMessage).toContain('unexpected error occurred during get');
    });
  });

  describe('SpecParseError', () => {
    test('should create spec parse error with correct properties', () => {
      const context = { line: 42, column: 10 };
      const error = new SpecParseError('Invalid JSON', context);

      expect(error.code).toBe(ERROR_CODES.SPEC_PARSE_ERROR);
      expect(error.message).toBe('Invalid JSON');
      expect(error.context).toEqual(context);
      expect(error.userMessage).toContain('Unable to parse the OpenAPI specification');
    });
  });

  describe('AuthError', () => {
    test('should create auth error with correct properties', () => {
      const context = { action: 'authenticate' };
      const error = new AuthError('Invalid credentials', context);

      expect(error.code).toBe(ERROR_CODES.AUTH_ERROR);
      expect(error.message).toBe('Invalid credentials');
      expect(error.context).toEqual(context);
      expect(error.userMessage).toContain('Authentication failed');
    });
  });

  describe('ServerError', () => {
    test('should create server error with correct properties', () => {
      const context = { statusCode: 500 };
      const error = new ServerError('Internal server error', context);

      expect(error.code).toBe(ERROR_CODES.SERVER_ERROR);
      expect(error.message).toBe('Internal server error');
      expect(error.context).toEqual(context);
      expect(error.userMessage).toContain('server encountered an error');
    });
  });
});

describe('ErrorFactory', () => {
  describe('fromHttpError', () => {
    test('should create NotFoundError for 404', () => {
      const httpError = {
        response: { status: 404 },
        message: 'Resource not found'
      };
      const error = ErrorFactory.fromHttpError(httpError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('Resource not found');
    });

    test('should create ServerError for 500', () => {
      const httpError = {
        response: { status: 500 },
        message: 'Internal error'
      };
      const error = ErrorFactory.fromHttpError(httpError);
      expect(error).toBeInstanceOf(ServerError);
      expect(error.message).toBe('Internal error');
    });

    test('should create NetworkError for connection errors', () => {
      const httpError = {
        code: 'ECONNREFUSED',
        message: 'Connection refused'
      };
      const error = ErrorFactory.fromHttpError(httpError);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toBe('Connection refused');
    });

    test('should create TimeoutError for timeout', () => {
      const httpError = {
        code: 'ETIMEDOUT',
        message: 'timeout of 5000ms exceeded'
      };
      const error = ErrorFactory.fromHttpError(httpError);
      expect(error).toBeInstanceOf(TimeoutError);
    });

    test('should create AuthError for 401', () => {
      const httpError = {
        response: { status: 401 },
        message: 'Unauthorized'
      };
      const error = ErrorFactory.fromHttpError(httpError);
      expect(error).toBeInstanceOf(AuthError);
    });

    test('should create RateLimitError for 429', () => {
      const httpError = {
        response: { status: 429 },
        message: 'Too many requests'
      };
      const error = ErrorFactory.fromHttpError(httpError);
      expect(error).toBeInstanceOf(RateLimitError);
    });
  });

  describe('fromCacheError', () => {
    test('should create CacheError', () => {
      const cacheError = new Error('Cache operation failed');
      const error = ErrorFactory.fromCacheError(cacheError);
      expect(error).toBeInstanceOf(CacheError);
      expect(error.message).toBe('Cache operation failed');
    });
  });

  describe('fromValidationError', () => {
    test('should create ValidationError', () => {
      const error = ErrorFactory.fromValidationError('Invalid input');
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid input');
    });
  });

  describe('fromSpecParseError', () => {
    test('should create SpecParseError', () => {
      const parseError = new Error('Invalid JSON');
      const error = ErrorFactory.fromSpecParseError(parseError);
      expect(error).toBeInstanceOf(SpecParseError);
      expect(error.message).toBe('Invalid JSON');
    });
  });
});

describe('Error Integration', () => {
  test('should maintain error context through transformations', () => {
    const originalContext = {
      operation: 'fetchAPI',
      source: 'primary' as const,
      provider: 'example.com',
      apiId: 'test:v1'
    };

    const networkError = new NetworkError('Connection failed', originalContext);
    
    // Transform to user-facing error
    const userError = new OpenAPIDirectoryError(
      'Service unavailable',
      ERROR_CODES.NETWORK_ERROR,
      originalContext,
      'The API service is temporarily unavailable'
    );

    expect(userError.context).toEqual(originalContext);
    expect(userError.userMessage).toBe('The API service is temporarily unavailable');
    expect(userError.code).toBe(ERROR_CODES.NETWORK_ERROR);
  });
});