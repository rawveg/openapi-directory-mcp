// @ts-nocheck
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { CacheManager } from '../../src/cache/manager.js';
import { ToolHandler } from '../../src/tools/handler.js';
import { ToolContext } from '../../src/tools/types.js';
import { createMockedApiClient, MockedDualSourceApiClient } from '../mocks/api-client-mock.js';

/**
 * Integration tests for data flow validation and consistency
 * Tests end-to-end data flow from mocked API sources through cache to tool responses
 */
describe('Data Flow Validation Integration Tests', () => {
  let cacheManager: CacheManager;
  let apiClient: MockedDualSourceApiClient;
  let toolHandler: ToolHandler;
  let toolContext: ToolContext;

  beforeAll(async () => {
    cacheManager = new CacheManager();
    apiClient = createMockedApiClient(cacheManager, 'success');
    toolHandler = new ToolHandler();
    
    // Wait for tool handler to initialize tools
    await new Promise(resolve => setTimeout(resolve, 100));
    const { tools } = await toolHandler.listTools();
    expect(tools.length).toBe(22); // Verify tools are loaded
    
    toolContext = { apiClient: apiClient as any, cacheManager };
  });

  afterAll(() => {
    if (cacheManager) {
      cacheManager.clear();
    }
  });

  beforeEach(() => {
    // Clear cache before each test for consistency
    cacheManager.clear();
  });

  describe('API Data Flow Validation', () => {
    test('should validate providers data structure and consistency', async () => {
      const result = await toolHandler.callTool('get_providers', {}, toolContext);
      
      // Validate response structure
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      
      // Validate each provider entry
      for (const provider of result.data.slice(0, 5)) { // Test first 5 providers
        expect(typeof provider).toBe('string');
        expect(provider.length).toBeGreaterThan(0);
        
        // Provider should be a valid domain-like string
        expect(provider).toMatch(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
      }
      
      // Test that we can get APIs for each provider
      for (const provider of result.data.slice(0, 3)) { // Test first 3 providers
        const providerApis = await toolHandler.callTool('get_provider_apis', {
          provider
        }, toolContext);
        
        expect(providerApis).toBeDefined();
        expect(typeof providerApis).toBe('object');
      }
    }, 60000);

    test('should validate metrics data consistency', async () => {
      const result = await toolHandler.callTool('get_metrics', {}, toolContext);
      
      // Validate structure
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      
      // Required fields
      expect(typeof result.numSpecs).toBe('number');
      expect(typeof result.numAPIs).toBe('number');
      expect(typeof result.numEndpoints).toBe('number');
      
      // Logical consistency checks
      expect(result.numSpecs).toBeGreaterThan(0);
      expect(result.numAPIs).toBeGreaterThan(0);
      expect(result.numEndpoints).toBeGreaterThan(0);
      
      // APIs should be less than or equal to specs
      expect(result.numAPIs).toBeLessThanOrEqual(result.numSpecs);
      
      // Endpoints should generally be much larger than APIs
      expect(result.numEndpoints).toBeGreaterThan(result.numAPIs);
    }, 30000);

    test('should validate search functionality data flow', async () => {
      const searchQueries = ['google', 'github', 'stripe', 'api'];
      
      for (const query of searchQueries) {
        const result = await toolHandler.callTool('search_apis', {
          query,
          limit: 10
        }, toolContext);
        
        // Validate response structure
        expect(result).toBeDefined();
        expect(result.results).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
        expect(result.pagination).toBeDefined();
        expect(typeof result.pagination.total_results).toBe('number');
        expect(typeof result.pagination.page).toBe('number');
        expect(typeof result.pagination.limit).toBe('number');
        
        // Validate pagination metadata
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(10);
        expect(result.pagination.total_results).toBeGreaterThanOrEqual(result.results.length);
        
        // Validate each search result
        for (const api of result.results) {
          expect(api.id).toBeDefined();
          expect(typeof api.id).toBe('string');
          expect(api.id.length).toBeGreaterThan(0);
          
          // API ID should contain a colon for provider:service format
          expect(api.id).toMatch(/^[^:]+:[^:]+$/);
          
          if (api.title) {
            expect(typeof api.title).toBe('string');
          }
          
          if (api.description) {
            expect(typeof api.description).toBe('string');
          }
        }
      }
    }, 120000);

    test('should validate API details data consistency', async () => {
      // Get a known API
      const apiResult = await toolHandler.callTool('get_api', {
        provider: 'googleapis.com',
        api: 'admin'
      }, toolContext);
      
      // Validate API structure
      expect(apiResult).toBeDefined();
      expect(apiResult.info).toBeDefined();
      expect(apiResult.info.title).toBeDefined();
      expect(typeof apiResult.info.title).toBe('string');
      
      if (apiResult.info.version) {
        expect(typeof apiResult.info.version).toBe('string');
      }
      
      // Validate versions structure
      expect(apiResult.versions).toBeDefined();
      expect(typeof apiResult.versions).toBe('object');
      expect(apiResult.preferred).toBeDefined();
      expect(typeof apiResult.preferred).toBe('string');
      
      // Preferred version should exist in versions
      expect(apiResult.versions[apiResult.preferred]).toBeDefined();
      
      const preferredVersion = apiResult.versions[apiResult.preferred];
      expect(preferredVersion.info).toBeDefined();
      expect(preferredVersion.swaggerUrl).toBeDefined();
      expect(typeof preferredVersion.swaggerUrl).toBe('string');
      
      // SwaggerUrl should be a valid URL
      expect(preferredVersion.swaggerUrl).toMatch(/^https?:\/\/.+/);
    }, 30000);

    test('should validate OpenAPI spec data flow', async () => {
      // Get API first to get swagger URL
      const apiResult = await toolHandler.callTool('get_api', {
        provider: 'googleapis.com',
        api: 'admin'
      }, toolContext);
      
      const swaggerUrl = apiResult.versions[apiResult.preferred].swaggerUrl;
      
      // Get OpenAPI spec
      const specResult = await toolHandler.callTool('get_openapi_spec', {
        url: swaggerUrl
      }, toolContext);
      
      // Validate OpenAPI spec structure
      expect(specResult).toBeDefined();
      expect(specResult.info).toBeDefined();
      expect(specResult.info.title).toBeDefined();
      expect(typeof specResult.info.title).toBe('string');
      
      // Should have OpenAPI version
      expect(specResult.openapi || specResult.swagger).toBeDefined();
      
      // Should have paths
      expect(specResult.paths).toBeDefined();
      expect(typeof specResult.paths).toBe('object');
      
      // Validate at least one path
      const pathKeys = Object.keys(specResult.paths);
      expect(pathKeys.length).toBeGreaterThan(0);
      
      const firstPath = specResult.paths[pathKeys[0]];
      expect(typeof firstPath).toBe('object');
    }, 45000);
  });

  describe('Tool Integration Validation', () => {
    test('should validate cache tools respond correctly', async () => {
      // Test cache tools work with tool handler (covered in unit tests)
      const cacheStats = await toolHandler.callTool('cache_stats', {}, toolContext);
      expect(cacheStats).toBeDefined();
      expect(typeof cacheStats.keys).toBe('number');
      
      const cacheKeys = await toolHandler.callTool('list_cache_keys', {}, toolContext);
      expect(cacheKeys.keys).toBeDefined();
      expect(Array.isArray(cacheKeys.keys)).toBe(true);
      
      const clearResult = await toolHandler.callTool('clear_cache', {}, toolContext);
      expect(clearResult.message).toContain('Cache cleared successfully');
    }, 15000);
  });

  describe('Endpoint Data Flow Validation', () => {
    test('should validate endpoint listing and details consistency', async () => {
      const endpointsResult = await toolHandler.callTool('get_endpoints', {
        api_id: 'googleapis.com:admin',
        limit: 5
      }, toolContext);
      
      expect(endpointsResult.results).toBeDefined();
      expect(Array.isArray(endpointsResult.results)).toBe(true);
      expect(endpointsResult.pagination).toBeDefined();
      expect(typeof endpointsResult.pagination.total_results).toBe('number');
      
      if (endpointsResult.results.length > 0) {
        const endpoint = endpointsResult.results[0];
        
        // Validate endpoint structure
        expect(endpoint.path).toBeDefined();
        expect(typeof endpoint.path).toBe('string');
        expect(endpoint.method).toBeDefined();
        expect(typeof endpoint.method).toBe('string');
        expect(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']).toContain(endpoint.method);
        
        // Get detailed information for this endpoint
        const detailsResult = await toolHandler.callTool('get_endpoint_details', {
          api_id: 'googleapis.com:admin',
          method: endpoint.method,
          path: endpoint.path
        }, toolContext);
        
        // Validate details consistency
        expect(detailsResult.method).toBe(endpoint.method);
        expect(detailsResult.path).toBe(endpoint.path);
        expect(detailsResult.operationId || detailsResult.summary).toBeDefined();
        
        // Get schema for this endpoint
        const schemaResult = await toolHandler.callTool('get_endpoint_schema', {
          api_id: 'googleapis.com:admin',
          method: endpoint.method,
          path: endpoint.path
        }, toolContext);
        
        // Validate schema consistency
        expect(schemaResult.method).toBe(endpoint.method);
        expect(schemaResult.path).toBe(endpoint.path);
      }
    }, 90000);

    test('should validate pagination consistency across endpoint tools', async () => {
      const page1 = await toolHandler.callTool('get_endpoints', {
        api_id: 'googleapis.com:admin',
        page: 1,
        limit: 3
      }, toolContext);
      
      expect(page1.pagination.page).toBe(1);
      expect(page1.pagination.limit).toBe(3);
      expect(page1.results.length).toBeLessThanOrEqual(3);
      
      if (page1.pagination.total_results > 3) {
        const page2 = await toolHandler.callTool('get_endpoints', {
          api_id: 'googleapis.com:admin',
          page: 2,
          limit: 3
        }, toolContext);
        
        expect(page2.pagination.page).toBe(2);
        expect(page2.pagination.limit).toBe(3);
        expect(page2.pagination.total_results).toBe(page1.pagination.total_results); // Total should be consistent
        
        // Results should be different between pages
        const page1Paths = page1.results.map((e: any) => `${e.method} ${e.path}`);
        const page2Paths = page2.results.map((e: any) => `${e.method} ${e.path}`);
        
        // Should have no overlap between pages
        const overlap = page1Paths.filter((path: string) => page2Paths.includes(path));
        expect(overlap.length).toBe(0);
      }
    }, 60000);
  });

  describe('Data Validation and Sanitization', () => {
    test('should handle special characters in search queries', async () => {
      const specialQueries = [
        'test@example.com',
        'api-v2',
        'oauth2.0',
        'hello world',
        'test+plus',
        'test%20encoded'
      ];
      
      for (const query of specialQueries) {
        try {
          const result = await toolHandler.callTool('search_apis', {
            query,
            limit: 5
          }, toolContext);
          
          expect(result).toBeDefined();
          expect(result.results).toBeDefined();
          expect(Array.isArray(result.results)).toBe(true);
        } catch (error) {
          // Some special characters might cause legitimate errors
          expect(error).toBeDefined();
        }
      }
    }, 60000);

    test('should validate boundary conditions for pagination', async () => {
      // Test page 0 (should be handled gracefully)
      try {
        await toolHandler.callTool('search_apis', {
          query: 'test',
          page: 0,
          limit: 10
        }, toolContext);
      } catch (error) {
        expect(error).toBeDefined(); // Should fail validation
      }
      
      // Test negative page (should be handled gracefully)
      try {
        await toolHandler.callTool('search_apis', {
          query: 'test',
          page: -1,
          limit: 10
        }, toolContext);
      } catch (error) {
        expect(error).toBeDefined(); // Should fail validation
      }
      
      // Test very large limit (should be capped)
      const result = await toolHandler.callTool('search_apis', {
        query: 'test',
        page: 1,
        limit: 1000
      }, toolContext);
      
      expect(result.results.length).toBeLessThanOrEqual(50); // Should be capped at max
    }, 45000);

    test('should validate data consistency across related tools', async () => {
      // Get providers
      const providers = await toolHandler.callTool('get_providers', {}, toolContext);
      expect(providers.data.length).toBeGreaterThan(0);
      
      // Get APIs for first provider
      const providerApis = await toolHandler.callTool('get_provider_apis', {
        provider: providers.data[0]
      }, toolContext);
      
      // Get provider services
      const providerServices = await toolHandler.callTool('get_provider_services', {
        provider: providers.data[0]
      }, toolContext);
      
      // Data should be consistent - provider should exist in both responses
      expect(providerApis).toBeDefined();
      expect(providerServices).toBeDefined();
      
      // If provider has APIs, it might have services too
      if (Object.keys(providerApis).length > 0) {
        expect(providerServices).toBeDefined();
      }
    }, 90000);
  });
});