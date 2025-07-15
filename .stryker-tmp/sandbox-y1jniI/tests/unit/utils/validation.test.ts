// @ts-nocheck
import { describe, test, expect } from '@jest/globals';
import { 
  CacheValidator, 
  URLValidator,
  APIDataValidator,
  DataValidator
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

describe('DataValidator', () => {
  describe('containsSuspiciousContent', () => {
    test('should detect XSS script tags', () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        '<SCRIPT>alert("XSS")</SCRIPT>', // Case insensitive
        '<script type="text/javascript">alert("xss")</script>',
        '<script\nsrc="evil.js"></script>', // With newlines
        '<script >alert("xss")</script>', // With spaces
        '<script\t>alert("xss")</script >', // With tabs
        '<script\r\n>alert("xss")</script\t\n >', // Complex whitespace
        '<script>/*comment*/alert("xss")</script>',
        'text<script>alert("xss")</script>text',
        '<div><script>alert("xss")</script></div>',
        '</script\t\n bar>' // The specific case that caused the vulnerability
      ];

      xssAttempts.forEach(attempt => {
        const result = DataValidator['containsSuspiciousContent'](attempt);
        expect(result).toBe(true);
      });
    });

    test('should detect javascript: URLs', () => {
      const jsUrls = [
        'javascript:alert("xss")',
        'JAVASCRIPT:alert("XSS")',
        'javascript:void(0)',
        'javascript:document.location="evil.com"'
      ];

      jsUrls.forEach(url => {
        const result = DataValidator['containsSuspiciousContent'](url);
        // Note: DOMPurify may not detect standalone javascript: URLs
        // as they're not HTML - they get caught by the fallback patterns
        expect(result).toBe(true);
      });
    });

    test('should detect HTML event handlers', () => {
      const eventHandlers = [
        'onclick="alert(1)"',
        'onload="malicious()"',
        'onerror="steal_data()"',
        'onmouseover="exploit()"',
        'onfocus="bad_code()"'
      ];

      eventHandlers.forEach(handler => {
        const result = DataValidator['containsSuspiciousContent'](handler);
        expect(result).toBe(true);
      });
    });

    test('should detect SQL injection attempts', () => {
      const sqlInjections = [
        "'; DROP TABLE users; --",
        'SELECT * FROM secrets',
        '" OR 1=1 --',
        "' UNION SELECT * FROM passwords --",
        'admin"--',
        "user'; DELETE FROM accounts; --"
      ];

      sqlInjections.forEach(injection => {
        const result = DataValidator['containsSuspiciousContent'](injection);
        expect(result).toBe(true);
      });
    });

    test('should allow safe content', () => {
      const trueSafeContent = [
        'normal text',
        'user@example.com', 
        'https://example.com/api',
        'API documentation for users',
        'version 1.2.3',
        'GET /api/users',
        'POST request body',
        '{"name": "John", "age": 30}',
        'search query with spaces',
        '2024-01-15T10:30:00Z'
      ];

      trueSafeContent.forEach(content => {
        const result = DataValidator['containsSuspiciousContent'](content);
        expect(result).toBe(false);
      });
    });

    test('should handle edge cases', () => {
      const edgeCases = [
        '', // Empty string
        ' ', // Just spaces
        '\n\t', // Just whitespace
        'null',
        'undefined',
        '0',
        'false'
      ];

      edgeCases.forEach(edge => {
        expect(() => DataValidator['containsSuspiciousContent'](edge)).not.toThrow();
      });
    });

    test('should handle DOMPurify failures gracefully', () => {
      // Test that fallback works if DOMPurify somehow fails
      // We can't easily mock this without changing the implementation,
      // but we can test that the method doesn't crash with various inputs
      const stressInputs = [
        'a'.repeat(10000), // Very long string
        '🚀🎉💯', // Unicode/emoji
        '\u0000\u0001\u0002', // Control characters
        '\\x00\\x01\\x02', // Escaped characters
      ];

      stressInputs.forEach(input => {
        expect(() => DataValidator['containsSuspiciousContent'](input)).not.toThrow();
      });
    });
  });

  describe('validateProviders', () => {
    test('should validate and sanitize provider list', () => {
      const validProviders = {
        data: ['google.com', 'microsoft.com', 'github.com']
      };

      const result = DataValidator.validateProviders(validProviders);
      
      expect(result.isValid).toBe(true);
      expect(result.data.data).toEqual(['google.com', 'microsoft.com', 'github.com']);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle malicious provider names', () => {
      const maliciousProviders = {
        data: [
          'normal.com',
          '<script>alert("xss")</script>',
          'safe-api.com',
          'javascript:alert(1)'
        ]
      };

      const result = DataValidator.validateProviders(maliciousProviders);
      
      expect(result.isValid).toBe(true);
      expect(result.data.data).toHaveLength(4); // All are included but flagged
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('malicious'))).toBe(true);
    });

    test('should handle invalid provider data structures', () => {
      const invalidInputs = [
        null,
        undefined,
        {},
        { data: null },
        { data: 'not-an-array' },
        'not-an-object'
      ];

      invalidInputs.forEach(input => {
        const result = DataValidator.validateProviders(input);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateSearchResults', () => {
    test('should validate valid search results', () => {
      const validResults = {
        results: [
          {
            id: 'api1',
            title: 'Test API',
            description: 'A test API',
            provider: 'example.com',
            preferred: 'v1',
            categories: ['web', 'rest']
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total_results: 1,
          total_pages: 1,
          has_next: false,
          has_previous: false
        }
      };

      const result = DataValidator.validateSearchResults(validResults);
      
      expect(result.isValid).toBe(true);
      expect(result.data.results).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect and flag malicious content in search results', () => {
      const maliciousResults = {
        results: [
          {
            id: '<script>alert("xss")</script>',
            title: 'Normal API',
            description: 'javascript:alert(1)',
            provider: 'example.com',
            preferred: 'v1',
            categories: []
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total_results: 1,
          total_pages: 1,
          has_next: false,
          has_previous: false
        }
      };

      const result = DataValidator.validateSearchResults(maliciousResults);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('malicious'))).toBe(true);
    });
  });

  describe('validateMetrics', () => {
    test('should validate valid metrics', () => {
      const validMetrics = {
        numSpecs: 100,
        numAPIs: 50,
        numEndpoints: 1000
      };

      const result = DataValidator.validateMetrics(validMetrics);
      
      expect(result.isValid).toBe(true);
      expect(result.data.numSpecs).toBe(100);
      expect(result.data.numAPIs).toBe(50);
      expect(result.data.numEndpoints).toBe(1000);
    });

    test('should handle invalid metrics gracefully', () => {
      const invalidMetrics = {
        numSpecs: 'not-a-number',
        numAPIs: -5,
        numEndpoints: null,
        maliciousScript: '<script>alert("xss")</script>',
        sqlInjection: '\'; DROP TABLE metrics; --'
      };

      const result = DataValidator.validateMetrics(invalidMetrics);
      
      expect(result.isValid).toBe(true);
      expect(result.data.numSpecs).toBe(0); // Converted to safe default
      expect(result.data.numAPIs).toBe(0); // Negative converted to 0
      expect(result.data.numEndpoints).toBe(0); // Null converted to 0
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('suspicious'))).toBe(true);
    });
  });
});