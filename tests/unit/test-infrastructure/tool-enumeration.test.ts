import { describe, it, expect } from "@jest/globals";
import { ToolGenerator } from "../../../src/tools/generator.js";
import { ToolHandler } from "../../../src/tools/handler.js";

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

  describe.skip("ToolHandler (plugin system)", () => {
    // SKIPPED: ToolHandler dynamic imports don't work in Jest environment
    // The plugin system is tested via:
    // 1. Integration tests that run against the built server
    // 2. Pre-flight checks that validate tool exposure
    // 3. E2E tests in actual MCP client environments
    
    it("should expose exactly 22 tools", async () => {
      const handler = new ToolHandler();
      const result = await handler.listTools();
      const tools = result.tools;
      
      expect(tools).toHaveLength(EXPECTED_TOOL_COUNT);
    });

    it("should expose all expected tools by name", async () => {
      const handler = new ToolHandler();
      const result = await handler.listTools();
      const tools = result.tools;
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
  });

  describe("System consistency", () => {
    it.skip("should have identical tools in both hardcoded and plugin systems", async () => {
      // SKIPPED: ToolHandler dynamic imports don't work in Jest environment
      // This is tested via integration tests and pre-flight checks instead
      const generator = new ToolGenerator();
      const handler = new ToolHandler();
      
      const generatorTools = await generator.generateTools();
      const handlerResult = await handler.listTools();
      const handlerTools = handlerResult.tools;
      
      const generatorToolNames = generatorTools.map(t => t.name).sort();
      const handlerToolNames = handlerTools.map(t => t.name).sort();
      
      expect(generatorToolNames).toEqual(handlerToolNames);
    });
  });
});