import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CacheManager } from '../cache/manager';
import { ApiClient } from '../api/client';
import { ToolGenerator } from '../tools/generator';
import { PromptHandler } from '../prompts/handler';

describe('OpenAPI Directory MCP Server', () => {
  let cacheManager: CacheManager;
  let apiClient: ApiClient;
  let toolGenerator: ToolGenerator;
  let promptHandler: PromptHandler;

  beforeEach(() => {
    // Initialize with short TTL for testing
    cacheManager = new CacheManager(1000); // 1 second TTL
    apiClient = new ApiClient('https://api.apis.guru/v2', cacheManager);
    toolGenerator = new ToolGenerator();
    promptHandler = new PromptHandler();
  });

  afterEach(() => {
    cacheManager.clear();
  });

  describe('CacheManager', () => {
    it('should cache and retrieve values', () => {
      const key = 'test-key';
      const value = { test: 'data' };
      
      // Set value
      const setResult = cacheManager.set(key, value);
      expect(setResult).toBe(true);
      
      // Get value
      const retrieved = cacheManager.get(key);
      expect(retrieved).toEqual(value);
    });

    it('should return undefined for non-existent keys', () => {
      const result = cacheManager.get('non-existent-key');
      expect(result).toBeUndefined();
    });

    it('should handle TTL expiration', (done) => {
      const key = 'ttl-test';
      const value = 'test-value';
      
      cacheManager.set(key, value, 1500); // 1.5 second TTL
      
      // Should be available immediately
      expect(cacheManager.get(key)).toBe(value);
      
      // Should expire after TTL
      setTimeout(() => {
        expect(cacheManager.get(key)).toBeUndefined();
        done();
      }, 2000);
    }, 3000);

    it('should provide cache statistics', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      
      const stats = cacheManager.getStats();
      expect(stats.keys).toBe(2);
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.misses).toBe('number');
    });
  });

  describe('ToolGenerator', () => {
    it('should generate MCP tools', async () => {
      const tools = await toolGenerator.generateTools();
      
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      // Check that basic tools are present
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('get_providers');
      expect(toolNames).toContain('get_provider_apis');
      expect(toolNames).toContain('search_apis');
      expect(toolNames).toContain('get_metrics');
    });

    it('should generate tools with proper schema', async () => {
      const tools = await toolGenerator.generateTools();
      
      for (const tool of tools) {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeTruthy();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeTruthy();
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);
      }
    });

    it('should generate utility tools', () => {
      const utilityTools = toolGenerator.generateUtilityTools();
      
      expect(Array.isArray(utilityTools)).toBe(true);
      expect(utilityTools.length).toBeGreaterThan(0);
      
      const toolNames = utilityTools.map(t => t.name);
      expect(toolNames).toContain('validate_openapi_spec');
      expect(toolNames).toContain('compare_api_versions');
    });
  });

  describe('MCP Prompts', () => {
    it('should list available prompts', async () => {
      const result = await promptHandler.listPrompts();
      
      expect(result.prompts).toBeTruthy();
      expect(Array.isArray(result.prompts)).toBe(true);
      expect(result.prompts.length).toBeGreaterThan(0);
      
      for (const prompt of result.prompts) {
        expect(prompt.name).toBeTruthy();
        expect(prompt.description).toBeTruthy();
        expect(Array.isArray(prompt.arguments)).toBe(true);
      }
    });

    it('should include expected prompt names', async () => {
      const result = await promptHandler.listPrompts();
      const names = result.prompts.map((p: any) => p.name);
      
      expect(names).toContain('api_discovery');
      expect(names).toContain('api_integration_guide');
      expect(names).toContain('api_comparison');
      expect(names).toContain('authentication_guide');
      expect(names).toContain('troubleshooting_guide');
    });

    it('should get specific prompt with arguments', async () => {
      const result = await promptHandler.getPrompt({
        name: 'api_discovery',
        arguments: { use_case: 'test case' }
      });
      
      expect(result.description).toBeTruthy();
      expect(result.messages).toBeTruthy();
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.messages.length).toBeGreaterThan(0);
      
      const message = result.messages[0];
      expect(message).toBeTruthy();
      expect(message!.role).toBe('user');
      expect(message!.content).toBeTruthy();
      expect((message!.content as any).type).toBe('text');
    });
  });

  describe('API Client', () => {
    it('should have proper configuration', () => {
      expect(apiClient).toBeTruthy();
      // API client tests would require mocking HTTP requests
      // This is a basic smoke test
    });

    it('should use cache manager', () => {
      // Verify that cache manager is integrated
      expect(cacheManager).toBeTruthy();
      expect(cacheManager.isEnabled()).toBe(true);
    });
  });
});

// Integration tests (would require network access)
describe('Integration Tests', () => {
  const shouldRunIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';
  
  if (!shouldRunIntegrationTests) {
    it.skip('Integration tests skipped (set RUN_INTEGRATION_TESTS=true to run)', () => {});
    return;
  }

  let apiClient: ApiClient;
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager(5000); // 5 second TTL for integration tests
    apiClient = new ApiClient('https://api.apis.guru/v2', cacheManager);
  });

  afterEach(() => {
    cacheManager.clear();
  });

  it('should fetch providers from APIs.guru', async () => {
    const providers = await apiClient.getProviders();
    
    expect(providers).toBeTruthy();
    expect(providers.data).toBeTruthy();
    expect(Array.isArray(providers.data)).toBe(true);
    expect(providers.data.length).toBeGreaterThan(0);
  }, 10000);

  it('should fetch metrics from APIs.guru', async () => {
    const metrics = await apiClient.getMetrics();
    
    expect(metrics).toBeTruthy();
    expect(typeof metrics.numAPIs).toBe('number');
    expect(typeof metrics.numSpecs).toBe('number');
    expect(typeof metrics.numEndpoints).toBe('number');
    expect(metrics.numAPIs).toBeGreaterThan(0);
  }, 10000);

  it('should search APIs', async () => {
    const results = await apiClient.searchAPIs('google');
    
    expect(results).toBeTruthy();
    expect(typeof results).toBe('object');
    
    // Should find some Google APIs
    const apiIds = Object.keys(results);
    expect(apiIds.length).toBeGreaterThan(0);
    
    // Check that results contain google-related APIs
    const hasGoogleApis = apiIds.some(id => id.includes('google'));
    expect(hasGoogleApis).toBe(true);
  }, 10000);

  it('should cache API responses', async () => {
    // First request
    const start1 = Date.now();
    const providers1 = await apiClient.getProviders();
    const time1 = Date.now() - start1;
    
    // Second request (should be cached)
    const start2 = Date.now();
    const providers2 = await apiClient.getProviders();
    const time2 = Date.now() - start2;
    
    expect(providers1).toEqual(providers2);
    // Cached request should be significantly faster
    expect(time2).toBeLessThan(time1 / 2);
  }, 10000);
});