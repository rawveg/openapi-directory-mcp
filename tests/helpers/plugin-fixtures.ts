import { PromptTemplate } from '../../src/prompts/types.js';
import { ToolDefinition } from '../../src/tools/types.js';

/**
 * Test fixtures for plugin architecture testing
 */

export const createMockPrompt = (name: string, category = 'test'): PromptTemplate => ({
  name,
  description: `Test prompt: ${name}`,
  arguments: [
    {
      name: 'test_arg',
      description: 'Test argument',
      required: true
    }
  ],
  generateMessages: (args) => [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Test prompt content with ${args.test_arg}`
      }
    }
  ]
});

export const createMockTool = (name: string, category = 'test'): ToolDefinition => ({
  name,
  description: `Test tool: ${name}`,
  inputSchema: {
    type: 'object',
    properties: {
      test_param: {
        type: 'string',
        description: 'Test parameter'
      }
    },
    required: ['test_param']
  },
  async execute(args, context) {
    return {
      tool: name,
      category,
      input: args,
      success: true
    };
  }
});

export const createMockApiClient = () => ({
  getProviders: jest.fn().mockResolvedValue({ data: ['test.com'] }),
  getProvider: jest.fn().mockResolvedValue({ 'test:api': { versions: { '1.0': {} } } }),
  getServices: jest.fn().mockResolvedValue({ data: ['service1'] }),
  getAPI: jest.fn().mockResolvedValue({ info: { title: 'Test API' } }),
  getServiceAPI: jest.fn().mockResolvedValue({ info: { title: 'Test Service API' } }),
  listAPIs: jest.fn().mockResolvedValue({ 'test:api': { versions: { '1.0': {} } } }),
  getMetrics: jest.fn().mockResolvedValue({ numAPIs: 100, numSpecs: 100 }),
  searchAPIs: jest.fn().mockResolvedValue({ 'test:api': { versions: { '1.0': {} } } }),
  getPopularAPIs: jest.fn().mockResolvedValue({ 'test:api': { versions: { '1.0': {} } } }),
  getRecentlyUpdatedAPIs: jest.fn().mockResolvedValue({ 'test:api': { versions: { '1.0': {} } } }),
  getProviderStats: jest.fn().mockResolvedValue({ apis: 10, specs: 10 }),
  getOpenAPISpec: jest.fn().mockResolvedValue({ openapi: '3.0.0' }),
  getAPISummaryById: jest.fn().mockResolvedValue({ id: 'test', title: 'Test API' }),
  getAPIEndpoints: jest.fn().mockResolvedValue({ endpoints: [] }),
  getEndpointDetails: jest.fn().mockResolvedValue({ method: 'GET', path: '/test' }),
  getEndpointSchema: jest.fn().mockResolvedValue({ parameters: [] }),
  getEndpointExamples: jest.fn().mockResolvedValue({ examples: [] })
});

export const createMockCacheManager = () => ({
  get: jest.fn(),
  set: jest.fn().mockReturnValue(true),
  delete: jest.fn().mockReturnValue(1),
  clear: jest.fn(),
  getStats: jest.fn().mockReturnValue({ keys: 0, hits: 0, misses: 0, ksize: 0, vsize: 0 }),
  keys: jest.fn().mockReturnValue([]),
  has: jest.fn().mockReturnValue(false),
  getTtl: jest.fn(),
  getSize: jest.fn().mockReturnValue(0),
  getMemoryUsage: jest.fn().mockReturnValue(0),
  prune: jest.fn(),
  setEnabled: jest.fn(),
  isEnabled: jest.fn().mockReturnValue(true),
  getConfig: jest.fn().mockReturnValue({ enabled: true, ttlSeconds: 1, maxKeys: 1000 })
});

export const createTestContext = () => ({
  apiClient: createMockApiClient(),
  cacheManager: createMockCacheManager()
});