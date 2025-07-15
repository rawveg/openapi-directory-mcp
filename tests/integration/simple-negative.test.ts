import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { CacheManager } from '../../src/cache/manager.js';
import { createMockedApiClient } from '../mocks/api-client-mock.js';

/**
 * Simple negative scenario tests to verify mock behavior
 */
describe('Simple Negative Tests', () => {
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

  test('should handle network errors', async () => {
    const mockClient = createMockedApiClient(cacheManager, 'network_error', {
      networkErrorType: 'connectionRefused'
    });

    await expect(mockClient.getProviders()).rejects.toThrow(/ECONNREFUSED/);
  });

  test('should handle success case', async () => {
    const mockClient = createMockedApiClient(cacheManager, 'success');

    const result = await mockClient.getProviders();
    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
  });

  test('should handle corrupted data through validation pipeline', async () => {
    // Import the actual validation to test it directly
    const { DataValidator } = await import('../../src/utils/validation.js');
    
    // Simulate corrupted data that would come from API
    const corruptedData = { 
      data: [null, '', 123, { not: 'a string' }, 'valid-provider.com', undefined] 
    };

    // Put the corrupted data through the validation pipeline
    const validationResult = DataValidator.validateProviders(corruptedData);
    
    expect(validationResult).toBeDefined();
    expect(validationResult.isValid).toBe(true); // Should be valid after sanitization
    expect(validationResult.data).toBeDefined();
    expect(Array.isArray(validationResult.data.data)).toBe(true);
    
    // With validation, the corrupted data should be sanitized:
    // - null values should be filtered out
    // - empty strings should be filtered out  
    // - numbers should be converted to strings but may be filtered for format
    // - valid providers should be preserved
    const result = validationResult.data;
    const validEntries = result.data.filter((item: any) => 
      item != null && item !== '' && typeof item === 'string'
    );
    
    expect(validEntries.length).toBeGreaterThan(0);
    expect(validEntries).toContain('valid-provider.com');
    // Should NOT contain null, undefined, or empty strings
    expect(result.data).not.toContain(null);
    expect(result.data).not.toContain('');
    expect(result.data).not.toContain(undefined);
    
    // Verify warnings were generated for problematic entries
    expect(validationResult.warnings.length).toBeGreaterThan(0);
  });
});