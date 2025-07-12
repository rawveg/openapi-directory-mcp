import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { ToolLoader } from '../../../src/tools/loader.js';
import { createMockTool, createTestContext } from '../../helpers/plugin-fixtures.js';

// Mock filesystem operations
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ToolLoader', () => {
  let toolLoader: ToolLoader;
  const testToolsDir = path.join(process.cwd(), 'src', 'tools');

  beforeEach(() => {
    toolLoader = new ToolLoader();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('loadAllTools', () => {
    it('should load tools from all category folders', async () => {
      // Mock directory structure
      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === testToolsDir) {
          return ['api-discovery', 'cache-tools', 'endpoint-tools', 'loader.ts', 'types.ts'] as any;
        }
        if (dirPath === path.join(testToolsDir, 'api-discovery')) {
          return ['get-providers.js', 'list-all-apis.js'] as any;
        }
        if (dirPath === path.join(testToolsDir, 'cache-tools')) {
          return ['cache-stats.js'] as any;
        }
        if (dirPath === path.join(testToolsDir, 'endpoint-tools')) {
          return ['get-endpoints.js'] as any;
        }
        return [] as any;
      });

      mockFs.statSync.mockImplementation((dirPath) => ({
        isDirectory: () => !dirPath.toString().endsWith('.ts') && !dirPath.toString().endsWith('.js')
      }) as any);

      mockFs.existsSync.mockReturnValue(true);

      // Mock dynamic imports
      const mockTools = {
        'get-providers': createMockTool('get_providers', 'api-discovery'),
        'list-all-apis': createMockTool('list_all_apis', 'api-discovery'),
        'cache-stats': createMockTool('cache_stats', 'cache-tools'),
        'get-endpoints': createMockTool('get_endpoints', 'endpoint-tools')
      };

      global.import = jest.fn().mockImplementation((modulePath: string) => {
        const fileName = path.basename(modulePath, '.js');
        const toolKey = fileName as keyof typeof mockTools;
        
        if (mockTools[toolKey]) {
          return Promise.resolve({
            tool: mockTools[toolKey],
            default: mockTools[toolKey]
          });
        }
        return Promise.reject(new Error(`Module not found: ${modulePath}`));
      }) as any;

      const tools = await toolLoader.loadAllTools();

      expect(tools).toHaveLength(4);
      expect(tools.map(t => t.name)).toContain('get_providers');
      expect(tools.map(t => t.name)).toContain('list_all_apis');
      expect(tools.map(t => t.name)).toContain('cache_stats');
      expect(tools.map(t => t.name)).toContain('get_endpoints');

      // Check category assignment
      const getProvidersool = tools.find(t => t.name === 'get_providers');
      expect(getProvidersool?.category).toBe('api-discovery');
    });

    it('should prevent duplicate loading', async () => {
      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === testToolsDir) {
          return ['test-category'] as any;
        }
        return ['test-tool.js'] as any;
      });

      mockFs.statSync.mockImplementation(() => ({
        isDirectory: () => true
      }) as any);

      mockFs.existsSync.mockReturnValue(true);

      const mockTool = createMockTool('test_tool', 'test-category');
      global.import = jest.fn().mockResolvedValue({
        tool: mockTool,
        default: mockTool
      }) as any;

      // First load
      const tools1 = await toolLoader.loadAllTools();
      // Second load (should not reload)
      const tools2 = await toolLoader.loadAllTools();

      expect(tools1).toEqual(tools2);
      expect(global.import).toHaveBeenCalledTimes(1);
    });

    it('should filter files correctly', async () => {
      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === testToolsDir) {
          return ['test-category'] as any;
        }
        return [
          'valid-tool.js',      // Should be loaded
          'invalid.ts',         // Should be ignored (source file)
          'type.d.ts',         // Should be ignored (type definition)
          'index.js',          // Should be ignored (index file)
          'README.md'          // Should be ignored (not JS)
        ] as any;
      });

      mockFs.statSync.mockImplementation(() => ({
        isDirectory: () => true
      }) as any);

      mockFs.existsSync.mockReturnValue(true);

      const mockTool = createMockTool('valid_tool', 'test-category');
      global.import = jest.fn().mockResolvedValue({
        tool: mockTool,
        default: mockTool
      }) as any;

      await toolLoader.loadAllTools();

      // Should only try to import valid-tool.js
      expect(global.import).toHaveBeenCalledTimes(1);
      expect(global.import).toHaveBeenCalledWith(
        expect.stringContaining('valid-tool.js')
      );
    });

    it('should handle tool execution context correctly', async () => {
      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === testToolsDir) {
          return ['test-category'] as any;
        }
        return ['executable-tool.js'] as any;
      });

      mockFs.statSync.mockImplementation(() => ({
        isDirectory: () => true
      }) as any);

      mockFs.existsSync.mockReturnValue(true);

      const mockTool = createMockTool('executable_tool', 'test-category');
      global.import = jest.fn().mockResolvedValue({
        tool: mockTool,
        default: mockTool
      }) as any;

      const tools = await toolLoader.loadAllTools();
      const tool = tools[0];

      // Test tool execution
      const context = createTestContext();
      const result = await tool.execute({ test_param: 'value' }, context);

      expect(result).toEqual({
        tool: 'executable_tool',
        category: 'test-category',
        input: { test_param: 'value' },
        success: true
      });
    });
  });

  describe('getTool', () => {
    it('should retrieve specific tool by name', async () => {
      const mockTool = createMockTool('specific_tool');
      
      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === testToolsDir) {
          return ['test-category'] as any;
        }
        return ['specific-tool.js'] as any;
      });

      mockFs.statSync.mockImplementation(() => ({
        isDirectory: () => true
      }) as any);

      mockFs.existsSync.mockReturnValue(true);

      global.import = jest.fn().mockResolvedValue({
        tool: mockTool,
        default: mockTool
      }) as any;

      await toolLoader.loadAllTools();
      const retrievedTool = await toolLoader.getTool('specific_tool');

      expect(retrievedTool).toEqual(mockTool);
    });

    it('should return undefined for non-existent tool', async () => {
      const tool = await toolLoader.getTool('non_existent');
      expect(tool).toBeUndefined();
    });
  });

  describe('getCategories', () => {
    it('should return tools organized by category', async () => {
      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === testToolsDir) {
          return ['category1', 'category2'] as any;
        }
        if (dirPath === path.join(testToolsDir, 'category1')) {
          return ['tool1.js'] as any;
        }
        if (dirPath === path.join(testToolsDir, 'category2')) {
          return ['tool2.js', 'tool3.js'] as any;
        }
        return [] as any;
      });

      mockFs.statSync.mockImplementation(() => ({
        isDirectory: () => true
      }) as any);

      mockFs.existsSync.mockReturnValue(true);

      global.import = jest.fn().mockImplementation((modulePath: string) => {
        const fileName = path.basename(modulePath, '.js');
        return Promise.resolve({
          tool: createMockTool(fileName.replace(/-/g, '_')),
          default: createMockTool(fileName.replace(/-/g, '_'))
        });
      }) as any;

      const categories = await toolLoader.getCategories();

      expect(categories).toHaveLength(2);
      expect(categories.find(c => c.name === 'category1')?.tools).toHaveLength(1);
      expect(categories.find(c => c.name === 'category2')?.tools).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should handle malformed tool files gracefully', async () => {
      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === testToolsDir) {
          return ['test-category'] as any;
        }
        return ['malformed.js'] as any;
      });

      mockFs.statSync.mockImplementation(() => ({
        isDirectory: () => true
      }) as any);

      mockFs.existsSync.mockReturnValue(true);

      // Mock a malformed import (missing execute function)
      global.import = jest.fn().mockResolvedValue({
        tool: { 
          name: 'incomplete',
          description: 'Incomplete tool'
          // Missing inputSchema and execute
        },
        default: { name: 'incomplete' }
      }) as any;

      const tools = await toolLoader.loadAllTools();
      expect(tools).toHaveLength(0); // Malformed tool should be filtered out
    });

    it('should handle import errors gracefully', async () => {
      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === testToolsDir) {
          return ['test-category'] as any;
        }
        return ['failing.js'] as any;
      });

      mockFs.statSync.mockImplementation(() => ({
        isDirectory: () => true
      }) as any);

      mockFs.existsSync.mockReturnValue(true);

      global.import = jest.fn().mockRejectedValue(new Error('Import failed')) as any;

      const tools = await toolLoader.loadAllTools();
      expect(tools).toHaveLength(0);
    });

    it('should handle missing directories gracefully', async () => {
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const tools = await toolLoader.loadAllTools();
      expect(tools).toHaveLength(0);
    });
  });

  describe('tool validation', () => {
    it('should validate tool structure', async () => {
      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === testToolsDir) {
          return ['test-category'] as any;
        }
        return ['valid-tool.js', 'invalid-tool.js'] as any;
      });

      mockFs.statSync.mockImplementation(() => ({
        isDirectory: () => true
      }) as any);

      mockFs.existsSync.mockReturnValue(true);

      const validTool = createMockTool('valid_tool');
      const invalidTool = {
        name: 'invalid_tool',
        // Missing description, inputSchema, and execute
      };

      global.import = jest.fn().mockImplementation((modulePath: string) => {
        if (modulePath.includes('valid-tool')) {
          return Promise.resolve({ tool: validTool, default: validTool });
        } else {
          return Promise.resolve({ tool: invalidTool, default: invalidTool });
        }
      }) as any;

      const tools = await toolLoader.loadAllTools();
      
      // Only valid tool should be loaded
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('valid_tool');
    });
  });
});