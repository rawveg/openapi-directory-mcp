import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { PromptLoader } from '../../../src/prompts/loader.js';
import { createMockPrompt } from '../../helpers/plugin-fixtures.js';

// Mock filesystem operations
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('PromptLoader', () => {
  let promptLoader: PromptLoader;
  const testPromptsDir = path.join(process.cwd(), 'src', 'prompts');

  beforeEach(() => {
    promptLoader = new PromptLoader();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('loadAllPrompts', () => {
    it('should load prompts from all category folders', async () => {
      // Mock directory structure
      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === testPromptsDir) {
          return ['core-discovery', 'action-oriented', 'authentication', 'loader.ts', 'types.ts', 'templates.ts'] as any;
        }
        if (dirPath === path.join(testPromptsDir, 'core-discovery')) {
          return ['api-discovery.js', 'authentication-guide.js'] as any;
        }
        if (dirPath === path.join(testPromptsDir, 'action-oriented')) {
          return ['retrofit-api-client.js'] as any;
        }
        if (dirPath === path.join(testPromptsDir, 'authentication')) {
          return ['api-auth-implementation.js'] as any;
        }
        return [] as any;
      });

      mockFs.statSync.mockImplementation((dirPath) => ({
        isDirectory: () => !dirPath.toString().endsWith('.ts') && !dirPath.toString().endsWith('.js')
      }) as any);

      mockFs.existsSync.mockReturnValue(true);

      // Mock dynamic imports
      const mockPrompts = {
        'api-discovery': createMockPrompt('api_discovery', 'core-discovery'),
        'authentication-guide': createMockPrompt('authentication_guide', 'core-discovery'),
        'retrofit-api-client': createMockPrompt('retrofit_api_client', 'action-oriented'),
        'api-auth-implementation': createMockPrompt('api_auth_implementation', 'authentication')
      };

      // Mock import function
      const originalImport = global.import;
      global.import = jest.fn().mockImplementation((modulePath: string) => {
        const fileName = path.basename(modulePath, '.js');
        const promptKey = fileName.replace(/-/g, '_');
        
        if (mockPrompts[promptKey as keyof typeof mockPrompts]) {
          return Promise.resolve({
            prompt: mockPrompts[promptKey as keyof typeof mockPrompts],
            default: mockPrompts[promptKey as keyof typeof mockPrompts]
          });
        }
        return Promise.reject(new Error(`Module not found: ${modulePath}`));
      }) as any;

      const prompts = await promptLoader.loadAllPrompts();

      expect(prompts).toHaveLength(4);
      expect(prompts.map(p => p.name)).toContain('api_discovery');
      expect(prompts.map(p => p.name)).toContain('authentication_guide');
      expect(prompts.map(p => p.name)).toContain('retrofit_api_client');
      expect(prompts.map(p => p.name)).toContain('api_auth_implementation');

      // Restore original import
      global.import = originalImport;
    });

    it('should handle duplicate loading gracefully', async () => {
      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === testPromptsDir) {
          return ['test-category'] as any;
        }
        return ['test-prompt.js'] as any;
      });

      mockFs.statSync.mockImplementation(() => ({
        isDirectory: () => true
      }) as any);

      mockFs.existsSync.mockReturnValue(true);

      const mockPrompt = createMockPrompt('test_prompt', 'test-category');
      global.import = jest.fn().mockResolvedValue({
        prompt: mockPrompt,
        default: mockPrompt
      }) as any;

      // First load
      const prompts1 = await promptLoader.loadAllPrompts();
      // Second load (should not reload)
      const prompts2 = await promptLoader.loadAllPrompts();

      expect(prompts1).toEqual(prompts2);
      expect(global.import).toHaveBeenCalledTimes(1); // Should only import once
    });

    it('should handle missing category folders', async () => {
      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === testPromptsDir) {
          return ['non-existent'] as any;
        }
        throw new Error('ENOENT: no such file or directory');
      });

      mockFs.statSync.mockImplementation(() => ({
        isDirectory: () => true
      }) as any);

      mockFs.existsSync.mockReturnValue(false);

      const prompts = await promptLoader.loadAllPrompts();
      expect(prompts).toHaveLength(0);
    });

    it('should filter out non-JS files correctly', async () => {
      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === testPromptsDir) {
          return ['test-category'] as any;
        }
        return ['valid.js', 'invalid.ts', 'also-invalid.d.ts', 'index.js'] as any;
      });

      mockFs.statSync.mockImplementation(() => ({
        isDirectory: () => true
      }) as any);

      mockFs.existsSync.mockReturnValue(true);

      const mockPrompt = createMockPrompt('valid', 'test-category');
      global.import = jest.fn().mockResolvedValue({
        prompt: mockPrompt,
        default: mockPrompt
      }) as any;

      await promptLoader.loadAllPrompts();

      // Should only try to import valid.js (not invalid.ts, also-invalid.d.ts, or index.js)
      expect(global.import).toHaveBeenCalledTimes(1);
      expect(global.import).toHaveBeenCalledWith(
        expect.stringContaining('valid.js')
      );
    });
  });

  describe('getPrompt', () => {
    it('should retrieve specific prompt by name', async () => {
      const mockPrompt = createMockPrompt('test_prompt');
      
      // Setup mock loading
      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === testPromptsDir) {
          return ['test-category'] as any;
        }
        return ['test-prompt.js'] as any;
      });

      mockFs.statSync.mockImplementation(() => ({
        isDirectory: () => true
      }) as any);

      mockFs.existsSync.mockReturnValue(true);

      global.import = jest.fn().mockResolvedValue({
        prompt: mockPrompt,
        default: mockPrompt
      }) as any;

      await promptLoader.loadAllPrompts();
      const retrievedPrompt = await promptLoader.getPrompt('test_prompt');

      expect(retrievedPrompt).toEqual(mockPrompt);
    });

    it('should return undefined for non-existent prompt', async () => {
      const prompt = await promptLoader.getPrompt('non_existent');
      expect(prompt).toBeUndefined();
    });
  });

  describe('getCategories', () => {
    it('should return prompts organized by category', async () => {
      // Setup mock with multiple categories
      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === testPromptsDir) {
          return ['category1', 'category2'] as any;
        }
        if (dirPath === path.join(testPromptsDir, 'category1')) {
          return ['prompt1.js'] as any;
        }
        if (dirPath === path.join(testPromptsDir, 'category2')) {
          return ['prompt2.js', 'prompt3.js'] as any;
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
          prompt: createMockPrompt(fileName),
          default: createMockPrompt(fileName)
        });
      }) as any;

      const categories = await promptLoader.getCategories();

      expect(categories).toHaveLength(2);
      expect(categories.find(c => c.name === 'category1')?.prompts).toHaveLength(1);
      expect(categories.find(c => c.name === 'category2')?.prompts).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should handle malformed prompt files gracefully', async () => {
      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === testPromptsDir) {
          return ['test-category'] as any;
        }
        return ['malformed.js'] as any;
      });

      mockFs.statSync.mockImplementation(() => ({
        isDirectory: () => true
      }) as any);

      mockFs.existsSync.mockReturnValue(true);

      // Mock a malformed import (missing required fields)
      global.import = jest.fn().mockResolvedValue({
        prompt: { name: 'incomplete' }, // Missing required fields
        default: { name: 'incomplete' }
      }) as any;

      const prompts = await promptLoader.loadAllPrompts();
      
      // Should handle gracefully and continue loading
      expect(prompts).toHaveLength(0); // Malformed prompt should be filtered out
    });

    it('should handle import errors gracefully', async () => {
      mockFs.readdirSync.mockImplementation((dirPath) => {
        if (dirPath === testPromptsDir) {
          return ['test-category'] as any;
        }
        return ['failing.js'] as any;
      });

      mockFs.statSync.mockImplementation(() => ({
        isDirectory: () => true
      }) as any);

      mockFs.existsSync.mockReturnValue(true);

      global.import = jest.fn().mockRejectedValue(new Error('Import failed')) as any;

      const prompts = await promptLoader.loadAllPrompts();
      expect(prompts).toHaveLength(0);
    });
  });
});