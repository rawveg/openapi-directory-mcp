// @ts-nocheck
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { ToolDefinition, ToolContext, toMcpTool } from '../../src/tools/types.js';
import { ToolRegistry } from '../../src/tools/registry.js';

describe('Production Tools Feature Tests', () => {
  let mockContext: ToolContext;
  let registry: ToolRegistry;

  beforeEach(() => {
    mockContext = {
      apiClient: {
        getProviders: jest.fn(),
        getProvider: jest.fn(),
        getServices: jest.fn(),
        getAPI: jest.fn(),
        getServiceAPI: jest.fn(),
        listAPIs: jest.fn(),
        getMetrics: jest.fn(),
        hasAPI: jest.fn(),
        hasProvider: jest.fn(),
        getPaginatedAPIs: jest.fn(),
        searchAPIs: jest.fn(),
        getManifestManager: jest.fn(),
        invalidateCache: jest.fn(),
        getCustomSpecsSummary: jest.fn(),
        getProviderStats: jest.fn(),
        getAPISummaryById: jest.fn(),
        getPopularAPIs: jest.fn(),
        getRecentlyUpdatedAPIs: jest.fn(),
        getOpenAPISpec: jest.fn(),
        getAPIEndpoints: jest.fn(),
        getEndpointDetails: jest.fn(),
        getEndpointSchema: jest.fn(),
        getEndpointExamples: jest.fn(),
        primaryClient: {} as any,
        secondaryClient: {} as any,
        customClient: {} as any,
        cache: {} as any
      } as any,
      cacheManager: {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn(),
        getStats: jest.fn(),
        keys: jest.fn(),
        has: jest.fn(),
        getTtl: jest.fn(),
        getSize: jest.fn(),
        getMemoryUsage: jest.fn(),
        prune: jest.fn(),
        setEnabled: jest.fn(),
        isEnabled: jest.fn(),
        getConfig: jest.fn(),
        invalidatePattern: jest.fn(),
        invalidateKeys: jest.fn(),
        warmCache: jest.fn(),
        performHealthCheck: jest.fn()
      } as any
    };

    registry = new ToolRegistry();
  });

  describe('Tool Registry Functionality', () => {
    test('should manage tool registration and organization', () => {
      // Simulate registering production tool categories
      const productionCategories = [
        'cache-tools',
        'api-details',
        'api-discovery',
        'endpoint-tools',
        'provider-tools',
        'utility-tools'
      ];

      const toolsPerCategory = [5, 5, 4, 4, 1, 3]; // Expected counts for each category

      productionCategories.forEach((category, index) => {
        for (let i = 0; i < toolsPerCategory[index]; i++) {
          const tool: ToolDefinition = {
            name: `${category}_tool_${i}`,
            description: `Tool ${i} in ${category}`,
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string' }
              }
            },
            async execute(args, context) {
              return { category, toolIndex: i, input: args.input };
            }
          };
          registry.register(category, tool);
        }
      });

      // Verify registry organization matches production expectations
      expect(registry.getToolCount()).toBe(22); // Total expected tools
      expect(registry.getCategoryCount()).toBe(6);

      // Verify category counts
      expect(registry.getCategory('cache-tools')).toHaveLength(5);
      expect(registry.getCategory('api-details')).toHaveLength(5);
      expect(registry.getCategory('api-discovery')).toHaveLength(4);
      expect(registry.getCategory('endpoint-tools')).toHaveLength(4);
      expect(registry.getCategory('provider-tools')).toHaveLength(1);
      expect(registry.getCategory('utility-tools')).toHaveLength(3);

      // Verify categories list
      const categories = registry.getCategories();
      expect(categories).toEqual(expect.arrayContaining(productionCategories));
    });

    test('should handle tool lookup and retrieval efficiently', () => {
      // Register 22 tools matching production setup
      const toolNames = [
        'get_providers', 'get_provider_apis', 'get_provider_services', 'list_all_apis',
        'get_metrics', 'get_api', 'get_api_summary', 'search_apis', 'get_openapi_spec',
        'get_provider_stats', 'get_endpoints', 'get_endpoint_details', 'get_endpoint_schema',
        'get_endpoint_examples', 'get_popular_apis', 'get_recently_updated', 'analyze_api_categories',
        'cache_stats', 'cache_info', 'clear_cache', 'clear_cache_key', 'list_cache_keys'
      ];

      toolNames.forEach((name, index) => {
        const tool: ToolDefinition = {
          name,
          description: `Production tool: ${name}`,
          inputSchema: { type: 'object', properties: {} },
          async execute() { return { tool: name, index }; }
        };
        
        // Assign to appropriate category based on name pattern
        let category = 'misc';
        if (name.startsWith('cache_') || name.includes('cache')) category = 'cache-tools';
        else if (name.includes('endpoint')) category = 'endpoint-tools';
        else if (name.includes('provider')) category = 'provider-tools';
        else if (name.includes('popular') || name.includes('recently') || name.includes('analyze')) category = 'utility-tools';
        else if (name.includes('metrics') || name === 'list_all_apis') category = 'api-discovery';
        else category = 'api-details';
        
        registry.register(category, tool);
      });

      // Test rapid tool lookups
      const startTime = performance.now();
      
      toolNames.forEach(name => {
        const tool = registry.getTool(name);
        expect(tool).toBeDefined();
        expect(tool!.name).toBe(name);
      });
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(10); // Should be very fast

      // Test non-existent tool
      expect(registry.getTool('nonexistent_tool')).toBeUndefined();
    });

    test('should prevent duplicate tool registration', () => {
      const tool1: ToolDefinition = {
        name: 'duplicate_tool',
        description: 'First registration',
        inputSchema: {},
        async execute() { return { version: 1 }; }
      };

      const tool2: ToolDefinition = {
        name: 'duplicate_tool',
        description: 'Second registration',
        inputSchema: {},
        async execute() { return { version: 2 }; }
      };

      registry.register('category1', tool1);
      registry.register('category2', tool2);

      // Should only have the first tool
      expect(registry.getToolCount()).toBe(1);
      expect(registry.getTool('duplicate_tool')).toBe(tool1);
      expect(registry.getCategory('category2')).toHaveLength(0);
    });
  });

  describe('MCP Tool Conversion', () => {
    test('should convert tool definitions to MCP format correctly', () => {
      const toolDef: ToolDefinition = {
        name: 'test_mcp_tool',
        description: 'Test tool for MCP conversion',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Result limit', default: 10 }
          },
          required: ['query']
        },
        async execute(args, context) {
          return { query: args.query, limit: args.limit || 10 };
        }
      };

      const mcpTool = toMcpTool(toolDef);

      // Verify MCP format compliance
      expect(mcpTool.name).toBe('test_mcp_tool');
      expect(mcpTool.description).toBe('Test tool for MCP conversion');
      expect(mcpTool.inputSchema).toEqual(toolDef.inputSchema);

      // Should not include execute function in MCP format
      expect('execute' in mcpTool).toBe(false);
    });

    test('should handle complex input schemas in MCP format', () => {
      const complexTool: ToolDefinition = {
        name: 'complex_schema_tool',
        description: 'Tool with complex input schema',
        inputSchema: {
          type: 'object',
          properties: {
            stringField: { type: 'string', minLength: 1, maxLength: 100 },
            numberField: { type: 'number', minimum: 0, maximum: 1000 },
            arrayField: { 
              type: 'array', 
              items: { type: 'string' },
              minItems: 1,
              maxItems: 10 
            },
            enumField: { type: 'string', enum: ['option1', 'option2', 'option3'] },
            objectField: {
              type: 'object',
              properties: {
                nestedString: { type: 'string' },
                nestedNumber: { type: 'number' }
              },
              required: ['nestedString']
            }
          },
          required: ['stringField', 'numberField']
        },
        async execute() { return { success: true }; }
      };

      const mcpTool = toMcpTool(complexTool);

      // Verify complex schema is preserved
      expect(mcpTool.inputSchema.type).toBe('object');
      expect(mcpTool.inputSchema.properties.stringField.minLength).toBe(1);
      expect(mcpTool.inputSchema.properties.numberField.maximum).toBe(1000);
      expect(mcpTool.inputSchema.properties.arrayField.items.type).toBe('string');
      expect(mcpTool.inputSchema.properties.enumField.enum).toEqual(['option1', 'option2', 'option3']);
      expect(mcpTool.inputSchema.properties.objectField.properties.nestedString.type).toBe('string');
      expect(mcpTool.inputSchema.required).toEqual(['stringField', 'numberField']);
    });
  });

  describe('Tool Execution Patterns', () => {
    test('should handle typical API tool execution', async () => {
      const apiTool: ToolDefinition = {
        name: 'get_test_providers',
        description: 'Get list of test providers',
        inputSchema: { type: 'object', properties: {} },
        async execute(args, context) {
          return await context.apiClient.getProviders();
        }
      };

      // Mock API response
      (mockContext.apiClient.getProviders as jest.Mock).mockResolvedValue(['provider1', 'provider2']);

      const result = await apiTool.execute({}, mockContext);
      expect(result).toEqual(['provider1', 'provider2']);
      expect(mockContext.apiClient.getProviders).toHaveBeenCalled();
    });

    test('should handle cache tool execution', async () => {
      const cacheTool: ToolDefinition = {
        name: 'get_test_cache_stats',
        description: 'Get cache statistics',
        inputSchema: { type: 'object', properties: {} },
        async execute(args, context) {
          return context.cacheManager.getStats();
        }
      };

      // Mock cache response
      (mockContext.cacheManager.getStats as jest.Mock).mockReturnValue({
        hits: 150,
        misses: 25,
        keys: 42
      });

      const result = await cacheTool.execute({}, mockContext);
      expect(result).toEqual({ hits: 150, misses: 25, keys: 42 });
      expect(mockContext.cacheManager.getStats).toHaveBeenCalled();
    });

    test('should handle parameterized tool execution', async () => {
      const paramTool: ToolDefinition = {
        name: 'search_test_apis',
        description: 'Search APIs with parameters',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            provider: { type: 'string' },
            limit: { type: 'number', default: 20 }
          },
          required: ['query']
        },
        async execute(args, context) {
          const { z } = await import('zod');
          const schema = z.object({
            query: z.string(),
            provider: z.string().optional(),
            limit: z.number().optional().default(20)
          });
          const params = schema.parse(args);
          return await context.apiClient.searchAPIs(params.query, params.provider, 1, params.limit);
        }
      };

      // Mock API response
      (mockContext.apiClient.searchAPIs as jest.Mock).mockResolvedValue({
        results: [{ id: 'test-api', title: 'Test API' }],
        total: 1
      });

      const result = await paramTool.execute({ 
        query: 'test', 
        provider: 'example.com' 
      }, mockContext);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe('test-api');
      expect(mockContext.apiClient.searchAPIs).toHaveBeenCalledWith('test', 'example.com', 1, 20);
    });

    test('should handle tool execution errors gracefully', async () => {
      const errorTool: ToolDefinition = {
        name: 'error_prone_tool',
        description: 'Tool that can fail',
        inputSchema: { type: 'object', properties: {} },
        async execute(args, context) {
          throw new Error('Simulated tool error');
        }
      };

      await expect(errorTool.execute({}, mockContext))
        .rejects.toThrow('Simulated tool error');
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent tool registrations', () => {
      const tools: ToolDefinition[] = [];
      
      // Create 50 tools
      for (let i = 0; i < 50; i++) {
        tools.push({
          name: `concurrent_tool_${i}`,
          description: `Tool ${i}`,
          inputSchema: {},
          async execute() { return { id: i }; }
        });
      }

      // Register all tools (simulating concurrent registration)
      const startTime = performance.now();
      tools.forEach((tool, index) => {
        const category = `category_${Math.floor(index / 10)}`;
        registry.register(category, tool);
      });
      const endTime = performance.now();

      expect(registry.getToolCount()).toBe(50);
      expect(endTime - startTime).toBeLessThan(10); // Should be fast
    });

    test('should maintain performance with many category lookups', () => {
      // Register tools across 10 categories
      for (let cat = 0; cat < 10; cat++) {
        for (let tool = 0; tool < 5; tool++) {
          const toolDef: ToolDefinition = {
            name: `perf_tool_${cat}_${tool}`,
            description: `Tool ${tool} in category ${cat}`,
            inputSchema: {},
            async execute() { return { cat, tool }; }
          };
          registry.register(`category_${cat}`, toolDef);
        }
      }

      // Perform many category lookups
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        const categoryIndex = i % 10;
        const categoryTools = registry.getCategory(`category_${categoryIndex}`);
        expect(categoryTools).toHaveLength(5);
      }
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(5); // Should be very fast
    });
  });

  describe('Tool Interface Compliance', () => {
    test('should validate all tools have required properties', () => {
      const validTool: ToolDefinition = {
        name: 'valid_tool',
        description: 'A valid tool',
        inputSchema: { type: 'object', properties: {} },
        async execute() { return {}; }
      };

      // Test that tool has all required properties
      expect(typeof validTool.name).toBe('string');
      expect(validTool.name.length).toBeGreaterThan(0);
      expect(typeof validTool.description).toBe('string');
      expect(validTool.description.length).toBeGreaterThan(0);
      expect(typeof validTool.inputSchema).toBe('object');
      expect(typeof validTool.execute).toBe('function');
    });

    test('should handle tools with optional category assignment', () => {
      const tool: ToolDefinition = {
        name: 'category_test_tool',
        description: 'Tool for category testing',
        inputSchema: {},
        async execute() { return {}; }
      };

      // Initially no category
      expect(tool.category).toBeUndefined();

      // After registration, should have category
      registry.register('test-category', tool);
      expect(tool.category).toBe('test-category');
    });

    test('should handle tools with complex async execution', async () => {
      const asyncTool: ToolDefinition = {
        name: 'async_complex_tool',
        description: 'Tool with complex async operations',
        inputSchema: {
          type: 'object',
          properties: {
            delay: { type: 'number', default: 10 }
          }
        },
        async execute(args, context) {
          // Simulate multiple async operations
          const delay = args.delay || 10;
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          const providers = await context.apiClient.getProviders();
          const stats = context.cacheManager.getStats();
          
          return {
            providers,
            stats,
            executedAt: new Date().toISOString(),
            delay
          };
        }
      };

      // Mock responses
      (mockContext.apiClient.getProviders as jest.Mock).mockResolvedValue(['test-provider']);
      (mockContext.cacheManager.getStats as jest.Mock).mockReturnValue({ hits: 10, misses: 2 });

      const result = await asyncTool.execute({ delay: 5 }, mockContext);

      expect(result.providers).toEqual(['test-provider']);
      expect(result.stats).toEqual({ hits: 10, misses: 2 });
      expect(result.executedAt).toBeDefined();
      expect(result.delay).toBe(5);
    });
  });
});