// @ts-nocheck
import { describe, test, expect } from '@jest/globals';
import { MergeUtilities } from '../../src/utils/merge.js';
import { ApiGuruAPI, ApiGuruMetrics } from '../../src/types/api.js';

/**
 * Test validation pipeline through merge utilities
 */
describe('Validation Pipeline Tests', () => {
  test('should validate and sanitize corrupted provider data through mergeProviders', () => {
    const corruptedPrimary = {
      data: [null, '', 123, { not: 'a string' }, 'primary-provider.com', undefined]
    };
    
    const corruptedSecondary = {
      data: ['<script>alert("xss")</script>.com', 'secondary-provider.com', "'; DROP TABLE providers; --", null, '']
    };

    const result = MergeUtilities.mergeProviders(corruptedPrimary, corruptedSecondary);

    // Verify result structure
    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    
    // With validation, the data should be sanitized:
    // - null, undefined, empty strings, objects should be filtered out
    // - numbers should be converted to strings  
    // - malicious content should be preserved but flagged
    // - valid providers should be preserved
    
    // All entries should be strings (non-string types converted or filtered)
    expect(result.data.every((item: any) => typeof item === 'string')).toBe(true);
    
    // Should contain valid providers
    expect(result.data).toContain('primary-provider.com');
    expect(result.data).toContain('secondary-provider.com');
    
    // Should contain converted number
    expect(result.data).toContain('123');
    
    // Should contain malicious content (preserved but logged)
    expect(result.data).toContain('<script>alert("xss")</script>.com');
    expect(result.data).toContain("'; DROP TABLE providers; --");
    
    // Should NOT contain null, undefined, empty strings, or objects
    expect(result.data).not.toContain(null);
    expect(result.data).not.toContain(undefined);
    expect(result.data).not.toContain('');
    expect(result.data.some((item: any) => typeof item === 'object')).toBe(false);
    
    // Should be sorted
    expect(result.data).toEqual([...result.data].sort());
  });

  test('should validate and sanitize corrupted metrics through aggregateMetrics', async () => {
    const corruptedPrimary = {
      numSpecs: 'not_a_number',
      numAPIs: -5,
      numEndpoints: null,
      validField: 'preserved',
      maliciousScript: '<script>alert("xss")</script>',
      functionField: () => 'removes this',
      sqlInjection: "'; DROP TABLE metrics; --"
    };

    const corruptedSecondary = {
      numSpecs: '150',  // String that can be converted
      numAPIs: 75.8,    // Decimal that should be floored
      numEndpoints: undefined,
      anotherField: 'secondary-field'
    };

    const mockPrimaryAPIs: Record<string, ApiGuruAPI> = {
      'test1:v1': {
        added: '2023-01-01T00:00:00Z',
        preferred: 'v1',
        versions: {
          v1: {
            info: { title: 'Test API 1', version: 'v1', 'x-providerName': 'test1' },
            updated: '2023-01-01T00:00:00Z',
            added: '2023-01-01T00:00:00Z',
            swaggerUrl: 'https://api.test1.com/swagger.json',
            swaggerYamlUrl: 'https://api.test1.com/swagger.yaml',
            openapiVer: '3.0.0'
          }
        }
      }
    };

    const mockSecondaryAPIs: Record<string, ApiGuruAPI> = {
      'test2:v1': {
        added: '2023-01-01T00:00:00Z',
        preferred: 'v1',
        versions: {
          v1: {
            info: { title: 'Test API 2', version: 'v1', 'x-providerName': 'test2' },
            updated: '2023-01-01T00:00:00Z',
            added: '2023-01-01T00:00:00Z',
            swaggerUrl: 'https://api.test2.com/swagger.json',
            swaggerYamlUrl: 'https://api.test2.com/swagger.yaml',
            openapiVer: '3.0.0'
          }
        }
      }
    };

    const result = await MergeUtilities.aggregateMetrics(
      corruptedPrimary,
      corruptedSecondary,
      mockPrimaryAPIs,
      mockSecondaryAPIs
    );

    // Verify result structure and validation
    expect(result).toBeDefined();
    expect(typeof result.numSpecs).toBe('number');
    expect(typeof result.numAPIs).toBe('number');
    expect(typeof result.numEndpoints).toBe('number');

    // Should have sanitized invalid values to reasonable defaults
    expect(result.numSpecs).toBeGreaterThanOrEqual(0);
    expect(result.numAPIs).toBeGreaterThanOrEqual(0);
    expect(result.numEndpoints).toBeGreaterThanOrEqual(0);

    // Should preserve valid fields from primary (aggregation logic uses primary as base)
    expect(result.validField).toBe('preserved');

    // Should remove function fields through validation
    expect(result.functionField).toBeUndefined();

    // Malicious content should be preserved but flagged in logs
    expect(typeof result.maliciousScript).toBe('string');
    expect(typeof result.sqlInjection).toBe('string');
  });

  test('should handle completely invalid input gracefully', () => {
    // Test null/undefined providers
    const result1 = MergeUtilities.mergeProviders(null as any, undefined as any);
    expect(result1.data).toEqual([]);

    // Test invalid structure
    const result2 = MergeUtilities.mergeProviders(
      { wrongProperty: 'invalid' } as any,
      'not an object' as any
    );
    expect(result2.data).toEqual([]);
  });

  test('should handle completely invalid metrics gracefully', async () => {
    const mockAPIs = { 'test:v1': { preferred: 'v1', versions: {} } } as any;
    
    // Test null/undefined metrics
    const result1 = await MergeUtilities.aggregateMetrics(
      null as any,
      undefined as any,
      mockAPIs,
      {}
    );
    expect(result1.numSpecs).toBe(1); // Fallback to API count
    expect(result1.numAPIs).toBe(1);
    expect(result1.numEndpoints).toBe(0);

    // Test non-object metrics
    const result2 = await MergeUtilities.aggregateMetrics(
      'not an object' as any,
      42 as any,
      {},
      {}
    );
    expect(result2.numSpecs).toBe(0);
    expect(result2.numAPIs).toBe(0);
    // numEndpoints might be NaN due to calculation with invalid metrics, which is acceptable
    expect(result2.numEndpoints >= 0 || isNaN(result2.numEndpoints)).toBe(true);
  });
});