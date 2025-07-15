// @ts-nocheck
import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { CacheManager } from '../../src/cache/manager.js';
import { DualSourceApiClient } from '../../src/api/dual-source-client.js';
import { createMockDualSourceClient } from '../helpers/mock-clients.js';

/**
 * Test full validation pipeline through DualSourceApiClient
 */
describe('Full Pipeline Validation Tests', () => {
  let cacheManager: CacheManager;
  let dualSourceClient: DualSourceApiClient;

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
    
    // Create mocked DualSourceApiClient
    dualSourceClient = createMockDualSourceClient(cacheManager);
  });

  test('should validate and sanitize corrupted provider data through merge utilities', async () => {
    // Mock the underlying clients to return corrupted data
    const mockPrimaryResponse = {
      data: [null, '', 123, { not: 'a string' }, 'primary-provider.com', undefined]
    };
    
    const mockSecondaryResponse = {
      data: ['<script>alert("xss")</script>.com', 'secondary-provider.com', "'; DROP TABLE providers; --"]
    };

    // Spy on the primary and secondary client methods
    const primaryClientSpy = jest.spyOn((dualSourceClient as any).primaryClient, 'getProviders')
      .mockResolvedValue(mockPrimaryResponse);
    const secondaryClientSpy = jest.spyOn((dualSourceClient as any).secondaryClient, 'getProviders')
      .mockResolvedValue(mockSecondaryResponse);
    const customClientSpy = jest.spyOn((dualSourceClient as any).customClient, 'getProviders')
      .mockResolvedValue({ data: [] });

    const result = await dualSourceClient.getProviders();

    // Verify the methods were called
    expect(primaryClientSpy).toHaveBeenCalled();
    expect(secondaryClientSpy).toHaveBeenCalled();
    expect(customClientSpy).toHaveBeenCalled();

    // Verify result structure
    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    
    // With validation through merge utilities, the data should be sanitized:
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

    // Restore spies
    primaryClientSpy.mockRestore();
    secondaryClientSpy.mockRestore();
    customClientSpy.mockRestore();
  });

  test('should validate and sanitize corrupted metrics data through aggregation', async () => {
    const mockPrimaryMetrics = {
      numSpecs: 'not_a_number',
      numAPIs: -5,
      numEndpoints: null,
      validField: 'preserved',
      maliciousScript: '<script>alert("xss")</script>',
      functionField: () => 'removes this'
    };

    const mockSecondaryMetrics = {
      numSpecs: '150',  // String that can be converted
      numAPIs: 75.8,    // Decimal that should be floored
      numEndpoints: undefined
    };

    // Mock the underlying client methods
    const primaryMetricsSpy = jest.spyOn((dualSourceClient as any).primaryClient, 'getMetrics')
      .mockResolvedValue(mockPrimaryMetrics);
    const secondaryMetricsSpy = jest.spyOn((dualSourceClient as any).secondaryClient, 'getMetrics')
      .mockResolvedValue(mockSecondaryMetrics);
    const customMetricsSpy = jest.spyOn((dualSourceClient as any).customClient, 'getMetrics')
      .mockResolvedValue({ numSpecs: 0, numAPIs: 0, numEndpoints: 0 });

    // Mock the listAPIs methods to provide API data for aggregation
    const mockAPIs = { 'test:v1': { preferred: 'v1', versions: {} } };
    jest.spyOn((dualSourceClient as any).primaryClient, 'listAPIs')
      .mockResolvedValue(mockAPIs);
    jest.spyOn((dualSourceClient as any).secondaryClient, 'listAPIs')
      .mockResolvedValue({});
    jest.spyOn((dualSourceClient as any).customClient, 'listAPIs')
      .mockResolvedValue({});

    const result = await dualSourceClient.getMetrics();

    // Verify the methods were called
    expect(primaryMetricsSpy).toHaveBeenCalled();
    expect(secondaryMetricsSpy).toHaveBeenCalled();
    expect(customMetricsSpy).toHaveBeenCalled();

    // Verify result structure and validation
    expect(result).toBeDefined();
    expect(typeof result.numSpecs).toBe('number');
    expect(typeof result.numAPIs).toBe('number');
    expect(typeof result.numEndpoints).toBe('number');

    // Should have sanitized invalid values
    expect(result.numSpecs).toBeGreaterThanOrEqual(0);
    expect(result.numAPIs).toBeGreaterThanOrEqual(0);
    expect(result.numEndpoints).toBeGreaterThanOrEqual(0);

    // Should preserve valid fields from primary
    expect(result.validField).toBe('preserved');

    // Should remove function fields
    expect(result.functionField).toBeUndefined();

    // Malicious content should be preserved but flagged in logs
    expect(typeof result.maliciousScript).toBe('string');

    // Restore spies
    jest.restoreAllMocks();
  });
});