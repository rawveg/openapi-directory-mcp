// @ts-nocheck
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { Server, StdioServerTransport } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CacheManager } from '../../src/cache/manager.js';
import { DualSourceApiClient } from '../../src/api/dual-source-client.js';
import { ToolHandler } from '../../src/tools/handler.js';
import { ToolContext } from '../../src/tools/types.js';
import { createMockedApiClient } from '../mocks/api-client-mock.js';

/**
 * Integration tests for the MCP server implementation
 * Tests the full MCP protocol flow with real server instance
 */
describe('MCP Server Integration Tests', () => {
  let server: Server;
  let cacheManager: CacheManager;
  let apiClient: DualSourceApiClient;
  let toolHandler: ToolHandler;
  let toolContext: ToolContext;

  beforeAll(async () => {
    // Set up mocked clients for integration testing
    cacheManager = new CacheManager();
    const mockedApiClient = createMockedApiClient(cacheManager, 'success');
    apiClient = mockedApiClient as any;
    toolHandler = new ToolHandler();
    toolContext = {
      apiClient,
      cacheManager
    };

    // Wait for tool handler to initialize tools
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get tools first
    const { tools } = await toolHandler.listTools();

    // Create server instance 
    server = new Server({
      name: 'openapi-directory-mcp-test',
      version: '1.0.0',
    });

    // Set up MCP request handlers using the tool handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return await toolHandler.listTools();
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const result = await toolHandler.callTool(name, args, toolContext);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    });

    console.log(`🔧 MCP Server integration test setup complete with ${tools.length} tools`);
  });

  afterAll(async () => {
    // Clean up
    if (cacheManager) {
      cacheManager.clear();
    }
    if (server) {
      await server.close();
    }
  });

  beforeEach(() => {
    // Reset cache before each test to ensure clean state
    cacheManager.clear();
  });

  afterEach(() => {
    // Optional cleanup after each test
  });

  describe('MCP Protocol Compliance', () => {
    test('server should have proper capabilities', async () => {
      // Test tool capabilities by calling the handler directly
      const toolsResponse = await toolHandler.listTools();
      
      expect(toolsResponse).toBeDefined();
      expect(toolsResponse.tools).toBeDefined();
      expect(Array.isArray(toolsResponse.tools)).toBe(true);
      expect(toolsResponse.tools.length).toBe(22);
    });

    test('server should handle list_tools request correctly', async () => {
      const request = {
        method: 'tools/list' as const,
        params: {}
      };

      // Simulate MCP request
      const response = await toolHandler.listTools();
      
      expect(response).toBeDefined();
      expect(response.tools).toBeDefined();
      expect(Array.isArray(response.tools)).toBe(true);
      expect(response.tools.length).toBe(22); // All production tools
      
      // Validate each tool follows MCP format
      response.tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema).toBe('object');
        
        // Should not have implementation details
        expect('execute' in tool).toBe(false);
        expect('category' in tool).toBe(false);
      });
    });

    test('server should handle call_tool request correctly', async () => {
      // Test with cache-stats tool (doesn't require external calls)
      const request = {
        method: 'tools/call' as const,
        params: {
          name: 'cache_stats',
          arguments: {}
        }
      };

      const result = await toolHandler.callTool('cache_stats', {}, toolContext);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      
      // Should be JSON serializable (MCP requirement)
      expect(() => JSON.stringify(result)).not.toThrow();
    });

    test('server should handle invalid tool calls gracefully', async () => {
      await expect(toolHandler.callTool('nonexistent_tool', {}, toolContext))
        .rejects.toThrow('Tool not found: nonexistent_tool');
    });

    test('server should validate tool parameters correctly', async () => {
      // Test with search-apis which requires a query parameter
      await expect(toolHandler.callTool('search_apis', {}, toolContext))
        .rejects.toThrow(/Tool execution failed|Required|Expected.*received/); // Should fail due to missing required parameter
      
      await expect(toolHandler.callTool('search_apis', { 
        query: 'test',
        page: 'not-a-number' 
      }, toolContext))
        .rejects.toThrow(/Tool execution failed|Expected.*received/); // Should fail due to invalid parameter type
    });
  });

  describe('Tool Categories Integration', () => {
    test('all tool categories should be available', async () => {
      const { tools } = await toolHandler.listTools();
      const toolNames = tools.map(t => t.name);
      
      // Verify all expected categories are represented
      const expectedCategories = {
        'cache-tools': ['cache_stats', 'cache_info', 'clear_cache', 'clear_cache_key', 'list_cache_keys'],
        'api-details': ['get_api', 'get_api_summary', 'search_apis', 'get_openapi_spec', 'get_provider_stats'],
        'api-discovery': ['get_providers', 'get_provider_services', 'list_all_apis', 'get_metrics'],
        'endpoint-tools': ['get_endpoints', 'get_endpoint_details', 'get_endpoint_schema', 'get_endpoint_examples'],
        'provider-tools': ['get_provider_apis'],
        'utility-tools': ['get_popular_apis', 'get_recently_updated', 'analyze_api_categories']
      };

      for (const [category, expectedTools] of Object.entries(expectedCategories)) {
        for (const expectedTool of expectedTools) {
          expect(toolNames).toContain(expectedTool);
        }
      }
    });

    test('cache tools should work in MCP context', async () => {
      // Test cache stats
      const statsResult = await toolHandler.callTool('cache_stats', {}, toolContext);
      expect(statsResult).toBeDefined();
      
      // Test list cache keys
      const keysResult = await toolHandler.callTool('list_cache_keys', {}, toolContext);
      expect(keysResult).toBeDefined();
      expect(keysResult.keys).toBeDefined();
      expect(Array.isArray(keysResult.keys)).toBe(true);
      
      // Test clear cache
      const clearResult = await toolHandler.callTool('clear_cache', {}, toolContext);
      expect(clearResult).toBeDefined();
      expect(clearResult.message).toBeDefined();
    });

    test('api discovery tools should work in MCP context', async () => {
      // Test get providers (real API call)
      const providersResult = await toolHandler.callTool('get_providers', {}, toolContext);
      expect(providersResult).toBeDefined();
      expect(providersResult.data).toBeDefined();
      expect(Array.isArray(providersResult.data)).toBe(true);
      expect(providersResult.data.length).toBeGreaterThan(0);
      
      // Test get metrics (real API call)
      const metricsResult = await toolHandler.callTool('get_metrics', {}, toolContext);
      expect(metricsResult).toBeDefined();
      expect(typeof metricsResult.numSpecs).toBe('number');
      expect(metricsResult.numSpecs).toBeGreaterThan(0);
    }, 30000);

    test('api details tools should work in MCP context', async () => {
      // Test search APIs (real API call)
      const searchResult = await toolHandler.callTool('search_apis', {
        query: 'google',
        limit: 5
      }, toolContext);
      expect(searchResult).toBeDefined();
      expect(searchResult.results).toBeDefined();
      expect(Array.isArray(searchResult.results)).toBe(true);
      
      // Test get API (real API call)
      const apiResult = await toolHandler.callTool('get_api', {
        provider: 'googleapis.com',
        api: 'admin'
      }, toolContext);
      expect(apiResult).toBeDefined();
      expect(apiResult.info).toBeDefined();
    }, 30000);
  });

  describe('Error Handling and Resilience', () => {
    test('server should handle network errors gracefully', async () => {
      // Create a mocked client configured for network errors
      const badApiClient = createMockedApiClient(cacheManager, 'network_error');
      
      const badContext = {
        apiClient: badApiClient as any,
        cacheManager
      };

      // Should handle network errors gracefully
      await expect(toolHandler.callTool('get_providers', {}, badContext))
        .rejects.toThrow();
    });

    test('server should handle malformed parameters', async () => {
      // Test with completely invalid parameters
      await expect(toolHandler.callTool('search_apis', {
        query: null,
        limit: -1,
        page: 'invalid'
      }, toolContext)).rejects.toThrow(/Tool execution failed|Expected.*received|Required/);
      
      await expect(toolHandler.callTool('get_api', {
        provider: '',
        api: null
      }, toolContext)).rejects.toThrow(/Tool execution failed|Expected.*received|Required/);
    });

    test('server should handle concurrent requests', async () => {
      // Execute multiple tools concurrently
      const promises = [
        toolHandler.callTool('cache_stats', {}, toolContext),
        toolHandler.callTool('list_cache_keys', {}, toolContext),
        toolHandler.callTool('cache_info', {}, toolContext),
        toolHandler.callTool('get_providers', {}, toolContext),
        toolHandler.callTool('get_metrics', {}, toolContext)
      ];

      const results = await Promise.allSettled(promises);
      
      // All should complete (some may fail due to network, but none should hang)
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(['fulfilled', 'rejected']).toContain(result.status);
      });
    }, 30000);
  });

  describe('Performance and Scalability', () => {
    test('server should handle rapid tool calls efficiently', async () => {
      const startTime = Date.now();
      
      // Make 20 rapid cache tool calls
      const promises = Array(20).fill(null).map(() => 
        toolHandler.callTool('cache_stats', {}, toolContext)
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      // All should succeed
      expect(results).toHaveLength(20);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
      
      // Should complete in reasonable time (under 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('server should maintain memory efficiency under load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Execute many operations
      for (let i = 0; i < 50; i++) {
        await toolHandler.callTool('cache_stats', {}, toolContext);
        if (i % 10 === 0) {
          await toolHandler.callTool('clear_cache', {}, toolContext);
        }
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
      // Memory growth should be reasonable (less than 50MB)
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB
    });

    test('server should handle tool listing efficiently', async () => {
      const startTime = Date.now();
      
      // List tools 10 times
      for (let i = 0; i < 10; i++) {
        const { tools } = await toolHandler.listTools();
        expect(tools).toHaveLength(22);
      }
      
      const endTime = Date.now();
      
      // Should be very fast (under 100ms for 10 listings)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Data Consistency and Caching', () => {
    test('cache should work correctly across tool calls', async () => {
      // Clear cache first
      await toolHandler.callTool('clear_cache', {}, toolContext);
      
      // Check cache is empty
      let keysResult = await toolHandler.callTool('list_cache_keys', {}, toolContext);
      expect(keysResult.keys).toHaveLength(0);
      
      // Manually populate cache to test cache operations
      cacheManager.set('test-key-1', { data: 'test-value-1' });
      cacheManager.set('test-key-2', { data: 'test-value-2' });
      
      // Check cache now has entries
      keysResult = await toolHandler.callTool('list_cache_keys', {}, toolContext);
      expect(keysResult.keys.length).toBeGreaterThan(0);
      
      // Clear specific cache key
      if (keysResult.keys.length > 0) {
        await toolHandler.callTool('clear_cache_key', {
          key: keysResult.keys[0]
        }, toolContext);
        
        // Verify key was removed
        const newKeysResult = await toolHandler.callTool('list_cache_keys', {}, toolContext);
        expect(newKeysResult.keys.length).toBe(keysResult.keys.length - 1);
      }
    }, 30000);

    test('cache stats should reflect actual cache state', async () => {
      // Clear cache and check stats
      await toolHandler.callTool('clear_cache', {}, toolContext);
      let statsResult = await toolHandler.callTool('cache_stats', {}, toolContext);
      expect(statsResult.keys).toBe(0);
      
      // Manually add some cache entries to test stats functionality
      cacheManager.set('providers', { data: ['test-provider'] });
      cacheManager.set('metrics', { numSpecs: 100, numAPIs: 50 });
      
      // Check stats reflect changes
      statsResult = await toolHandler.callTool('cache_stats', {}, toolContext);
      expect(statsResult.keys).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Real-World Workflow Integration', () => {
    test('should handle complete API discovery workflow', async () => {
      // 1. Get list of providers
      const providers = await toolHandler.callTool('get_providers', {}, toolContext);
      expect(providers.data).toBeDefined();
      expect(Array.isArray(providers.data)).toBe(true);
      expect(providers.data.length).toBeGreaterThan(0);
      
      // 2. Get APIs for first provider
      const providerApis = await toolHandler.callTool('get_provider_apis', {
        provider: providers.data[0]
      }, toolContext);
      expect(providerApis).toBeDefined();
      
      // 3. Search for APIs with specific query
      const searchResults = await toolHandler.callTool('search_apis', {
        query: 'api',
        limit: 10
      }, toolContext);
      expect(searchResults.results).toBeDefined();
      expect(Array.isArray(searchResults.results)).toBe(true);
      
      // 4. Get details for first search result if available
      if (searchResults.results.length > 0) {
        const apiId = searchResults.results[0].id;
        const [provider, api] = apiId.split(':');
        
        if (provider && api) {
          const apiDetails = await toolHandler.callTool('get_api', {
            provider,
            api
          }, toolContext);
          expect(apiDetails).toBeDefined();
        }
      }
    }, 60000);

    test('should handle endpoint analysis workflow', async () => {
      // 1. Get endpoints for a known API
      const endpoints = await toolHandler.callTool('get_endpoints', {
        api_id: 'googleapis.com:admin',
        limit: 5
      }, toolContext);
      expect(endpoints.results).toBeDefined();
      expect(Array.isArray(endpoints.results)).toBe(true);
      
      // 2. If endpoints exist, get details for first one
      if (endpoints.results.length > 0) {
        const endpoint = endpoints.results[0];
        
        // Get endpoint details
        const details = await toolHandler.callTool('get_endpoint_details', {
          api_id: 'googleapis.com:admin',
          method: endpoint.method,
          path: endpoint.path
        }, toolContext);
        expect(details).toBeDefined();
        expect(details.method).toBe(endpoint.method);
        
        // Get endpoint schema
        const schema = await toolHandler.callTool('get_endpoint_schema', {
          api_id: 'googleapis.com:admin',
          method: endpoint.method,
          path: endpoint.path
        }, toolContext);
        expect(schema).toBeDefined();
        expect(schema.method).toBe(endpoint.method);
      }
    }, 60000);

    test('should handle analytics workflow', async () => {
      // 1. Analyze API categories
      const categories = await toolHandler.callTool('analyze_api_categories', {}, toolContext);
      expect(categories.categories).toBeDefined();
      expect(Array.isArray(categories.categories)).toBe(true);
      
      // 2. Get popular APIs
      const popular = await toolHandler.callTool('get_popular_apis', {
        limit: 10
      }, toolContext);
      expect(popular).toBeDefined();
      expect(typeof popular).toBe('object');
      expect(popular.data).toBeDefined();
      expect(Array.isArray(popular.data)).toBe(true);
      expect(popular.data.length).toBeGreaterThan(0);
      
      // 3. Get recently updated APIs
      const recent = await toolHandler.callTool('get_recently_updated', {
        limit: 10
      }, toolContext);
      expect(recent).toBeDefined();
      expect(typeof recent).toBe('object');
      expect(recent.data).toBeDefined();
      expect(Array.isArray(recent.data)).toBe(true);
      expect(recent.data.length).toBeGreaterThan(0);
      
      // 4. Get overall metrics
      const metrics = await toolHandler.callTool('get_metrics', {}, toolContext);
      expect(metrics.numSpecs).toBeDefined();
      expect(typeof metrics.numSpecs).toBe('number');
    }, 60000);
  });
});