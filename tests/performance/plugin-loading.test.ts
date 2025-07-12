import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { performance } from 'perf_hooks';
import fs from 'fs';
import { ToolLoader } from '../../src/tools/loader.js';
import { PromptLoader } from '../../src/prompts/loader.js';

describe('Plugin Loading Performance', () => {
  let toolLoader: ToolLoader;
  let promptLoader: PromptLoader;
  let performanceResults: any[] = [];

  beforeEach(() => {
    toolLoader = new ToolLoader();
    promptLoader = new PromptLoader();
    performanceResults = [];
  });

  afterEach(() => {
    // Write performance results to file for CI analysis
    if (performanceResults.length > 0) {
      const resultsFile = 'performance-results.json';
      const existingResults = fs.existsSync(resultsFile) 
        ? JSON.parse(fs.readFileSync(resultsFile, 'utf8'))
        : [];
      
      existingResults.push(...performanceResults);
      fs.writeFileSync(resultsFile, JSON.stringify(existingResults, null, 2));
    }
  });

  const measurePerformance = async (name: string, operation: () => Promise<any>) => {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    const result = await operation();
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const metrics = {
      name,
      duration: endTime - startTime,
      memoryDelta: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external
      },
      timestamp: new Date().toISOString(),
      result: result ? { count: Array.isArray(result) ? result.length : 1 } : null
    };
    
    performanceResults.push(metrics);
    return { result, metrics };
  };

  describe('Tool Loading Performance', () => {
    it('should load all tools within performance threshold', async () => {
      const { result, metrics } = await measurePerformance('load_all_tools', async () => {
        return await toolLoader.loadAllTools();
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Performance assertions
      expect(metrics.duration).toBeLessThan(3000); // 3 seconds max
      expect(metrics.memoryDelta.heapUsed).toBeLessThan(50 * 1024 * 1024); // 50MB max
      
      console.log(`Tool loading: ${metrics.duration.toFixed(2)}ms, ${result.length} tools`);
    });

    it('should demonstrate caching benefits', async () => {
      // First load (cold start)
      const { metrics: coldMetrics } = await measurePerformance('tools_cold_load', async () => {
        return await toolLoader.loadAllTools();
      });

      // Second load (should be cached)
      const { metrics: cachedMetrics } = await measurePerformance('tools_cached_load', async () => {
        return await toolLoader.loadAllTools();
      });

      // Cached load should be significantly faster
      expect(cachedMetrics.duration).toBeLessThan(coldMetrics.duration * 0.1); // 90% faster
      expect(cachedMetrics.memoryDelta.heapUsed).toBeLessThan(1024 * 1024); // <1MB delta
      
      console.log(`Cache improvement: ${((coldMetrics.duration - cachedMetrics.duration) / coldMetrics.duration * 100).toFixed(1)}%`);
    });

    it('should load individual tools efficiently', async () => {
      // Load all tools first
      await toolLoader.loadAllTools();
      
      const { metrics } = await measurePerformance('get_single_tool', async () => {
        return await toolLoader.getTool('get_providers');
      });

      expect(metrics.duration).toBeLessThan(10); // 10ms max for individual tool access
      expect(metrics.memoryDelta.heapUsed).toBeLessThan(100 * 1024); // <100KB
      
      console.log(`Single tool access: ${metrics.duration.toFixed(2)}ms`);
    });

    it('should organize categories efficiently', async () => {
      // Load tools first
      await toolLoader.loadAllTools();
      
      const { result, metrics } = await measurePerformance('get_tool_categories', async () => {
        return await toolLoader.getCategories();
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(metrics.duration).toBeLessThan(50); // 50ms max
      
      console.log(`Category organization: ${metrics.duration.toFixed(2)}ms, ${result.length} categories`);
    });
  });

  describe('Prompt Loading Performance', () => {
    it('should load all prompts within performance threshold', async () => {
      const { result, metrics } = await measurePerformance('load_all_prompts', async () => {
        return await promptLoader.loadAllPrompts();
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Performance assertions
      expect(metrics.duration).toBeLessThan(2000); // 2 seconds max
      expect(metrics.memoryDelta.heapUsed).toBeLessThan(20 * 1024 * 1024); // 20MB max
      
      console.log(`Prompt loading: ${metrics.duration.toFixed(2)}ms, ${result.length} prompts`);
    });

    it('should demonstrate prompt caching benefits', async () => {
      // First load
      const { metrics: coldMetrics } = await measurePerformance('prompts_cold_load', async () => {
        return await promptLoader.loadAllPrompts();
      });

      // Second load (cached)
      const { metrics: cachedMetrics } = await measurePerformance('prompts_cached_load', async () => {
        return await promptLoader.loadAllPrompts();
      });

      expect(cachedMetrics.duration).toBeLessThan(coldMetrics.duration * 0.1);
      
      console.log(`Prompt cache improvement: ${((coldMetrics.duration - cachedMetrics.duration) / coldMetrics.duration * 100).toFixed(1)}%`);
    });

    it('should access individual prompts efficiently', async () => {
      // Load all prompts first
      const allPrompts = await promptLoader.loadAllPrompts();
      const firstPromptName = allPrompts[0]?.name;
      
      if (firstPromptName) {
        const { metrics } = await measurePerformance('get_single_prompt', async () => {
          return await promptLoader.getPrompt(firstPromptName);
        });

        expect(metrics.duration).toBeLessThan(10); // 10ms max
        
        console.log(`Single prompt access: ${metrics.duration.toFixed(2)}ms`);
      }
    });
  });

  describe('Concurrent Loading Performance', () => {
    it('should handle concurrent plugin loading efficiently', async () => {
      const { result, metrics } = await measurePerformance('concurrent_loading', async () => {
        const [tools, prompts] = await Promise.all([
          toolLoader.loadAllTools(),
          promptLoader.loadAllPrompts()
        ]);
        return { tools, prompts };
      });

      expect(result.tools.length).toBeGreaterThan(0);
      expect(result.prompts.length).toBeGreaterThan(0);
      
      // Concurrent loading should be more efficient than sequential
      expect(metrics.duration).toBeLessThan(4000); // 4 seconds max for both
      
      console.log(`Concurrent loading: ${metrics.duration.toFixed(2)}ms`);
    });

    it('should handle multiple simultaneous requests', async () => {
      // Load plugins first
      await Promise.all([
        toolLoader.loadAllTools(),
        promptLoader.loadAllPrompts()
      ]);

      const { metrics } = await measurePerformance('multiple_simultaneous_requests', async () => {
        const promises = [];
        
        // Simulate 10 simultaneous requests
        for (let i = 0; i < 10; i++) {
          promises.push(
            Promise.all([
              toolLoader.getCategories(),
              promptLoader.getCategories()
            ])
          );
        }
        
        return await Promise.all(promises);
      });

      expect(metrics.duration).toBeLessThan(500); // 500ms max for 10 concurrent requests
      
      console.log(`10 simultaneous requests: ${metrics.duration.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Analysis', () => {
    it('should maintain reasonable memory footprint', async () => {
      const initialMemory = process.memoryUsage();
      
      // Load all plugins
      await Promise.all([
        toolLoader.loadAllTools(),
        promptLoader.loadAllTools()
      ]);
      
      const loadedMemory = process.memoryUsage();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const gcMemory = process.memoryUsage();
      
      const memoryIncrease = loadedMemory.heapUsed - initialMemory.heapUsed;
      const memoryAfterGC = gcMemory.heapUsed - initialMemory.heapUsed;
      
      performanceResults.push({
        name: 'memory_analysis',
        memoryIncrease: memoryIncrease,
        memoryAfterGC: memoryAfterGC,
        memoryEfficiency: memoryAfterGC / memoryIncrease,
        timestamp: new Date().toISOString()
      });
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB max
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory after GC: ${(memoryAfterGC / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Scalability Testing', () => {
    it('should scale linearly with plugin count', async () => {
      // This test would be more meaningful with a larger plugin set
      // For now, we test that performance doesn't degrade exponentially
      
      const { metrics: fullLoad } = await measurePerformance('full_plugin_load', async () => {
        return await Promise.all([
          toolLoader.loadAllTools(),
          promptLoader.loadAllPrompts()
        ]);
      });
      
      // Performance should be predictable
      expect(metrics.duration).toBeLessThan(5000); // 5 seconds max
      
      const pluginCount = fullLoad.result[0].length + fullLoad.result[1].length;
      const timePerPlugin = fullLoad.duration / pluginCount;
      
      performanceResults.push({
        name: 'scalability_metrics',
        totalPlugins: pluginCount,
        totalTime: fullLoad.duration,
        timePerPlugin: timePerPlugin,
        timestamp: new Date().toISOString()
      });
      
      console.log(`${pluginCount} plugins loaded in ${fullLoad.duration.toFixed(2)}ms (${timePerPlugin.toFixed(2)}ms per plugin)`);
      
      // Should not exceed 50ms per plugin on average
      expect(timePerPlugin).toBeLessThan(50);
    });
  });
});