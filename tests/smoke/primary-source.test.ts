import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { CacheManager } from '../../src/cache/manager.js';
import { DualSourceApiClient } from '../../src/api/dual-source-client.js';
import { ToolHandler } from '../../src/tools/handler.js';
import { ToolContext } from '../../src/tools/types.js';

/**
 * Smoke tests for all tools using primary data source (APIs.guru)
 * These tests verify basic functionality and identify broken tools
 */

describe('Primary Source Smoke Tests', () => {
  let cacheManager: CacheManager;
  let apiClient: DualSourceApiClient;
  let toolHandler: ToolHandler;
  let toolContext: ToolContext;

  beforeAll(async () => {
    // Set up real clients for smoke testing
    cacheManager = new CacheManager();
    apiClient = new DualSourceApiClient(
      'https://api.apis.guru/v2',
      'https://api.apis.guru/v2', // Use same URL for secondary for now
      cacheManager
    );
    toolHandler = new ToolHandler();
    toolContext = {
      apiClient,
      cacheManager
    };
  });

  afterAll(async () => {
    // Clean up
    if (cacheManager) {
      cacheManager.clear();
    }
  });

  describe('API Discovery Tools', () => {
    test('get-providers should work', async () => {
      try {
        const result = await toolHandler.callTool('get-providers', {}, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBeDefined();
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
        
        console.log(`✅ get-providers: Found ${result.data.length} providers`);
      } catch (error) {
        console.error(`❌ get-providers failed:`, error);
        throw error;
      }
    }, 15000);

    test('get-metrics should work', async () => {
      try {
        const result = await toolHandler.callTool('get-metrics', {}, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.numSpecs).toBeGreaterThan(0);
        expect(result.numAPIs).toBeGreaterThan(0);
        
        console.log(`✅ get-metrics: ${result.numSpecs} specs, ${result.numAPIs} APIs`);
      } catch (error) {
        console.error(`❌ get-metrics failed:`, error);
        throw error;
      }
    }, 15000);

    test('list-all-apis should work', async () => {
      try {
        const result = await toolHandler.callTool('list-all-apis', {}, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.results).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
        expect(result.results.length).toBeGreaterThan(0);
        expect(result.pagination).toBeDefined();
        
        console.log(`✅ list-all-apis: Found ${result.results.length} APIs (page 1)`);
      } catch (error) {
        console.error(`❌ list-all-apis failed:`, error);
        throw error;
      }
    }, 15000);

    test('get-provider-services should work with known provider', async () => {
      try {
        // First get providers to find a valid one
        const providersResult = await toolHandler.callTool('get-providers', {}, toolContext);
        expect(providersResult.data.length).toBeGreaterThan(0);
        
        const testProvider = providersResult.data[0];
        const result = await toolHandler.callTool('get-provider-services', {
          provider: testProvider
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        
        console.log(`✅ get-provider-services: Provider ${testProvider} has services`);
      } catch (error) {
        console.error(`❌ get-provider-services failed:`, error);
        throw error;
      }
    }, 15000);
  });

  describe('API Details Tools', () => {
    test('search-apis should work', async () => {
      try {
        const result = await toolHandler.callTool('search-apis', {
          query: 'google',
          limit: 5
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.results).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
        
        console.log(`✅ search-apis: Found ${result.results.length} results for 'google'`);
      } catch (error) {
        console.error(`❌ search-apis failed:`, error);
        throw error;
      }
    }, 15000);

    test('get-api should work with known API', async () => {
      try {
        // Try to get a known API
        const result = await toolHandler.callTool('get-api', {
          provider: 'googleapis.com',
          api: 'admin'
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        
        console.log(`✅ get-api: Retrieved googleapis.com:admin`);
      } catch (error) {
        console.error(`❌ get-api failed:`, error);
        throw error;
      }
    }, 15000);

    test('get-api-summary should work', async () => {
      try {
        const result = await toolHandler.callTool('get-api-summary', {
          api_id: 'googleapis.com:admin'
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.id).toBe('googleapis.com:admin');
        expect(result.title).toBeDefined();
        
        console.log(`✅ get-api-summary: ${result.title}`);
      } catch (error) {
        console.error(`❌ get-api-summary failed:`, error);
        throw error;
      }
    }, 15000);

    test('get-openapi-spec should work', async () => {
      try {
        // Get a known API first to get its swagger URL
        const apiResult = await toolHandler.callTool('get-api', {
          provider: 'googleapis.com',
          api: 'admin'
        }, toolContext);
        
        expect(apiResult.versions).toBeDefined();
        const preferredVersion = apiResult.versions[apiResult.preferred];
        expect(preferredVersion.swaggerUrl).toBeDefined();
        
        const result = await toolHandler.callTool('get-openapi-spec', {
          url: preferredVersion.swaggerUrl
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.info).toBeDefined();
        
        console.log(`✅ get-openapi-spec: Retrieved spec for ${result.info.title}`);
      } catch (error) {
        console.error(`❌ get-openapi-spec failed:`, error);
        throw error;
      }
    }, 15000);

    test('get-provider-stats should work', async () => {
      try {
        const result = await toolHandler.callTool('get-provider-stats', {
          provider: 'googleapis.com'
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.provider).toBe('googleapis.com');
        
        console.log(`✅ get-provider-stats: googleapis.com has ${result.total_apis} APIs`);
      } catch (error) {
        console.error(`❌ get-provider-stats failed:`, error);
        throw error;
      }
    }, 15000);
  });

  describe('Endpoint Tools', () => {
    test('get-endpoints should work', async () => {
      try {
        const result = await toolHandler.callTool('get-endpoints', {
          api_id: 'googleapis.com:admin',
          limit: 5
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.results).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
        
        console.log(`✅ get-endpoints: Found ${result.results.length} endpoints`);
      } catch (error) {
        console.error(`❌ get-endpoints failed:`, error);
        throw error;
      }
    }, 15000);

    test('get-endpoint-details should work', async () => {
      try {
        // First get endpoints
        const endpointsResult = await toolHandler.callTool('get-endpoints', {
          api_id: 'googleapis.com:admin',
          limit: 1
        }, toolContext);
        
        if (endpointsResult.results && endpointsResult.results.length > 0) {
          const endpoint = endpointsResult.results[0];
          
          const result = await toolHandler.callTool('get-endpoint-details', {
            api_id: 'googleapis.com:admin',
            method: endpoint.method,
            path: endpoint.path
          }, toolContext);
          
          expect(result).toBeDefined();
          expect(result.error).toBeUndefined();
          expect(result.method).toBe(endpoint.method);
          expect(result.path).toBe(endpoint.path);
          
          console.log(`✅ get-endpoint-details: ${endpoint.method} ${endpoint.path}`);
        } else {
          console.log(`⚠️  get-endpoint-details: No endpoints found to test`);
        }
      } catch (error) {
        console.error(`❌ get-endpoint-details failed:`, error);
        throw error;
      }
    }, 15000);

    test('get-endpoint-schema should work', async () => {
      try {
        // First get endpoints
        const endpointsResult = await toolHandler.callTool('get-endpoints', {
          api_id: 'googleapis.com:admin',
          limit: 1
        }, toolContext);
        
        if (endpointsResult.results && endpointsResult.results.length > 0) {
          const endpoint = endpointsResult.results[0];
          
          const result = await toolHandler.callTool('get-endpoint-schema', {
            api_id: 'googleapis.com:admin',
            method: endpoint.method,
            path: endpoint.path
          }, toolContext);
          
          expect(result).toBeDefined();
          expect(result.error).toBeUndefined();
          expect(result.method).toBe(endpoint.method);
          expect(result.path).toBe(endpoint.path);
          
          console.log(`✅ get-endpoint-schema: Schema for ${endpoint.method} ${endpoint.path}`);
        } else {
          console.log(`⚠️  get-endpoint-schema: No endpoints found to test`);
        }
      } catch (error) {
        console.error(`❌ get-endpoint-schema failed:`, error);
        throw error;
      }
    }, 15000);

    test('get-endpoint-examples should work', async () => {
      try {
        // First get endpoints
        const endpointsResult = await toolHandler.callTool('get-endpoints', {
          api_id: 'googleapis.com:admin',
          limit: 1
        }, toolContext);
        
        if (endpointsResult.results && endpointsResult.results.length > 0) {
          const endpoint = endpointsResult.results[0];
          
          const result = await toolHandler.callTool('get-endpoint-examples', {
            api_id: 'googleapis.com:admin',
            method: endpoint.method,
            path: endpoint.path
          }, toolContext);
          
          expect(result).toBeDefined();
          expect(result.error).toBeUndefined();
          expect(result.method).toBe(endpoint.method);
          expect(result.path).toBe(endpoint.path);
          
          console.log(`✅ get-endpoint-examples: Examples for ${endpoint.method} ${endpoint.path}`);
        } else {
          console.log(`⚠️  get-endpoint-examples: No endpoints found to test`);
        }
      } catch (error) {
        console.error(`❌ get-endpoint-examples failed:`, error);
        throw error;
      }
    }, 15000);
  });

  describe('Provider Tools', () => {
    test('get-provider-apis should work', async () => {
      try {
        const result = await toolHandler.callTool('get-provider-apis', {
          provider: 'googleapis.com'
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.apis).toBeDefined();
        expect(typeof result.apis).toBe('object');
        
        const apiCount = Object.keys(result.apis).length;
        console.log(`✅ get-provider-apis: googleapis.com has ${apiCount} APIs`);
      } catch (error) {
        console.error(`❌ get-provider-apis failed:`, error);
        throw error;
      }
    }, 15000);
  });

  describe('Utility Tools', () => {
    test('get-popular-apis should work', async () => {
      try {
        const result = await toolHandler.callTool('get-popular-apis', {
          limit: 5
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        
        console.log(`✅ get-popular-apis: Found ${result.length} popular APIs`);
      } catch (error) {
        console.error(`❌ get-popular-apis failed:`, error);
        throw error;
      }
    }, 15000);

    test('get-recently-updated should work', async () => {
      try {
        const result = await toolHandler.callTool('get-recently-updated', {
          limit: 5
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        
        console.log(`✅ get-recently-updated: Found ${result.length} recently updated APIs`);
      } catch (error) {
        console.error(`❌ get-recently-updated failed:`, error);
        throw error;
      }
    }, 15000);

    test('analyze-api-categories should work', async () => {
      try {
        const result = await toolHandler.callTool('analyze-api-categories', {}, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.categories).toBeDefined();
        expect(Array.isArray(result.categories)).toBe(true);
        
        console.log(`✅ analyze-api-categories: Found ${result.categories.length} categories`);
      } catch (error) {
        console.error(`❌ analyze-api-categories failed:`, error);
        throw error;
      }
    }, 15000);
  });

  describe('Cache Tools', () => {
    test('cache-stats should work', async () => {
      try {
        const result = await toolHandler.callTool('cache-stats', {}, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.stats).toBeDefined();
        
        console.log(`✅ cache-stats: ${result.stats.keys} cache keys`);
      } catch (error) {
        console.error(`❌ cache-stats failed:`, error);
        throw error;
      }
    }, 15000);

    test('cache-info should work', async () => {
      try {
        const result = await toolHandler.callTool('cache-info', {}, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        
        console.log(`✅ cache-info: Cache information retrieved`);
      } catch (error) {
        console.error(`❌ cache-info failed:`, error);
        throw error;
      }
    }, 15000);

    test('list-cache-keys should work', async () => {
      try {
        const result = await toolHandler.callTool('list-cache-keys', {}, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(Array.isArray(result.keys)).toBe(true);
        
        console.log(`✅ list-cache-keys: Found ${result.keys.length} cache keys`);
      } catch (error) {
        console.error(`❌ list-cache-keys failed:`, error);
        throw error;
      }
    }, 15000);

    test('clear-cache should work', async () => {
      try {
        const result = await toolHandler.callTool('clear-cache', {}, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        
        console.log(`✅ clear-cache: Cache cleared successfully`);
      } catch (error) {
        console.error(`❌ clear-cache failed:`, error);
        throw error;
      }
    }, 15000);

    test('clear-cache-key should work', async () => {
      try {
        // First add something to cache, then clear it
        await toolHandler.callTool('get-providers', {}, toolContext);
        
        const result = await toolHandler.callTool('clear-cache-key', {
          key: 'providers'
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        
        console.log(`✅ clear-cache-key: Specific cache key cleared`);
      } catch (error) {
        console.error(`❌ clear-cache-key failed:`, error);
        throw error;
      }
    }, 15000);
  });
});