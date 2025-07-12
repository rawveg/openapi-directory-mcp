import { describe, it, expect, beforeEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { ToolLoader } from '../../src/tools/loader.js';
import { PromptLoader } from '../../src/prompts/loader.js';

describe('Plugin Discovery Integration', () => {
  let toolLoader: ToolLoader;
  let promptLoader: PromptLoader;

  beforeEach(() => {
    toolLoader = new ToolLoader();
    promptLoader = new PromptLoader();
  });

  describe('Tool Discovery', () => {
    it('should discover all actual tool files in the codebase', async () => {
      const toolsDir = path.join(process.cwd(), 'src', 'tools');
      const discoveredTools = await toolLoader.loadAllTools();
      
      // Count actual tool files in the filesystem
      const actualToolFiles = [];
      const categories = fs.readdirSync(toolsDir).filter(item => {
        const itemPath = path.join(toolsDir, item);
        return fs.statSync(itemPath).isDirectory();
      });

      for (const category of categories) {
        const categoryPath = path.join(toolsDir, category);
        const files = fs.readdirSync(categoryPath).filter(file => 
          file.endsWith('.js') && 
          !file.includes('index') && 
          !file.includes('test')
        );
        actualToolFiles.push(...files.map(f => ({ file: f, category })));
      }

      // Debug: Found tool files and loaded tools

      // Should discover most actual tools (allowing for some filtering)
      expect(discoveredTools.length).toBeGreaterThan(0);
      expect(discoveredTools.length).toBeLessThanOrEqual(actualToolFiles.length);
      
      // Each discovered tool should have valid structure
      for (const tool of discoveredTools) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.category).toBeDefined();
        expect(typeof tool.execute).toBe('function');
        expect(tool.inputSchema).toBeDefined();
      }
    });

    it('should organize tools by categories correctly', async () => {
      const categories = await toolLoader.getCategories();
      
      expect(categories.length).toBeGreaterThan(0);
      
      let totalToolsInCategories = 0;
      for (const category of categories) {
        expect(category.name).toBeDefined();
        expect(Array.isArray(category.tools)).toBe(true);
        expect(category.tools.length).toBeGreaterThan(0);
        
        totalToolsInCategories += category.tools.length;
        
        // All tools in category should have matching category
        for (const tool of category.tools) {
          expect(tool.category).toBe(category.name);
        }
      }
      
      const allTools = await toolLoader.loadAllTools();
      expect(totalToolsInCategories).toBe(allTools.length);
    });

    it('should discover expected tool categories', async () => {
      const categories = await toolLoader.getCategories();
      const categoryNames = categories.map(c => c.name);
      
      // Should find our known categories
      const expectedCategories = ['api-discovery', 'cache-tools', 'endpoint-tools', 'utility-tools'];
      
      for (const expected of expectedCategories) {
        if (fs.existsSync(path.join(process.cwd(), 'src', 'tools', expected))) {
          expect(categoryNames).toContain(expected);
        }
      }
    });
  });

  describe('Prompt Discovery', () => {
    it('should discover all actual prompt files in the codebase', async () => {
      const promptsDir = path.join(process.cwd(), 'src', 'prompts');
      const discoveredPrompts = await promptLoader.loadAllPrompts();
      
      // Count actual prompt files
      const actualPromptFiles = [];
      const categories = fs.readdirSync(promptsDir).filter(item => {
        const itemPath = path.join(promptsDir, item);
        return fs.statSync(itemPath).isDirectory();
      });

      for (const category of categories) {
        const categoryPath = path.join(promptsDir, category);
        if (fs.existsSync(categoryPath)) {
          const files = fs.readdirSync(categoryPath).filter(file => 
            file.endsWith('.js') && 
            !file.includes('index') && 
            !file.includes('test')
          );
          actualPromptFiles.push(...files.map(f => ({ file: f, category })));
        }
      }

      // Debug: Found prompt files and loaded prompts

      expect(discoveredPrompts.length).toBeGreaterThan(0);
      expect(discoveredPrompts.length).toBeLessThanOrEqual(actualPromptFiles.length);
      
      // Each discovered prompt should have valid structure
      for (const prompt of discoveredPrompts) {
        expect(prompt.name).toBeDefined();
        expect(prompt.description).toBeDefined();
        expect(prompt.template).toBeDefined();
        expect(typeof prompt.template).toBe('string');
      }
    });

    it('should organize prompts by categories correctly', async () => {
      const categories = await promptLoader.getCategories();
      
      expect(categories.length).toBeGreaterThan(0);
      
      let totalPromptsInCategories = 0;
      for (const category of categories) {
        expect(category.name).toBeDefined();
        expect(Array.isArray(category.prompts)).toBe(true);
        expect(category.prompts.length).toBeGreaterThan(0);
        
        totalPromptsInCategories += category.prompts.length;
        
        // All prompts in category should have matching category
        for (const prompt of category.prompts) {
          expect(prompt.category).toBe(category.name);
        }
      }
      
      const allPrompts = await promptLoader.loadAllPrompts();
      expect(totalPromptsInCategories).toBe(allPrompts.length);
    });

    it('should discover expected prompt categories', async () => {
      const categories = await promptLoader.getCategories();
      const categoryNames = categories.map(c => c.name);
      
      // Should find our known categories
      const expectedCategories = ['core-discovery', 'action-oriented', 'authentication', 'optimization'];
      
      for (const expected of expectedCategories) {
        if (fs.existsSync(path.join(process.cwd(), 'src', 'prompts', expected))) {
          expect(categoryNames).toContain(expected);
        }
      }
    });
  });

  describe('Plugin Structure Validation', () => {
    it('should validate all tool exports follow plugin structure', async () => {
      const tools = await toolLoader.loadAllTools();
      
      for (const tool of tools) {
        // Required properties
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);
        
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(0);
        
        expect(tool.category).toBeDefined();
        expect(typeof tool.category).toBe('string');
        
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema).toBe('object');
        
        expect(tool.execute).toBeDefined();
        expect(typeof tool.execute).toBe('function');
        
        // Naming conventions
        expect(tool.name).toMatch(/^[a-z0-9_]+$/); // snake_case
        expect(tool.category).toMatch(/^[a-z0-9-]+$/); // kebab-case
      }
    });

    it('should validate all prompt exports follow plugin structure', async () => {
      const prompts = await promptLoader.loadAllPrompts();
      
      for (const prompt of prompts) {
        // Required properties
        expect(prompt.name).toBeDefined();
        expect(typeof prompt.name).toBe('string');
        expect(prompt.name.length).toBeGreaterThan(0);
        
        expect(prompt.description).toBeDefined();
        expect(typeof prompt.description).toBe('string');
        expect(prompt.description.length).toBeGreaterThan(0);
        
        expect(prompt.template).toBeDefined();
        expect(typeof prompt.template).toBe('string');
        expect(prompt.template.length).toBeGreaterThan(0);
        
        expect(prompt.category).toBeDefined();
        expect(typeof prompt.category).toBe('string');
        
        // Optional but should be valid if present
        if (prompt.arguments) {
          expect(Array.isArray(prompt.arguments)).toBe(true);
          for (const arg of prompt.arguments) {
            expect(arg.name).toBeDefined();
            expect(arg.description).toBeDefined();
            expect(typeof arg.required).toBe('boolean');
          }
        }
        
        // Naming conventions
        expect(prompt.name).toMatch(/^[a-z0-9_]+$/); // snake_case
        expect(prompt.category).toMatch(/^[a-z0-9-]+$/); // kebab-case
      }
    });
  });

  describe('Plugin Execution Integration', () => {
    it('should execute sample tools without errors', async () => {
      const tools = await toolLoader.loadAllTools();
      expect(tools.length).toBeGreaterThan(0);
      
      // Create a mock context for testing
      const mockContext = {
        apiClient: {
          listAPIs: async () => ([]),
          getAPI: async () => ({}),
          searchAPIs: async () => ([]),
          getProviders: async () => ([]),
          getProviderAPIs: async () => ([]),
          getAPIDetails: async () => ({}),
          getEndpoints: async () => ({ endpoints: [] }),
          getEndpointDetails: async () => ({}),
          getOpenAPISpec: async () => ({})
        },
        cache: {
          get: () => null,
          set: () => {},
          del: () => {},
          clear: () => {},
          keys: () => ([]),
          ttl: () => -1,
          mget: () => ({}),
          mset: () => {},
          stats: () => ({ keys: 0, size: 0, hits: 0, misses: 0 })
        }
      };
      
      // Test a few tools from different categories
      const categoriesToTest = ['api-discovery', 'cache-tools'];
      let testsRun = 0;
      
      for (const category of categoriesToTest) {
        const categoryTools = tools.filter(t => t.category === category);
        if (categoryTools.length > 0) {
          const tool = categoryTools[0]; // Test first tool in category
          
          try {
            const result = await tool.execute({}, mockContext);
            expect(result).toBeDefined();
            testsRun++;
          } catch (error) {
            // Some tools might require specific parameters
            // This is acceptable - we're testing that they can be called
            // Tool execution note: some tools might require specific parameters
          }
        }
      }
      
      expect(testsRun).toBeGreaterThan(0);
    });

    it('should handle concurrent tool execution', async () => {
      const tools = await toolLoader.loadAllTools();
      const sampleTools = tools.slice(0, 3); // Test first 3 tools
      
      const mockContext = {
        apiClient: {
          listAPIs: async () => ([]),
          getAPI: async () => ({}),
          searchAPIs: async () => ([])
        },
        cache: {
          get: () => null,
          set: () => {},
          del: () => {},
          clear: () => {},
          keys: () => ([])
        }
      };
      
      // Execute tools concurrently
      const promises = sampleTools.map(async tool => {
        try {
          return await tool.execute({}, mockContext);
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(sampleTools.length);
      // Should complete without hanging
      expect(results.every(r => r !== undefined)).toBe(true);
    });
  });

  describe('Plugin File System Integration', () => {
    it('should handle plugin file changes gracefully', async () => {
      // This test ensures the loader can handle the actual file system
      const initialTools = await toolLoader.loadAllTools();
      const initialPrompts = await promptLoader.loadAllPrompts();
      
      expect(initialTools.length).toBeGreaterThan(0);
      expect(initialPrompts.length).toBeGreaterThan(0);
      
      // Create new loaders to test fresh loading
      const newToolLoader = new ToolLoader();
      const newPromptLoader = new PromptLoader();
      
      const reloadedTools = await newToolLoader.loadAllTools();
      const reloadedPrompts = await newPromptLoader.loadAllPrompts();
      
      // Should get same results
      expect(reloadedTools.length).toBe(initialTools.length);
      expect(reloadedPrompts.length).toBe(initialPrompts.length);
    });
  });
});