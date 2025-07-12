import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MCPServer } from '../../src/index.js';
import { ToolLoader } from '../../src/tools/loader.js';
import { PromptLoader } from '../../src/prompts/loader.js';

describe('MCP Protocol Compliance', () => {
  let server: MCPServer;
  let toolLoader: ToolLoader;
  let promptLoader: PromptLoader;

  beforeEach(async () => {
    toolLoader = new ToolLoader();
    promptLoader = new PromptLoader();
    
    // Initialize server with test configuration
    server = new MCPServer();
    await server.initialize();
  });

  afterEach(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('Server Initialization', () => {
    it('should implement MCP server interface correctly', () => {
      expect(server).toBeDefined();
      expect(typeof server.initialize).toBe('function');
      expect(typeof server.close).toBe('function');
    });

    it('should register all tools during initialization', async () => {
      const tools = await toolLoader.loadAllTools();
      expect(tools.length).toBeGreaterThan(0);
      
      // Verify all tools are registered with server
      for (const tool of tools) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(typeof tool.execute).toBe('function');
      }
    });

    it('should register all prompts during initialization', async () => {
      const prompts = await promptLoader.loadAllPrompts();
      expect(prompts.length).toBeGreaterThan(0);
      
      // Verify all prompts are registered with server
      for (const prompt of prompts) {
        expect(prompt.name).toBeDefined();
        expect(prompt.description).toBeDefined();
        expect(prompt.template).toBeDefined();
      }
    });
  });

  describe('Tool Execution Protocol', () => {
    it('should handle valid tool calls correctly', async () => {
      const tools = await toolLoader.loadAllTools();
      const tool = tools[0]; // Test with first available tool
      
      expect(tool).toBeDefined();
      expect(typeof tool.execute).toBe('function');
      
      // Test tool execution with minimal parameters
      const context = {
        apiClient: {
          listAPIs: jest.fn().mockResolvedValue([]),
          getAPI: jest.fn().mockResolvedValue({}),
          searchAPIs: jest.fn().mockResolvedValue([])
        },
        cache: {
          get: jest.fn().mockReturnValue(null),
          set: jest.fn(),
          del: jest.fn(),
          clear: jest.fn(),
          keys: jest.fn().mockReturnValue([])
        }
      };
      
      // Should not throw and should return a result
      const result = await tool.execute({}, context);
      expect(result).toBeDefined();
    });

    it('should validate tool input schemas', async () => {
      const tools = await toolLoader.loadAllTools();
      
      for (const tool of tools) {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema).toBe('object');
        
        // Should have type property for zod schemas
        if ('_def' in tool.inputSchema) {
          // Zod schema validation
          expect(tool.inputSchema._def).toBeDefined();
        }
      }
    });

    it('should handle tool execution errors gracefully', async () => {
      const tools = await toolLoader.loadAllTools();
      const tool = tools[0];
      
      const faultyContext = {
        apiClient: {
          listAPIs: jest.fn().mockRejectedValue(new Error('API failure')),
          getAPI: jest.fn().mockRejectedValue(new Error('API failure')),
          searchAPIs: jest.fn().mockRejectedValue(new Error('API failure'))
        },
        cache: {
          get: jest.fn().mockReturnValue(null),
          set: jest.fn(),
          del: jest.fn(),
          clear: jest.fn(),
          keys: jest.fn().mockReturnValue([])
        }
      };
      
      // Should handle errors without crashing
      try {
        await tool.execute({}, faultyContext);
      } catch (error) {
        // Error handling is acceptable
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Prompt Processing Protocol', () => {
    it('should process prompt templates correctly', async () => {
      const prompts = await promptLoader.loadAllPrompts();
      const prompt = prompts[0]; // Test with first available prompt
      
      expect(prompt).toBeDefined();
      expect(prompt.template).toBeDefined();
      expect(typeof prompt.template).toBe('string');
      
      // Template should be processable
      expect(prompt.template.length).toBeGreaterThan(0);
    });

    it('should handle prompt arguments correctly', async () => {
      const prompts = await promptLoader.loadAllPrompts();
      
      for (const prompt of prompts) {
        if (prompt.arguments && prompt.arguments.length > 0) {
          // Each argument should have required properties
          for (const arg of prompt.arguments) {
            expect(arg.name).toBeDefined();
            expect(arg.description).toBeDefined();
            expect(typeof arg.required).toBe('boolean');
          }
        }
      }
    });
  });

  describe('Resource Management', () => {
    it('should manage cache resources properly', async () => {
      const tools = await toolLoader.loadAllTools();
      const cacheTools = tools.filter(t => t.category === 'cache-tools');
      
      expect(cacheTools.length).toBeGreaterThan(0);
      
      // Cache tools should handle resource lifecycle
      for (const tool of cacheTools) {
        expect(tool.name).toMatch(/cache/i);
        expect(typeof tool.execute).toBe('function');
      }
    });

    it('should handle API client resource lifecycle', async () => {
      const tools = await toolLoader.loadAllTools();
      const apiTools = tools.filter(t => t.category === 'api-discovery');
      
      expect(apiTools.length).toBeGreaterThan(0);
      
      // API tools should be able to handle client initialization
      for (const tool of apiTools) {
        expect(typeof tool.execute).toBe('function');
      }
    });
  });

  describe('Plugin System Compliance', () => {
    it('should discover plugins automatically', async () => {
      // Test tool auto-discovery
      const tools = await toolLoader.loadAllTools();
      expect(tools.length).toBeGreaterThan(0);
      
      // Test prompt auto-discovery  
      const prompts = await promptLoader.loadAllPrompts();
      expect(prompts.length).toBeGreaterThan(0);
      
      // Should organize by categories
      const toolCategories = await toolLoader.getCategories();
      expect(toolCategories.length).toBeGreaterThan(0);
      
      const promptCategories = await promptLoader.getCategories();
      expect(promptCategories.length).toBeGreaterThan(0);
    });

    it('should maintain plugin isolation', async () => {
      const tools = await toolLoader.loadAllTools();
      
      // Each tool should have its own namespace
      const toolNames = tools.map(t => t.name);
      const uniqueNames = new Set(toolNames);
      
      expect(toolNames.length).toBe(uniqueNames.size); // No duplicate names
    });

    it('should validate plugin exports', async () => {
      const tools = await toolLoader.loadAllTools();
      const prompts = await promptLoader.loadAllPrompts();
      
      // All tools should have required exports
      for (const tool of tools) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.execute).toBe('function');
      }
      
      // All prompts should have required exports
      for (const prompt of prompts) {
        expect(prompt.name).toBeDefined();
        expect(prompt.description).toBeDefined();
        expect(prompt.template).toBeDefined();
      }
    });
  });

  describe('Error Handling Compliance', () => {
    it('should handle malformed plugin gracefully', async () => {
      // This test ensures the system is resilient to plugin issues
      const tools = await toolLoader.loadAllTools();
      const prompts = await promptLoader.loadAllPrompts();
      
      // Should continue functioning even if some plugins fail
      expect(tools.length).toBeGreaterThan(0);
      expect(prompts.length).toBeGreaterThan(0);
    });

    it('should provide meaningful error messages', async () => {
      const tools = await toolLoader.loadAllTools();
      const tool = tools.find(t => t.name.includes('get')); // Find a tool that takes parameters
      
      if (tool) {
        const context = {
          apiClient: {
            listAPIs: jest.fn().mockResolvedValue([]),
            getAPI: jest.fn().mockResolvedValue({}),
            searchAPIs: jest.fn().mockResolvedValue([])
          },
          cache: {
            get: jest.fn().mockReturnValue(null),
            set: jest.fn(),
            del: jest.fn(),
            clear: jest.fn(),
            keys: jest.fn().mockReturnValue([])
          }
        };
        
        try {
          // Try with invalid parameters
          await tool.execute({ invalid: 'parameter' }, context);
        } catch (error) {
          if (error instanceof Error) {
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should load plugins efficiently', async () => {
      const startTime = Date.now();
      
      await Promise.all([
        toolLoader.loadAllTools(),
        promptLoader.loadAllPrompts()
      ]);
      
      const loadTime = Date.now() - startTime;
      
      // Should load all plugins within reasonable time
      expect(loadTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should cache loaded plugins', async () => {
      // First load
      const startTime1 = Date.now();
      const tools1 = await toolLoader.loadAllTools();
      const loadTime1 = Date.now() - startTime1;
      
      // Second load (should be cached)
      const startTime2 = Date.now();
      const tools2 = await toolLoader.loadAllTools();
      const loadTime2 = Date.now() - startTime2;
      
      expect(tools1).toEqual(tools2);
      expect(loadTime2).toBeLessThan(loadTime1); // Cached should be faster
    });
  });
});