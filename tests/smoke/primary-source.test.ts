import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { CacheManager } from '../../src/cache/manager.js';
import { DualSourceApiClient } from '../../src/api/dual-source-client.js';
import { ToolHandler } from '../../src/tools/handler.js';
import { ToolContext } from '../../src/tools/types.js';
import { createMockedApiClient } from '../mocks/api-client-mock.js';

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
    // Set up mocked clients for smoke testing
    cacheManager = new CacheManager();
    const mockedApiClient = createMockedApiClient(cacheManager, 'success');
    apiClient = mockedApiClient as any;
    toolHandler = new ToolHandler();
    
    // Wait for tool handler to initialize tools
    await new Promise(resolve => setTimeout(resolve, 100));
    const { tools } = await toolHandler.listTools();
    expect(tools.length).toBe(22); // Verify tools are loaded
    
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
    test('get_providers should work', async () => {
      try {
        const result = await toolHandler.callTool('get_providers', {}, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBeDefined();
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
        
        console.log(`✅ get_providers: Found ${result.data.length} providers`);
      } catch (error) {
        console.error(`❌ get_providers failed:`, error);
        throw error;
      }
    }, 15000);

    test('get_metrics should work', async () => {
      try {
        const result = await toolHandler.callTool('get_metrics', {}, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.numSpecs).toBeGreaterThan(0);
        expect(result.numAPIs).toBeGreaterThan(0);
        
        console.log(`✅ get_metrics: ${result.numSpecs} specs, ${result.numAPIs} APIs`);
      } catch (error) {
        console.error(`❌ get_metrics failed:`, error);
        throw error;
      }
    }, 15000);

    test('list_all_apis should work', async () => {
      try {
        const result = await toolHandler.callTool('list_all_apis', {}, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.results).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
        expect(result.results.length).toBeGreaterThan(0);
        expect(result.pagination).toBeDefined();
        
        console.log(`✅ list_all_apis: Found ${result.results.length} APIs (page 1)`);
      } catch (error) {
        console.error(`❌ list_all_apis failed:`, error);
        throw error;
      }
    }, 15000);

    test('get_provider_services should work with known provider', async () => {
      try {
        // First get providers to find a valid one
        const providersResult = await toolHandler.callTool('get_providers', {}, toolContext);
        expect(providersResult.data.length).toBeGreaterThan(0);
        
        const testProvider = providersResult.data[0];
        const result = await toolHandler.callTool('get_provider_services', {
          provider: testProvider
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        
        console.log(`✅ get_provider_services: Provider ${testProvider} has services`);
      } catch (error) {
        console.error(`❌ get_provider_services failed:`, error);
        throw error;
      }
    }, 15000);
  });

  describe('API Details Tools', () => {
    test('search_apis should work', async () => {
      try {
        const result = await toolHandler.callTool('search_apis', {
          query: 'google',
          limit: 5
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.results).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
        
        console.log(`✅ search_apis: Found ${result.results.length} results for 'google'`);
      } catch (error) {
        console.error(`❌ search_apis failed:`, error);
        throw error;
      }
    }, 15000);

    test('get_api should work with known API', async () => {
      try {
        // Try to get a known API
        const result = await toolHandler.callTool('get_api', {
          provider: 'googleapis.com',
          api: 'admin'
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        
        console.log(`✅ get_api: Retrieved googleapis.com:admin`);
      } catch (error) {
        console.error(`❌ get_api failed:`, error);
        throw error;
      }
    }, 15000);

    test('get_api_summary should work', async () => {
      try {
        const result = await toolHandler.callTool('get_api_summary', {
          api_id: 'googleapis.com:admin'
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.id).toBe('googleapis.com:admin');
        expect(result.title).toBeDefined();
        
        console.log(`✅ get_api_summary: ${result.title}`);
      } catch (error) {
        console.error(`❌ get_api_summary failed:`, error);
        throw error;
      }
    }, 15000);

    test('get_openapi_spec should work', async () => {
      try {
        // Get a known API first to get its swagger URL
        const apiResult = await toolHandler.callTool('get_api', {
          provider: 'googleapis.com',
          api: 'admin'
        }, toolContext);
        
        expect(apiResult.versions).toBeDefined();
        const preferredVersion = apiResult.versions[apiResult.preferred];
        expect(preferredVersion.swaggerUrl).toBeDefined();
        
        const result = await toolHandler.callTool('get_openapi_spec', {
          url: preferredVersion.swaggerUrl
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.info).toBeDefined();
        
        console.log(`✅ get_openapi_spec: Retrieved spec for ${result.info.title}`);
      } catch (error) {
        console.error(`❌ get_openapi_spec failed:`, error);
        throw error;
      }
    }, 15000);

    test('get_provider_stats should work', async () => {
      try {
        const result = await toolHandler.callTool('get_provider_stats', {
          provider: 'googleapis.com'
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.provider).toBe('googleapis.com');
        
        console.log(`✅ get_provider_stats: googleapis.com has ${result.total_apis} APIs`);
      } catch (error) {
        console.error(`❌ get_provider_stats failed:`, error);
        throw error;
      }
    }, 15000);
  });

  describe('Endpoint Tools', () => {
    test('get_endpoints should work', async () => {
      try {
        const result = await toolHandler.callTool('get_endpoints', {
          api_id: 'googleapis.com:admin',
          limit: 5
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.results).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
        
        console.log(`✅ get_endpoints: Found ${result.results.length} endpoints`);
      } catch (error) {
        console.error(`❌ get_endpoints failed:`, error);
        throw error;
      }
    }, 15000);

    test('get_endpoint_details should work', async () => {
      try {
        // First get endpoints
        const endpointsResult = await toolHandler.callTool('get_endpoints', {
          api_id: 'googleapis.com:admin',
          limit: 1
        }, toolContext);
        
        if (endpointsResult.results && endpointsResult.results.length > 0) {
          const endpoint = endpointsResult.results[0];
          
          const result = await toolHandler.callTool('get_endpoint_details', {
            api_id: 'googleapis.com:admin',
            method: endpoint.method,
            path: endpoint.path
          }, toolContext);
          
          expect(result).toBeDefined();
          expect(result.error).toBeUndefined();
          expect(result.method).toBe(endpoint.method);
          expect(result.path).toBe(endpoint.path);
          
          console.log(`✅ get_endpoint_details: ${endpoint.method} ${endpoint.path}`);
        } else {
          console.log(`⚠️  get_endpoint_details: No endpoints found to test`);
        }
      } catch (error) {
        console.error(`❌ get_endpoint_details failed:`, error);
        throw error;
      }
    }, 15000);

    test('get_endpoint_schema should work', async () => {
      try {
        // First get endpoints
        const endpointsResult = await toolHandler.callTool('get_endpoints', {
          api_id: 'googleapis.com:admin',
          limit: 1
        }, toolContext);
        
        if (endpointsResult.results && endpointsResult.results.length > 0) {
          const endpoint = endpointsResult.results[0];
          
          const result = await toolHandler.callTool('get_endpoint_schema', {
            api_id: 'googleapis.com:admin',
            method: endpoint.method,
            path: endpoint.path
          }, toolContext);
          
          expect(result).toBeDefined();
          expect(result.error).toBeUndefined();
          expect(result.method).toBe(endpoint.method);
          expect(result.path).toBe(endpoint.path);
          
          console.log(`✅ get_endpoint_schema: Schema for ${endpoint.method} ${endpoint.path}`);
        } else {
          console.log(`⚠️  get_endpoint_schema: No endpoints found to test`);
        }
      } catch (error) {
        console.error(`❌ get_endpoint_schema failed:`, error);
        throw error;
      }
    }, 15000);

    test('get_endpoint_examples should work', async () => {
      try {
        // First get endpoints
        const endpointsResult = await toolHandler.callTool('get_endpoints', {
          api_id: 'googleapis.com:admin',
          limit: 1
        }, toolContext);
        
        if (endpointsResult.results && endpointsResult.results.length > 0) {
          const endpoint = endpointsResult.results[0];
          
          const result = await toolHandler.callTool('get_endpoint_examples', {
            api_id: 'googleapis.com:admin',
            method: endpoint.method,
            path: endpoint.path
          }, toolContext);
          
          expect(result).toBeDefined();
          expect(result.error).toBeUndefined();
          expect(result.method).toBe(endpoint.method);
          expect(result.path).toBe(endpoint.path);
          
          console.log(`✅ get_endpoint_examples: Examples for ${endpoint.method} ${endpoint.path}`);
        } else {
          console.log(`⚠️  get_endpoint_examples: No endpoints found to test`);
        }
      } catch (error) {
        console.error(`❌ get_endpoint_examples failed:`, error);
        throw error;
      }
    }, 15000);
  });

  describe('Provider Tools', () => {
    test('get_provider_apis should work', async () => {
      try {
        const result = await toolHandler.callTool('get_provider_apis', {
          provider: 'googleapis.com'
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.apis).toBeDefined();
        expect(typeof result.apis).toBe('object');
        
        const apiCount = Object.keys(result.apis).length;
        console.log(`✅ get_provider_apis: googleapis.com has ${apiCount} APIs`);
      } catch (error) {
        console.error(`❌ get_provider_apis failed:`, error);
        throw error;
      }
    }, 15000);
  });

  describe('Utility Tools', () => {
    test('get_popular_apis should work', async () => {
      try {
        const result = await toolHandler.callTool('get_popular_apis', {
          limit: 5
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
        
        console.log(`✅ get_popular_apis: Found ${result.data.length} popular APIs`);
      } catch (error) {
        console.error(`❌ get_popular_apis failed:`, error);
        throw error;
      }
    }, 15000);

    test('get_recently_updated should work', async () => {
      try {
        const result = await toolHandler.callTool('get_recently_updated', {
          limit: 5
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
        
        console.log(`✅ get_recently_updated: Found ${result.data.length} recently updated APIs`);
      } catch (error) {
        console.error(`❌ get_recently_updated failed:`, error);
        throw error;
      }
    }, 15000);

    test('analyze_api_categories should work', async () => {
      try {
        const result = await toolHandler.callTool('analyze_api_categories', {}, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.categories).toBeDefined();
        expect(Array.isArray(result.categories)).toBe(true);
        
        console.log(`✅ analyze_api_categories: Found ${result.categories.length} categories`);
      } catch (error) {
        console.error(`❌ analyze_api_categories failed:`, error);
        throw error;
      }
    }, 15000);
  });

  describe('Cache Tools', () => {
    test('cache_stats should work', async () => {
      try {
        const result = await toolHandler.callTool('cache_stats', {}, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.keys).toBeDefined();
        expect(typeof result.keys).toBe('number');
        
        console.log(`✅ cache_stats: ${result.keys} cache keys`);
      } catch (error) {
        console.error(`❌ cache_stats failed:`, error);
        throw error;
      }
    }, 15000);

    test('cache_info should work', async () => {
      try {
        const result = await toolHandler.callTool('cache_info', {}, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        
        console.log(`✅ cache_info: Cache information retrieved`);
      } catch (error) {
        console.error(`❌ cache_info failed:`, error);
        throw error;
      }
    }, 15000);

    test('list_cache_keys should work', async () => {
      try {
        const result = await toolHandler.callTool('list_cache_keys', {}, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(Array.isArray(result.keys)).toBe(true);
        
        console.log(`✅ list_cache_keys: Found ${result.keys.length} cache keys`);
      } catch (error) {
        console.error(`❌ list_cache_keys failed:`, error);
        throw error;
      }
    }, 15000);

    test('clear_cache should work', async () => {
      try {
        const result = await toolHandler.callTool('clear_cache', {}, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        
        console.log(`✅ clear_cache: Cache cleared successfully`);
      } catch (error) {
        console.error(`❌ clear_cache failed:`, error);
        throw error;
      }
    }, 15000);

    test('clear_cache_key should work', async () => {
      try {
        // First add something to cache, then clear it
        await toolHandler.callTool('get_providers', {}, toolContext);
        
        const result = await toolHandler.callTool('clear_cache_key', {
          key: 'providers'
        }, toolContext);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        
        console.log(`✅ clear_cache_key: Specific cache key cleared`);
      } catch (error) {
        console.error(`❌ clear_cache_key failed:`, error);
        throw error;
      }
    }, 15000);
  });
});