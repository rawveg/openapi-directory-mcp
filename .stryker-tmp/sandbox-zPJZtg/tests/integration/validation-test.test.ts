// @ts-nocheck
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { CacheManager } from '../../src/cache/manager.js';
import { createMockedApiClient } from '../mocks/api-client-mock.js';
import { DataValidator } from '../../src/utils/validation.js';

/**
 * Test data validation and sanitization 
 */
describe('Data Validation Tests', () => {
  let cacheManager: CacheManager;

  beforeAll(async () => {
    cacheManager = new CacheManager();
  });

  afterAll(() => {
    if (cacheManager) {
      cacheManager.clear();
    }
  });

  beforeEach(() => {
    cacheManager.clear();
  });

  describe('Provider Validation', () => {
    test('should sanitize corrupted provider data', () => {
      const corruptedData = {
        data: [
          null,
          '',
          123,
          { not: 'a string' },
          'valid-provider.com',
          undefined,
          '  whitespace-provider.com  ',
          '<script>alert("xss")</script>.com'
        ]
      };

      const result = DataValidator.validateProviders(corruptedData);
      
      expect(result.isValid).toBe(true);
      expect(result.data.data).toHaveLength(4); // Should filter out null, empty, object, undefined
      expect(result.data.data).toContain('valid-provider.com');
      expect(result.data.data).toContain('123'); // Number converted to string
      expect(result.data.data).toContain('whitespace-provider.com'); // Trimmed
      expect(result.data.data).toContain('<script>alert("xss")</script>.com'); // Kept but logged
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Skipped null/empty provider'))).toBe(true);
      expect(result.warnings.some(w => w.includes('Converted non-string provider'))).toBe(true);
      expect(result.warnings.some(w => w.includes('Potentially malicious provider'))).toBe(true);
    });

    test('should handle completely invalid provider data', () => {
      const invalidData = null;
      
      const result = DataValidator.validateProviders(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.data.data).toEqual([]);
      expect(result.errors).toContain('Providers response must be an object');
    });

    test('should handle provider data without data array', () => {
      const invalidData = { notData: 'wrong' };
      
      const result = DataValidator.validateProviders(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.data.data).toEqual([]);
      expect(result.errors).toContain('Providers data must be an array');
    });
  });

  describe('Metrics Validation', () => {
    test('should sanitize corrupted metrics data', () => {
      const corruptedData = {
        numSpecs: 'not_a_number',
        numAPIs: -1,
        numEndpoints: null,
        validField: 'keeps this',
        functionField: () => 'removes this'
      };

      const result = DataValidator.validateMetrics(corruptedData);
      
      expect(result.isValid).toBe(true);
      expect(result.data.numSpecs).toBe(0); // Invalid string converted to 0
      expect(result.data.numAPIs).toBe(0); // Negative number converted to 0
      expect(result.data.numEndpoints).toBe(0); // Null converted to 0
      expect(result.data.validField).toBe('keeps this');
      expect(result.data.functionField).toBeUndefined(); // Function removed
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Invalid numSpecs value'))).toBe(true);
      expect(result.warnings.some(w => w.includes('Invalid numAPIs value'))).toBe(true);
      expect(result.warnings.some(w => w.includes('Invalid numEndpoints value'))).toBe(true);
      expect(result.warnings.some(w => w.includes('Skipped function property'))).toBe(true);
    });

    test('should handle valid metrics data', () => {
      const validData = {
        numSpecs: 100,
        numAPIs: 50,
        numEndpoints: 1000,
        extraField: 'preserved'
      };

      const result = DataValidator.validateMetrics(validData);
      
      expect(result.isValid).toBe(true);
      expect(result.data.numSpecs).toBe(100);
      expect(result.data.numAPIs).toBe(50);
      expect(result.data.numEndpoints).toBe(1000);
      expect(result.data.extraField).toBe('preserved');
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Integration with Mock Client', () => {
    test('should handle corrupted provider data through full pipeline', async () => {
      const mockClient = createMockedApiClient(cacheManager, 'corrupted_data', {
        corruptedType: 'providersCorrupted'
      });

      // This will now go through validation
      const result = await mockClient.getProviders();
      
      // The result should be validated and sanitized
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      
      // Check that invalid entries were filtered out
      const validProviders = result.data.filter((p: any) => 
        typeof p === 'string' && p.length > 0
      );
      
      // With validation, we should have filtered out null, undefined, empty string, object
      // But kept the number (converted to string) and valid provider
      expect(validProviders.length).toBeGreaterThan(0);
      expect(validProviders).toContain('valid-provider.com');
    });
  });

  describe('Search Results Validation', () => {
    test('should sanitize corrupted search results', () => {
      const corruptedData = {
        results: [
          null,
          { id: 'api1', title: 'Valid API' },
          { id: 123, title: null, description: '<script>alert("xss")</script>' },
          'not an object',
          { id: 'api2', categories: ['cat1', 123, null, 'cat2'] }
        ],
        pagination: {
          page: 'not_a_number',
          limit: -5,
          total_results: null,
          has_next: 'yes'
        }
      };

      const result = DataValidator.validateSearchResults(corruptedData);
      
      expect(result.isValid).toBe(true);
      expect(result.data.results).toHaveLength(3); // Should filter out null and string
      expect(result.data.results[0].id).toBe('api1');
      expect(result.data.results[1].id).toBe('123'); // Converted to string
      expect(result.data.results[2].categories).toEqual(['cat1', '123', 'cat2']); // Filtered and converted
      
      expect(result.data.pagination.page).toBe(1); // Invalid string converted to 1
      expect(result.data.pagination.limit).toBe(20); // Negative converted to reasonable default 20
      expect(result.data.pagination.has_next).toBe(true); // Truthy string converted to true
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Potentially malicious content'))).toBe(true);
    });

    test('should handle completely invalid search results', () => {
      const result = DataValidator.validateSearchResults(null);
      
      expect(result.isValid).toBe(false);
      expect(result.data.results).toEqual([]);
      expect(result.errors).toContain('Search results must be an object');
    });
  });

  describe('Suspicious Content Detection', () => {
    test('should detect XSS attempts', () => {
      const xssData = {
        data: [
          '<script>alert("xss")</script>.com',
          'javascript:alert(1).com',
          'onclick=alert(1).com',
          'normal-provider.com'
        ]
      };

      const result = DataValidator.validateProviders(xssData);
      
      expect(result.isValid).toBe(true);
      expect(result.data.data).toHaveLength(4); // All included but flagged
      expect(result.warnings.some(w => w.includes('Potentially malicious provider'))).toBe(true);
    });

    test('should detect SQL injection attempts', () => {
      const sqlData = {
        data: [
          "'; DROP TABLE providers; --",
          "admin'--", 
          "1' OR '1'='1",
          'normal-provider.com'
        ]
      };

      const result = DataValidator.validateProviders(sqlData);
      
      expect(result.isValid).toBe(true);
      expect(result.data.data).toHaveLength(4); // All included but flagged
      expect(result.warnings.some(w => w.includes('Potentially malicious provider'))).toBe(true);
    });
  });
});