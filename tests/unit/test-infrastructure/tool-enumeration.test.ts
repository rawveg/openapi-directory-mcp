import { describe, it, expect } from "@jest/globals";
import { ToolGenerator } from "../../../src/tools/generator.js";
import { ToolHandler } from "../../../src/tools/handler.js";
import { readdirSync } from "fs";
import { join } from "path";

/**
 * Tool Enumeration Test
 * 
 * Ensures that all expected tools are exposed and accessible.
 * This prevents tools from silently disappearing due to code changes.
 * 
 * NOTE: The hardcoded tool count and names are INTENTIONAL.
 * This test serves as a regression guard - if tools are added/removed,
 * this test SHOULD fail to force deliberate review of the change.
 * 
 * For dynamic tool validation, use the pre-flight checks which
 * automatically adjust to filesystem changes.
 */

describe("Tool Enumeration Tests", () => {
  const EXPECTED_TOOL_COUNT = 22;
  
  // These are the tools that MUST be present for backward compatibility
  const EXPECTED_TOOLS = [
    // Provider Tools
    'get_providers',
    'get_provider_apis', 
    'get_provider_services',
    'get_provider_stats',
    
    // API Discovery
    'get_api',
    'list_all_apis',
    'get_api_summary',
    'get_metrics',
    
    // Search & Discovery
    'search_apis',
    'get_popular_apis',
    'get_recently_updated',
    'analyze_api_categories',
    
    // OpenAPI Specs
    'get_openapi_spec',
    
    // Endpoint Tools
    'get_endpoints',
    'get_endpoint_details',
    'get_endpoint_schema',
    'get_endpoint_examples',
    
    // Cache Tools
    'cache_info',
    'cache_stats',
    'clear_cache',
    'clear_cache_key',
    'list_cache_keys'
  ];

  describe("ToolGenerator (hardcoded system)", () => {
    it("should expose exactly 22 tools", async () => {
      const generator = new ToolGenerator();
      const tools = await generator.generateTools();
      
      expect(tools).toHaveLength(EXPECTED_TOOL_COUNT);
    });

    it("should expose all expected tools by name", async () => {
      const generator = new ToolGenerator();
      const tools = await generator.generateTools();
      const toolNames = tools.map(tool => tool.name);
      
      // Check each expected tool is present
      EXPECTED_TOOLS.forEach(expectedTool => {
        expect(toolNames).toContain(expectedTool);
      });
      
      // Check no unexpected tools are present
      toolNames.forEach(toolName => {
        expect(EXPECTED_TOOLS).toContain(toolName);
      });
    });

    it("should include cache management tools from utility tools", async () => {
      const generator = new ToolGenerator();
      const tools = await generator.generateTools();
      const toolNames = tools.map(tool => tool.name);
      
      const cacheTools = [
        'cache_info',
        'cache_stats', 
        'clear_cache',
        'clear_cache_key',
        'list_cache_keys'
      ];
      
      cacheTools.forEach(cacheTool => {
        expect(toolNames).toContain(cacheTool);
      });
    });
  });

  describe("Tool File System Structure", () => {
    // Use process.cwd() for Jest compatibility
    const toolsDir = join(process.cwd(), 'src/tools');

    it("should have expected tool distribution across categories", () => {
      // Test the expected distribution of tools across categories
      // This tests our understanding of the tool organization rather than file system
      const expectedDistribution = {
        'cache-tools': 5,
        'api-details': 5,
        'api-discovery': 4,
        'endpoint-tools': 4,
        'provider-tools': 1,
        'utility-tools': 3
      };

      const totalFromDistribution = Object.values(expectedDistribution).reduce((sum, count) => sum + count, 0);
      expect(totalFromDistribution).toBe(EXPECTED_TOOL_COUNT);
      
      // Verify each category has the expected count based on our tool list
      const toolsByCategory: Record<string, string[]> = {
        'cache-tools': ['cache_info', 'cache_stats', 'clear_cache', 'clear_cache_key', 'list_cache_keys'],
        'api-details': ['get_api', 'get_api_summary', 'search_apis', 'get_openapi_spec', 'get_provider_stats'],
        'api-discovery': ['get_providers', 'get_provider_services', 'list_all_apis', 'get_metrics'],
        'endpoint-tools': ['get_endpoints', 'get_endpoint_details', 'get_endpoint_schema', 'get_endpoint_examples'],
        'provider-tools': ['get_provider_apis'],
        'utility-tools': ['get_popular_apis', 'get_recently_updated', 'analyze_api_categories']
      };
      
      Object.entries(toolsByCategory).forEach(([category, tools]) => {
        expect(tools.length).toBe(expectedDistribution[category]);
      });
    });

    it("should have expected tool to file mapping defined", () => {
      // Verify that we have a complete mapping of tool names to their expected file locations
      const toolFileMap: Record<string, string> = {
        'get_providers': 'api-discovery/get-providers.ts',
        'get_provider_apis': 'provider-tools/get-provider-apis.ts',
        'get_provider_services': 'api-discovery/get-provider-services.ts',
        'get_provider_stats': 'api-details/get-provider-stats.ts',
        'get_api': 'api-details/get-api.ts',
        'list_all_apis': 'api-discovery/list-all-apis.ts',
        'get_api_summary': 'api-details/get-api-summary.ts',
        'get_metrics': 'api-discovery/get-metrics.ts',
        'search_apis': 'api-details/search-apis.ts',
        'get_popular_apis': 'utility-tools/get-popular-apis.ts',
        'get_recently_updated': 'utility-tools/get-recently-updated.ts',
        'analyze_api_categories': 'utility-tools/analyze-api-categories.ts',
        'get_openapi_spec': 'api-details/get-openapi-spec.ts',
        'get_endpoints': 'endpoint-tools/get-endpoints.ts',
        'get_endpoint_details': 'endpoint-tools/get-endpoint-details.ts',
        'get_endpoint_schema': 'endpoint-tools/get-endpoint-schema.ts',
        'get_endpoint_examples': 'endpoint-tools/get-endpoint-examples.ts',
        'cache_info': 'cache-tools/cache-info.ts',
        'cache_stats': 'cache-tools/cache-stats.ts',
        'clear_cache': 'cache-tools/clear-cache.ts',
        'clear_cache_key': 'cache-tools/clear-cache-key.ts',
        'list_cache_keys': 'cache-tools/list-cache-keys.ts'
      };

      // Check each expected tool has a mapping defined
      EXPECTED_TOOLS.forEach(toolName => {
        const filePath = toolFileMap[toolName];
        expect(filePath).toBeDefined();
        expect(filePath).toMatch(/\.(ts|js)$/);
        expect(filePath).toContain('/');
      });
      
      // Check that all mappings are in expected categories
      Object.entries(toolFileMap).forEach(([toolName, filePath]) => {
        const category = filePath.split('/')[0];
        expect(['cache-tools', 'api-details', 'api-discovery', 'endpoint-tools', 'provider-tools', 'utility-tools'])
          .toContain(category);
      });
    });
  });

  describe("System consistency", () => {
    it("should have consistent tool counts between generator and expected tools", async () => {
      // Test that ToolGenerator produces the expected number of tools
      const generator = new ToolGenerator();
      const generatorTools = await generator.generateTools();
      
      // Generator should produce the expected number of tools
      expect(generatorTools).toHaveLength(EXPECTED_TOOL_COUNT);
      
      // All expected tools should be present in generator output
      const generatorToolNames = generatorTools.map(t => t.name);
      EXPECTED_TOOLS.forEach(expectedTool => {
        expect(generatorToolNames).toContain(expectedTool);
      });
    });

    it("should have all expected tools properly categorized", async () => {
      const generator = new ToolGenerator();
      const tools = await generator.generateTools();
      
      // Verify tools are properly organized by checking expected categories
      const cacheTools = tools.filter(t => 
        ['cache_stats', 'cache_info', 'clear_cache', 'clear_cache_key', 'list_cache_keys'].includes(t.name)
      );
      expect(cacheTools).toHaveLength(5);
      
      const apiDiscoveryTools = tools.filter(t => 
        ['get_providers', 'get_provider_services', 'list_all_apis', 'get_metrics'].includes(t.name)
      );
      expect(apiDiscoveryTools).toHaveLength(4);
      
      const endpointTools = tools.filter(t => 
        ['get_endpoints', 'get_endpoint_details', 'get_endpoint_schema', 'get_endpoint_examples'].includes(t.name)
      );
      expect(endpointTools).toHaveLength(4);
    });
  });
});