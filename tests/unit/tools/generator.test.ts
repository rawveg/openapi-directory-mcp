import { describe, test, expect, beforeEach } from '@jest/globals';
import { ToolGenerator } from '../../../src/tools/generator.js';

describe('ToolGenerator', () => {
  let toolGenerator: ToolGenerator;

  beforeEach(() => {
    toolGenerator = new ToolGenerator();
  });

  describe('generateTools', () => {
    test('should generate array of tool definitions', async () => {
      const tools = await toolGenerator.generateTools();
      
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    test('should include all expected tool names', async () => {
      const tools = await toolGenerator.generateTools();
      const toolNames = tools.map(tool => tool.name);
      
      const expectedTools = [
        'get_providers',
        'get_provider_apis', 
        'get_provider_services',
        'get_api',
        'list_all_apis',
        'get_metrics',
        'search_apis',
        'get_popular_apis',
        'get_recently_updated',
        'get_provider_stats',
        'get_openapi_spec',
        'analyze_api_categories',
        'get_api_summary',
        'get_endpoints',
        'get_endpoint_details',
        'get_endpoint_schema',
        'get_endpoint_examples',
        'cache_stats',
        'list_cache_keys',
        'clear_cache',
        'clear_cache_key',
        'cache_info'
      ];

      expectedTools.forEach(expectedTool => {
        expect(toolNames).toContain(expectedTool);
      });
    });

    test('should have proper tool structure for each tool', async () => {
      const tools = await toolGenerator.generateTools();
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');
        
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');
        expect(tool.inputSchema).toHaveProperty('required');
        expect(Array.isArray(tool.inputSchema.required)).toBe(true);
      });
    });

    test('should have correct schema for get_providers tool', async () => {
      const tools = await toolGenerator.generateTools();
      const getProvidersTool = tools.find(tool => tool.name === 'get_providers');
      
      expect(getProvidersTool).toBeDefined();
      expect(getProvidersTool!.description).toBe('List all API providers in the directory');
      expect(getProvidersTool!.inputSchema.properties).toEqual({});
      expect(getProvidersTool!.inputSchema.required).toEqual([]);
    });

    test('should have correct schema for get_provider_apis tool', async () => {
      const tools = await toolGenerator.generateTools();
      const tool = tools.find(t => t.name === 'get_provider_apis');
      
      expect(tool).toBeDefined();
      expect(tool!.description).toBe('List all APIs for a specific provider');
      expect(tool!.inputSchema.properties).toHaveProperty('provider');
      expect(tool!.inputSchema.properties.provider).toEqual({
        type: 'string',
        description: 'Provider name (e.g., "googleapis.com", "azure.com")'
      });
      expect(tool!.inputSchema.required).toEqual(['provider']);
    });

    test('should have correct schema for get_api tool', async () => {
      const tools = await toolGenerator.generateTools();
      const tool = tools.find(t => t.name === 'get_api');
      
      expect(tool).toBeDefined();
      expect(tool!.description).toBe('Get detailed information about a specific API');
      expect(tool!.inputSchema.properties).toHaveProperty('provider');
      expect(tool!.inputSchema.properties).toHaveProperty('api');
      expect(tool!.inputSchema.properties).toHaveProperty('service');
      expect(tool!.inputSchema.required).toEqual(['provider', 'api']);
    });

    test('should have correct schema for search_apis tool', async () => {
      const tools = await toolGenerator.generateTools();
      const tool = tools.find(t => t.name === 'search_apis');
      
      expect(tool).toBeDefined();
      expect(tool!.description).toContain('Search for APIs by name, description, provider, or keywords');
      expect(tool!.inputSchema.properties).toHaveProperty('query');
      expect(tool!.inputSchema.properties).toHaveProperty('provider');
      expect(tool!.inputSchema.properties).toHaveProperty('page');
      expect(tool!.inputSchema.properties).toHaveProperty('limit');
      expect(tool!.inputSchema.required).toEqual(['query']);
    });

    test('should have default values for pagination tools', async () => {
      const tools = await toolGenerator.generateTools();
      const searchTool = tools.find(t => t.name === 'search_apis');
      const popularTool = tools.find(t => t.name === 'get_popular_apis');
      const recentTool = tools.find(t => t.name === 'get_recently_updated');
      
      expect(searchTool!.inputSchema.properties.page.default).toBe(1);
      expect(searchTool!.inputSchema.properties.limit.default).toBe(20);
      expect(popularTool!.inputSchema.properties.limit.default).toBe(20);
      expect(recentTool!.inputSchema.properties.limit.default).toBe(10);
    });

    test('should have correct schema for endpoint tools', async () => {
      const tools = await toolGenerator.generateTools();
      const endpointDetailsTool = tools.find(t => t.name === 'get_endpoint_details');
      
      expect(endpointDetailsTool).toBeDefined();
      expect(endpointDetailsTool!.inputSchema.properties).toHaveProperty('api_id');
      expect(endpointDetailsTool!.inputSchema.properties).toHaveProperty('method');
      expect(endpointDetailsTool!.inputSchema.properties).toHaveProperty('path');
      expect(endpointDetailsTool!.inputSchema.required).toEqual(['api_id', 'method', 'path']);
    });

    test('should have correct schema for cache tools', async () => {
      const tools = await toolGenerator.generateTools();
      const cacheStatsTool = tools.find(t => t.name === 'cache_stats');
      const clearCacheTool = tools.find(t => t.name === 'clear_cache');
      const clearCacheKeyTool = tools.find(t => t.name === 'clear_cache_key');
      
      expect(cacheStatsTool).toBeDefined();
      expect(cacheStatsTool!.description).toBe('Get cache statistics and information');
      expect(cacheStatsTool!.inputSchema.required).toEqual([]);
      
      expect(clearCacheTool).toBeDefined();
      expect(clearCacheTool!.description).toBe('Clear all cache entries');
      
      expect(clearCacheKeyTool).toBeDefined();
      expect(clearCacheKeyTool!.inputSchema.properties).toHaveProperty('key');
      expect(clearCacheKeyTool!.inputSchema.required).toEqual(['key']);
    });

    test('should have no duplicate tool names', async () => {
      const tools = await toolGenerator.generateTools();
      const toolNames = tools.map(tool => tool.name);
      const uniqueNames = [...new Set(toolNames)];
      
      expect(toolNames.length).toBe(uniqueNames.length);
    });

    test('should have valid JSON schema structure for all tools', async () => {
      const tools = await toolGenerator.generateTools();
      
      tools.forEach(tool => {
        const schema = tool.inputSchema;
        
        // Check that properties is an object
        expect(typeof schema.properties).toBe('object');
        
        // Check that each property has a type
        Object.values(schema.properties).forEach((prop: any) => {
          expect(prop).toHaveProperty('type');
          expect(typeof prop.type).toBe('string');
        });
        
        // Check that required is array of strings
        expect(Array.isArray(schema.required)).toBe(true);
        schema.required.forEach((reqField: any) => {
          expect(typeof reqField).toBe('string');
          expect(schema.properties).toHaveProperty(reqField);
        });
      });
    });

    test('should include tool descriptions that are meaningful', async () => {
      const tools = await toolGenerator.generateTools();
      
      tools.forEach(tool => {
        expect(tool.description.length).toBeGreaterThan(10);
        expect(tool.description).not.toMatch(/^(TODO|FIXME|XXX)/i);
      });
    });

    test('should have consistent naming convention', async () => {
      const tools = await toolGenerator.generateTools();
      
      tools.forEach(tool => {
        // Tool names should be lowercase with underscores
        expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
        expect(tool.name).not.toContain(' ');
        expect(tool.name).not.toContain('-');
      });
    });

    test('should return the same tools on multiple calls', async () => {
      const tools1 = await toolGenerator.generateTools();
      const tools2 = await toolGenerator.generateTools();
      
      expect(tools1).toEqual(tools2);
    });
  });

  describe('generateToolsFromSpec', () => {
    test('should return empty array when spec has no paths', async () => {
      const spec = {};
      const tools = await toolGenerator.generateToolsFromSpec(spec);
      
      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(0);
    });

    test('should return empty array when paths is undefined', async () => {
      const spec = { info: { title: 'Test API' } };
      const tools = await toolGenerator.generateToolsFromSpec(spec);
      
      expect(tools).toHaveLength(0);
    });

    test('should generate tools from OpenAPI spec paths', async () => {
      const spec = {
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              operationId: 'getUsers',
              summary: 'Get all users',
              description: 'Retrieve a list of all users',
              parameters: [
                {
                  name: 'limit',
                  in: 'query',
                  schema: { type: 'number' },
                  description: 'Maximum number of users to return'
                }
              ]
            },
            post: {
              operationId: 'createUser',
              summary: 'Create a user',
              description: 'Create a new user',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        email: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          },
          '/users/{id}': {
            get: {
              operationId: 'getUserById',
              summary: 'Get user by ID',
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' }
                }
              ]
            }
          }
        }
      };

      const tools = await toolGenerator.generateToolsFromSpec(spec);
      
      expect(tools).toHaveLength(3);
      expect(tools.map(t => t.name)).toEqual(['getUsers', 'createUser', 'getUserById']);
    });

    test('should handle spec with invalid path items', async () => {
      const spec = {
        paths: {
          '/valid': {
            get: {
              operationId: 'validOp',
              summary: 'Valid operation'
            }
          },
          '/invalid': null,
          '/another-invalid': 'not an object'
        }
      };

      const tools = await toolGenerator.generateToolsFromSpec(spec);
      
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('validOp');
    });

    test('should generate fallback names for operations without operationId', async () => {
      const spec = {
        paths: {
          '/test': {
            get: {
              summary: 'Operation without operationId'
            },
            post: {
              operationId: 'validOperation',
              summary: 'Valid operation'
            }
          }
        }
      };

      const tools = await toolGenerator.generateToolsFromSpec(spec);
      
      expect(tools).toHaveLength(2);
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('get__test');
      expect(toolNames).toContain('validOperation');
    });

    test('should handle operations with parameters', async () => {
      const spec = {
        paths: {
          '/test': {
            get: {
              operationId: 'testOp',
              summary: 'Test operation',
              parameters: [
                {
                  name: 'param1',
                  in: 'query',
                  schema: { type: 'string' },
                  description: 'First parameter'
                },
                {
                  name: 'param2',
                  in: 'path',
                  required: true,
                  schema: { type: 'number' }
                }
              ]
            }
          }
        }
      };

      const tools = await toolGenerator.generateToolsFromSpec(spec);
      
      expect(tools).toHaveLength(1);
      const tool = tools[0];
      expect(tool.name).toBe('testOp');
      expect(tool.inputSchema.properties).toHaveProperty('param1');
      expect(tool.inputSchema.properties).toHaveProperty('param2');
      expect(tool.inputSchema.required).toContain('param2');
      expect(tool.inputSchema.required).not.toContain('param1');
    });

    test('should handle operations with request body', async () => {
      const spec = {
        paths: {
          '/test': {
            post: {
              operationId: 'createTest',
              summary: 'Create test',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        value: { type: 'number' }
                      },
                      required: ['name']
                    }
                  }
                }
              }
            }
          }
        }
      };

      const tools = await toolGenerator.generateToolsFromSpec(spec);
      
      expect(tools).toHaveLength(1);
      const tool = tools[0];
      expect(tool.name).toBe('createTest');
      expect(tool.inputSchema.properties).toHaveProperty('body');
      expect(tool.inputSchema.properties.body.properties).toHaveProperty('name');
      expect(tool.inputSchema.properties.body.properties).toHaveProperty('value');
      expect(tool.inputSchema.required).toContain('body');
    });

    test('should handle all HTTP methods', async () => {
      const spec = {
        paths: {
          '/test': {
            get: { operationId: 'getTest', summary: 'Get test' },
            post: { operationId: 'postTest', summary: 'Post test' },
            put: { operationId: 'putTest', summary: 'Put test' },
            patch: { operationId: 'patchTest', summary: 'Patch test' },
            delete: { operationId: 'deleteTest', summary: 'Delete test' },
            head: { operationId: 'headTest', summary: 'Head test' },
            options: { operationId: 'optionsTest', summary: 'Options test' }
          }
        }
      };

      const tools = await toolGenerator.generateToolsFromSpec(spec);
      
      expect(tools).toHaveLength(7);
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('getTest');
      expect(toolNames).toContain('postTest');
      expect(toolNames).toContain('putTest');
      expect(toolNames).toContain('patchTest');
      expect(toolNames).toContain('deleteTest');
      expect(toolNames).toContain('headTest');
      expect(toolNames).toContain('optionsTest');
    });

    test('should use path as fallback name when operationId is missing', async () => {
      const spec = {
        paths: {
          '/test': {
            get: {
              summary: 'Test operation without operationId'
            }
          }
        }
      };

      const tools = await toolGenerator.generateToolsFromSpec(spec);
      
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('get__test');
      expect(tools[0].description).toBe('Test operation without operationId');
    });

    test('should handle complex parameter schemas', async () => {
      const spec = {
        paths: {
          '/test': {
            get: {
              operationId: 'complexTest',
              summary: 'Complex test',
              parameters: [
                {
                  name: 'arrayParam',
                  in: 'query',
                  schema: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                },
                {
                  name: 'objectParam',
                  in: 'query',
                  schema: {
                    type: 'object',
                    properties: {
                      nested: { type: 'string' }
                    }
                  }
                }
              ]
            }
          }
        }
      };

      const tools = await toolGenerator.generateToolsFromSpec(spec);
      
      expect(tools).toHaveLength(1);
      const tool = tools[0];
      expect(tool.inputSchema.properties.arrayParam.type).toBe('array');
      expect(tool.inputSchema.properties.objectParam.type).toBe('object');
    });
  });
});