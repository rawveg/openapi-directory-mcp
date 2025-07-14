import { describe, test, expect } from '@jest/globals';
import { 
  CacheValidator, 
  URLValidator,
  APIDataValidator
} from '../../../src/utils/validation.js';
import { ValidationError } from '../../../src/utils/errors.js';

describe('CacheValidator', () => {
  describe('validateCacheEntry', () => {
    test('should accept valid cache entries', () => {
      const validEntries = [
        {
          timestamp: new Date().toISOString(),
          value: 'test-value',
          integrity: 'hash123'
        },
        {
          timestamp: new Date(Date.now() - 1000).toISOString(),
          value: { data: 'object' }
        }
      ];

      validEntries.forEach(entry => {
        expect(CacheValidator.validateCacheEntry('test-key', entry)).toBe(true);
      });
    });

    test('should reject invalid cache entries', () => {
      const invalidEntries = [
        null,
        undefined,
        {},
        { timestamp: 'invalid-date', value: 'test' },
        { timestamp: new Date().toISOString() }, // Missing value
        { value: 'test' }, // Missing timestamp
        {
          timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // Too old
          value: 'test'
        }
      ];

      invalidEntries.forEach(entry => {
        expect(CacheValidator.validateCacheEntry('test-key', entry)).toBe(false);
      });
    });
  });

  describe('generateIntegrityHash', () => {
    test('should generate consistent hashes', () => {
      const data = { test: 'value', number: 123 };
      const hash1 = CacheValidator.generateIntegrityHash(data);
      const hash2 = CacheValidator.generateIntegrityHash(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex string
    });

    test('should generate different hashes for different data', () => {
      const data1 = { test: 'value1' };
      const data2 = { test: 'value2' };
      
      const hash1 = CacheValidator.generateIntegrityHash(data1);
      const hash2 = CacheValidator.generateIntegrityHash(data2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyCacheIntegrity', () => {
    test('should verify matching hashes', () => {
      const data = { test: 'value', number: 123 };
      const hash = CacheValidator.generateIntegrityHash(data);
      
      expect(CacheValidator.verifyCacheIntegrity(data, hash)).toBe(true);
    });

    test('should reject non-matching hashes', () => {
      const data = { test: 'value' };
      const wrongHash = 'wrong-hash';
      
      expect(CacheValidator.verifyCacheIntegrity(data, wrongHash)).toBe(false);
    });

    test('should handle errors gracefully', () => {
      expect(CacheValidator.verifyCacheIntegrity(null, 'hash')).toBe(false);
    });
  });
});

describe('APIDataValidator', () => {
  describe('validateProviderName', () => {
    test('should accept valid provider names', () => {
      const validProviders = [
        'googleapis.com',
        'azure.com',
        'github.com'
      ];

      validProviders.forEach(provider => {
        expect(() => APIDataValidator.validateProviderName(provider)).not.toThrow();
      });
    });

    test('should reject invalid provider names', () => {
      const invalidProviders = [
        '',
        null,
        undefined,
        'a'.repeat(300) // Too long
      ];

      invalidProviders.forEach(provider => {
        expect(() => APIDataValidator.validateProviderName(provider as any))
          .toThrow(ValidationError);
      });
    });
  });

  describe('validateAPIId', () => {
    test('should accept valid API IDs', () => {
      const validIds = [
        'provider.com:service',
        'simple:api'
      ];

      validIds.forEach(id => {
        expect(() => APIDataValidator.validateAPIId(id)).not.toThrow();
      });
    });

    test('should reject invalid API IDs', () => {
      const invalidIds = [
        '',
        null,
        undefined,
        'a'.repeat(600) // Too long
      ];

      invalidIds.forEach(id => {
        expect(() => APIDataValidator.validateAPIId(id as any))
          .toThrow(ValidationError);
      });
    });
  });

  describe('validateSearchQuery', () => {
    test('should accept valid search queries', () => {
      const validQueries = [
        'simple search',
        'test-api'
      ];

      validQueries.forEach(query => {
        expect(() => APIDataValidator.validateSearchQuery(query)).not.toThrow();
      });
    });

    test('should reject invalid search queries', () => {
      const invalidQueries = [
        '',
        'a', // Too short
        'a'.repeat(1100) // Too long
      ];

      invalidQueries.forEach(query => {
        expect(() => APIDataValidator.validateSearchQuery(query as any))
          .toThrow(ValidationError);
      });
    });
  });
});

describe('URLValidator', () => {
  describe('validateURL', () => {
    test('should accept valid URLs', () => {
      const validURLs = [
        'https://example.com',
        'https://api.example.com/v1',
        'https://example.com:8080/path',
        'https://subdomain.example.com/path?query=value',
        'https://example.com/path#fragment',
        'http://example.com' // HTTP is also allowed per implementation
      ];

      validURLs.forEach(url => {
        expect(() => URLValidator.validateURL(url)).not.toThrow();
      });
    });

    test('should reject invalid or dangerous URLs', () => {
      const invalidURLs = [
        { url: 'javascript:alert("xss")', error: 'Only HTTP and HTTPS URLs are allowed' },
        { url: 'data:text/html,<script>alert("xss")</script>', error: 'Only HTTP and HTTPS URLs are allowed' },
        { url: 'file:///etc/passwd', error: 'Only HTTP and HTTPS URLs are allowed' },
        { url: 'ftp://example.com', error: 'Only HTTP and HTTPS URLs are allowed' },
        { url: '../relative/path', error: 'Invalid URL format' },
        { url: 'not-a-url', error: 'Invalid URL format' },
        { url: '', error: 'URL must be a non-empty string' },
        { url: null as any, error: 'URL must be a non-empty string' },
        { url: undefined as any, error: 'URL must be a non-empty string' }
      ];

      invalidURLs.forEach(({ url, error }) => {
        expect(() => URLValidator.validateURL(url)).toThrow(error);
      });
    });

    test('should reject local addresses', () => {
      const localURLs = [
        'http://localhost',
        'http://127.0.0.1',
        'http://192.168.1.1',
        'http://10.0.0.1',
        'http://172.16.0.1'
      ];

      localURLs.forEach(url => {
        expect(() => URLValidator.validateURL(url)).toThrow('Local and private addresses are not allowed');
      });
    });
  });
});