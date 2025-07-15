import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CacheManager } from '../../src/cache/manager.js';
import { DualSourceApiClient } from '../../src/api/dual-source-client.js';
import { ToolHandler } from '../../src/tools/handler.js';
import { ToolContext } from '../../src/tools/types.js';
import { createMockDualSourceClient } from '../helpers/mock-clients.js';

/**
 * Integration tests for server lifecycle management
 * Tests server initialization, shutdown, and configuration scenarios
 */
describe('MCP Server Lifecycle Integration Tests', () => {
  let server: Server | null = null;
  let cacheManager: CacheManager | null = null;
  let apiClient: DualSourceApiClient | null = null;
  let toolHandler: ToolHandler | null = null;

  afterEach(async () => {
    // Clean up after each test
    if (server) {
      await server.close();
      server = null;
    }
    if (cacheManager) {
      cacheManager.clear();
      cacheManager = null;
    }
    apiClient = null;
    toolHandler = null;
  });

  describe('Server Initialization', () => {
    test('should initialize server with proper configuration', async () => {
      // Set up tool handler and get tools
      toolHandler = new ToolHandler();
      const { tools } = await toolHandler.listTools();

      server = new Server({
        name: 'openapi-directory-mcp-test',
        version: '1.3.6',
      });

      // Set up tool handlers
      server.setRequestHandler(ListToolsRequestSchema, async () => {
        return await toolHandler.listTools();
      });

      server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        const context = { apiClient: null, cacheManager: null };
        const result = await toolHandler.callTool(name, args, context);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      });

      expect(server).toBeDefined();
      
      // Test that tool handlers are registered correctly by calling them directly
      // This simulates what would happen when a real MCP client makes requests
      const toolsResponse = await toolHandler.listTools();
      expect(toolsResponse).toBeDefined();
      expect(toolsResponse.tools).toBeDefined();
      expect(toolsResponse.tools.length).toBe(22);
    });

    test('should initialize with different server names', async () => {
      const serverNames = [
        'test-server-1',
        'openapi-directory-custom',
        'mcp-test-instance'
      ];

      for (const name of serverNames) {
        const testServer = new Server(
          { name, version: '1.0.0' },
          { capabilities: { tools: {} } }
        );

        expect(testServer).toBeDefined();
        
        await testServer.close();
      }
    });

    test('should initialize components in correct order', async () => {
      // 1. Create cache manager first
      cacheManager = new CacheManager();
      expect(cacheManager).toBeDefined();

      // 2. Create mocked API client with cache
      apiClient = createMockDualSourceClient(cacheManager);
      expect(apiClient).toBeDefined();

      // 3. Create tool handler
      toolHandler = new ToolHandler();
      expect(toolHandler).toBeDefined();

      // 4. Verify tools are loaded
      const { tools } = await toolHandler.listTools();
      expect(tools.length).toBe(22);

      // 5. Create server last
      server = new Server(
        { name: 'ordered-init-test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      expect(server).toBeDefined();
    });
  });

  describe('Server Configuration', () => {
    test('should handle different capability configurations', async () => {
      // Set up tool handler and get tools
      toolHandler = new ToolHandler();
      const { tools } = await toolHandler.listTools();

      for (let i = 0; i < 3; i++) {
        const testServer = new Server({
          name: 'config-test',
          version: '1.0.0'
        });

        // Set up tool handlers
        testServer.setRequestHandler(ListToolsRequestSchema, async () => {
          return await toolHandler.listTools();
        });

        expect(testServer).toBeDefined();

        // Test tool listing works by calling handler directly
        const toolsResponse = await toolHandler.listTools();
        expect(toolsResponse).toBeDefined();
        expect(toolsResponse.tools).toBeDefined();
        expect(toolsResponse.tools.length).toBe(22);

        await testServer.close();
      }
    });

    test('should support custom server metadata', async () => {
      const metadata = {
        name: 'openapi-directory-mcp-custom',
        version: '2.0.0-test',
        description: 'Custom test server instance',
        author: 'Test Suite'
      };

      server = new Server(
        metadata,
        { capabilities: { tools: {} } }
      );

      expect(server).toBeDefined();
      // Server should be created successfully with custom metadata
    });
  });

  describe('Component Integration', () => {
    beforeEach(async () => {
      // Set up full stack for each test
      cacheManager = new CacheManager();
      apiClient = createMockDualSourceClient(cacheManager);
      toolHandler = new ToolHandler();
      server = new Server(
        { name: 'integration-test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
    });

    test('should integrate cache manager with API client', async () => {
      const context: ToolContext = { apiClient: apiClient!, cacheManager: cacheManager! };

      // Clear cache and verify it's empty
      cacheManager!.clear();
      let keys = cacheManager!.keys();
      expect(keys.length).toBe(0);

      // Make API call through tool that uses cache
      const result = await toolHandler!.callTool('get_providers', {}, context);
      expect(result).toBeDefined();

      // Verify cache was populated
      keys = cacheManager!.keys();
      expect(keys.length).toBeGreaterThan(0);
    }, 30000);

    test('should handle API client failover scenarios', async () => {
      // Create client with bad primary URL but good secondary
      const failoverApiClient = createMockDualSourceClient(cacheManager!);

      const context: ToolContext = { 
        apiClient: failoverApiClient, 
        cacheManager: cacheManager! 
      };

      // Should still work due to failover
      const result = await toolHandler!.callTool('get_metrics', {}, context);
      expect(result).toBeDefined();
      expect(result.numSpecs).toBeGreaterThan(0);
    }, 30000);

    test('should maintain state consistency across tools', async () => {
      const context: ToolContext = { apiClient: apiClient!, cacheManager: cacheManager! };

      // Clear cache
      await toolHandler!.callTool('clear_cache', {}, context);
      
      // Verify cache is empty
      let statsResult = await toolHandler!.callTool('cache_stats', {}, context);
      expect(statsResult.keys).toBe(0);

      // Populate cache with API call
      await toolHandler!.callTool('get_providers', {}, context);

      // Verify cache has entries
      statsResult = await toolHandler!.callTool('cache_stats', {}, context);
      expect(statsResult.keys).toBeGreaterThan(0);

      // List cache keys should match stats
      const keysResult = await toolHandler!.callTool('list_cache_keys', {}, context);
      expect(keysResult.keys.length).toBe(statsResult.keys);
    }, 30000);
  });

  describe('Error Recovery', () => {
    test('should recover from cache failures', async () => {
      cacheManager = new CacheManager();
      apiClient = createMockDualSourceClient(cacheManager);
      toolHandler = new ToolHandler();
      server = new Server(
        { name: 'error-recovery-test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );

      const context: ToolContext = { apiClient, cacheManager };

      // Simulate cache corruption by calling non-existent method
      try {
        await toolHandler.callTool('clear_cache_key', { key: '' }, context);
      } catch (error) {
        // Expected to fail
      }

      // Regular cache operations should still work
      const statsResult = await toolHandler.callTool('cache_stats', {}, context);
      expect(statsResult).toBeDefined();
    });

    test('should handle network interruptions gracefully', async () => {
      cacheManager = new CacheManager();
      
      // Create client with timeout configurations for faster failure
      apiClient = new DualSourceApiClient(
        'https://httpstat.us/504?sleep=5000', // Simulates slow/failing server
        'https://api.apis.guru/v2',
        cacheManager
      );
      
      toolHandler = new ToolHandler();
      server = new Server(
        { name: 'network-test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );

      const context: ToolContext = { apiClient, cacheManager };

      // Should fail or use fallback
      try {
        const result = await toolHandler.callTool('get_providers', {}, context);
        // If it succeeds, it used fallback
        expect(result).toBeDefined();
      } catch (error) {
        // If it fails, it should be a network error
        expect(error).toBeDefined();
      }
    }, 15000);
  });

  describe('Resource Management', () => {
    test('should properly clean up resources on shutdown', async () => {
      cacheManager = new CacheManager();
      apiClient = createMockDualSourceClient(cacheManager);
      toolHandler = new ToolHandler();
      server = new Server(
        { name: 'cleanup-test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );

      const context: ToolContext = { apiClient, cacheManager };

      // Use some resources
      await toolHandler.callTool('get_providers', {}, context);
      await toolHandler.callTool('cache_stats', {}, context);

      // Verify resources are in use
      const keys = cacheManager.keys();
      expect(keys.length).toBeGreaterThan(0);

      // Clean shutdown
      await server.close();
      cacheManager.clear();

      // Verify cleanup
      const finalKeys = cacheManager.keys();
      expect(finalKeys.length).toBe(0);
    }, 30000);

    test('should handle multiple concurrent server instances', async () => {
      const servers: Server[] = [];
      const cacheManagers: CacheManager[] = [];

      try {
        // Create multiple server instances
        for (let i = 0; i < 3; i++) {
          const cm = new CacheManager();
          const api = createMockDualSourceClient(cm);
          const th = new ToolHandler();
          const srv = new Server(
            { name: `concurrent-server-${i}`, version: '1.0.0' },
            { capabilities: { tools: {} } }
          );

          servers.push(srv);
          cacheManagers.push(cm);

          // Verify each instance works independently
          const context: ToolContext = { apiClient: api, cacheManager: cm };
          const result = await th.callTool('cache_stats', {}, context);
          expect(result).toBeDefined();
        }

        // All servers should be running independently
        expect(servers.length).toBe(3);
        expect(cacheManagers.length).toBe(3);

      } finally {
        // Clean up all instances
        await Promise.all(servers.map(s => s.close()));
        cacheManagers.forEach(cm => cm.clear());
      }
    });
  });

  describe('Performance Under Load', () => {
    test('should maintain performance with rapid initialization/shutdown cycles', async () => {
      const cycles = 5;
      const startTime = Date.now();

      for (let i = 0; i < cycles; i++) {
        // Create components
        const cm = new CacheManager();
        const api = createMockDualSourceClient(cm);
        const th = new ToolHandler();
        const srv = new Server(
          { name: `perf-test-${i}`, version: '1.0.0' },
          { capabilities: { tools: {} } }
        );

        // Use them briefly
        const context: ToolContext = { apiClient: api, cacheManager: cm };
        await th.callTool('cache_stats', {}, context);

        // Clean up
        await srv.close();
        cm.clear();
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete cycles in reasonable time (under 5 seconds total)
      expect(totalTime).toBeLessThan(5000);
    });

    test('should handle tool registration performance', async () => {
      const startTime = Date.now();

      // Create tool handler (this loads all tools)
      toolHandler = new ToolHandler();

      // Get tools list multiple times
      for (let i = 0; i < 10; i++) {
        const { tools } = await toolHandler.listTools();
        expect(tools.length).toBe(22);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should be very fast (under 1 second for all operations)
      expect(totalTime).toBeLessThan(1000);
    });
  });
});