# Tool Generation Approach

## Overview

This document outlines the approach for generating MCP tools from the APIs.guru OpenAPI specification. The system creates seven distinct tools that correspond to the API endpoints, each with proper parameter validation, caching, and error handling.

## Tool Generation Strategy

### 1. Static Tool Definition
Rather than fully dynamic generation, we use a hybrid approach:
- **Static Structure**: Each tool has a predefined class structure
- **Dynamic Schemas**: Parameter schemas are generated from OpenAPI definitions
- **Runtime Validation**: Parameters are validated against OpenAPI schemas

### 2. Tool Registry Pattern
```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  execute(params: any): Promise<any>;
}

class ToolRegistry {
  private tools = new Map<string, Tool>();
  
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }
  
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }
  
  list(): Tool[] {
    return Array.from(this.tools.values());
  }
}
```

## Tool Implementations

### 1. GetProviders Tool

```typescript
export class GetProvidersToolImpl implements Tool {
  name = 'getProviders';
  description = 'List all API providers in the APIs.guru directory';
  
  inputSchema: JSONSchema = {
    type: 'object',
    properties: {},
    additionalProperties: false
  };
  
  constructor(
    private client: APIsGuruClient,
    private cache: CacheManager
  ) {}
  
  async execute(params: {}): Promise<ProvidersResponse> {
    const cacheKey = CacheKeyGenerator.forProviders();
    
    // Try cache first
    const cached = await this.cache.get<ProvidersResponse>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const response = await this.client.getProviders();
    
    // Cache and return
    await this.cache.set(cacheKey, response);
    return response;
  }
}
```

### 2. GetProvider Tool

```typescript
export class GetProviderToolImpl implements Tool {
  name = 'getProvider';
  description = 'List all APIs for a particular provider';
  
  inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      provider: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        description: 'Name of the provider (e.g., "apis.guru")'
      }
    },
    required: ['provider'],
    additionalProperties: false
  };
  
  constructor(
    private client: APIsGuruClient,
    private cache: CacheManager
  ) {}
  
  async execute(params: { provider: string }): Promise<APIsResponse> {
    const { provider } = params;
    const cacheKey = CacheKeyGenerator.forProvider(provider);
    
    // Try cache first
    const cached = await this.cache.get<APIsResponse>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const response = await this.client.getProvider(provider);
    
    // Cache and return
    await this.cache.set(cacheKey, response);
    return response;
  }
}
```

### 3. GetServices Tool

```typescript
export class GetServicesToolImpl implements Tool {
  name = 'getServices';
  description = 'List all service names for a particular provider';
  
  inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      provider: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        description: 'Name of the provider'
      }
    },
    required: ['provider'],
    additionalProperties: false
  };
  
  constructor(
    private client: APIsGuruClient,
    private cache: CacheManager
  ) {}
  
  async execute(params: { provider: string }): Promise<ServicesResponse> {
    const { provider } = params;
    const cacheKey = CacheKeyGenerator.forServices(provider);
    
    // Try cache first
    const cached = await this.cache.get<ServicesResponse>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const response = await this.client.getServices(provider);
    
    // Cache and return
    await this.cache.set(cacheKey, response);
    return response;
  }
}
```

### 4. GetAPI Tool

```typescript
export class GetAPIToolImpl implements Tool {
  name = 'getAPI';
  description = 'Retrieve one version of a particular API';
  
  inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      provider: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        description: 'Name of the provider'
      },
      api: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        description: 'API version identifier'
      }
    },
    required: ['provider', 'api'],
    additionalProperties: false
  };
  
  constructor(
    private client: APIsGuruClient,
    private cache: CacheManager
  ) {}
  
  async execute(params: { provider: string; api: string }): Promise<APIResponse> {
    const { provider, api } = params;
    const cacheKey = CacheKeyGenerator.forAPI(provider, api);
    
    // Try cache first
    const cached = await this.cache.get<APIResponse>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const response = await this.client.getAPI(provider, api);
    
    // Cache and return
    await this.cache.set(cacheKey, response);
    return response;
  }
}
```

### 5. GetServiceAPI Tool

```typescript
export class GetServiceAPIToolImpl implements Tool {
  name = 'getServiceAPI';
  description = 'Retrieve one version of a particular API with a service name';
  
  inputSchema: JSONSchema = {
    type: 'object',
    properties: {
      provider: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        description: 'Name of the provider'
      },
      service: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        description: 'Name of the service'
      },
      api: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        description: 'API version identifier'
      }
    },
    required: ['provider', 'service', 'api'],
    additionalProperties: false
  };
  
  constructor(
    private client: APIsGuruClient,
    private cache: CacheManager
  ) {}
  
  async execute(params: { provider: string; service: string; api: string }): Promise<APIResponse> {
    const { provider, service, api } = params;
    const cacheKey = CacheKeyGenerator.forServiceAPI(provider, service, api);
    
    // Try cache first
    const cached = await this.cache.get<APIResponse>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const response = await this.client.getServiceAPI(provider, service, api);
    
    // Cache and return
    await this.cache.set(cacheKey, response);
    return response;
  }
}
```

### 6. ListAPIs Tool

```typescript
export class ListAPIsToolImpl implements Tool {
  name = 'listAPIs';
  description = 'List all APIs in the directory with metadata';
  
  inputSchema: JSONSchema = {
    type: 'object',
    properties: {},
    additionalProperties: false
  };
  
  constructor(
    private client: APIsGuruClient,
    private cache: CacheManager
  ) {}
  
  async execute(params: {}): Promise<APIsResponse> {
    const cacheKey = CacheKeyGenerator.forList();
    
    // Try cache first
    const cached = await this.cache.get<APIsResponse>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const response = await this.client.listAPIs();
    
    // Cache and return
    await this.cache.set(cacheKey, response);
    return response;
  }
}
```

### 7. GetMetrics Tool

```typescript
export class GetMetricsToolImpl implements Tool {
  name = 'getMetrics';
  description = 'Get basic metrics about the API directory';
  
  inputSchema: JSONSchema = {
    type: 'object',
    properties: {},
    additionalProperties: false
  };
  
  constructor(
    private client: APIsGuruClient,
    private cache: CacheManager
  ) {}
  
  async execute(params: {}): Promise<MetricsResponse> {
    const cacheKey = CacheKeyGenerator.forMetrics();
    
    // Try cache first (shorter TTL for metrics)
    const cached = await this.cache.get<MetricsResponse>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from API
    const response = await this.client.getMetrics();
    
    // Cache with shorter TTL (1 hour)
    await this.cache.set(cacheKey, response, 60 * 60 * 1000);
    return response;
  }
}
```

## Type Generation

### OpenAPI to TypeScript Types

```typescript
// Generated from OpenAPI specification
export interface ProvidersResponse {
  data: string[];
}

export interface APIsResponse {
  [apiId: string]: APIInfo;
}

export interface APIInfo {
  added: string;
  preferred: string;
  versions: {
    [version: string]: APIVersion;
  };
}

export interface APIVersion {
  added: string;
  updated: string;
  swaggerUrl: string;
  swaggerYamlUrl: string;
  link?: string;
  info: {
    title: string;
    version: string;
    description?: string;
    [key: string]: any;
  };
  externalDocs?: {
    url: string;
    description?: string;
  };
  openapiVer: string;
}

export interface ServicesResponse {
  data: string[];
}

export interface APIResponse extends APIInfo {}

export interface MetricsResponse {
  numSpecs: number;
  numAPIs: number;
  numEndpoints: number;
  unreachable?: number;
  invalid?: number;
  unofficial?: number;
  fixes?: number;
  fixedPct?: number;
  datasets?: any[];
  stars?: number;
  issues?: number;
  thisWeek?: {
    added: number;
    updated: number;
  };
  numDrivers?: number;
  numProviders?: number;
}
```

## Tool Factory

```typescript
export class ToolFactory {
  static createAllTools(
    client: APIsGuruClient,
    cache: CacheManager
  ): Tool[] {
    return [
      new GetProvidersToolImpl(client, cache),
      new GetProviderToolImpl(client, cache),
      new GetServicesToolImpl(client, cache),
      new GetAPIToolImpl(client, cache),
      new GetServiceAPIToolImpl(client, cache),
      new ListAPIsToolImpl(client, cache),
      new GetMetricsToolImpl(client, cache)
    ];
  }
}
```

## Error Handling

### Tool-Level Error Handling

```typescript
export abstract class BaseTool implements Tool {
  abstract name: string;
  abstract description: string;
  abstract inputSchema: JSONSchema;
  
  protected constructor(
    protected client: APIsGuruClient,
    protected cache: CacheManager
  ) {}
  
  async execute(params: any): Promise<any> {
    try {
      // Validate parameters
      this.validateParams(params);
      
      // Execute tool logic
      return await this.executeImpl(params);
    } catch (error) {
      // Handle and transform errors
      throw this.handleError(error);
    }
  }
  
  protected abstract executeImpl(params: any): Promise<any>;
  
  private validateParams(params: any): void {
    const validator = new SchemaValidator();
    const result = validator.validate(params, this.inputSchema);
    
    if (!result.valid) {
      throw new ValidationError(
        `Invalid parameters: ${result.errors.join(', ')}`
      );
    }
  }
  
  private handleError(error: unknown): Error {
    if (error instanceof ValidationError) {
      return error;
    }
    
    if (error instanceof APIError) {
      return new ToolError(
        `API error: ${error.message}`,
        error.statusCode
      );
    }
    
    if (error instanceof CacheError) {
      // Cache errors should not fail the tool
      console.warn('Cache error:', error);
      return new ToolError('Cache unavailable, fetching from API');
    }
    
    // Unknown error
    console.error('Unexpected error:', error);
    return new ToolError('Internal server error');
  }
}
```

## Testing Strategy

### Unit Tests for Each Tool

```typescript
describe('GetProvidersToolImpl', () => {
  let tool: GetProvidersToolImpl;
  let mockClient: jest.Mocked<APIsGuruClient>;
  let mockCache: jest.Mocked<CacheManager>;
  
  beforeEach(() => {
    mockClient = createMockClient();
    mockCache = createMockCache();
    tool = new GetProvidersToolImpl(mockClient, mockCache);
  });
  
  describe('execute', () => {
    it('should return cached data when available', async () => {
      const cachedData = { data: ['provider1', 'provider2'] };
      mockCache.get.mockResolvedValue(cachedData);
      
      const result = await tool.execute({});
      
      expect(result).toEqual(cachedData);
      expect(mockClient.getProviders).not.toHaveBeenCalled();
    });
    
    it('should fetch from API when cache is empty', async () => {
      const apiData = { data: ['provider1', 'provider2'] };
      mockCache.get.mockResolvedValue(null);
      mockClient.getProviders.mockResolvedValue(apiData);
      
      const result = await tool.execute({});
      
      expect(result).toEqual(apiData);
      expect(mockCache.set).toHaveBeenCalledWith(
        'providers',
        apiData
      );
    });
    
    it('should validate parameters', async () => {
      await expect(tool.execute({ invalid: 'param' }))
        .rejects.toThrow(ValidationError);
    });
  });
});
```

### Integration Tests

```typescript
describe('Tool Integration', () => {
  let server: MCPServer;
  let toolRegistry: ToolRegistry;
  
  beforeEach(async () => {
    server = await createTestServer();
    toolRegistry = server.getToolRegistry();
  });
  
  it('should register all tools', () => {
    const tools = toolRegistry.list();
    expect(tools).toHaveLength(7);
    
    const toolNames = tools.map(t => t.name);
    expect(toolNames).toContain('getProviders');
    expect(toolNames).toContain('getProvider');
    expect(toolNames).toContain('getServices');
    expect(toolNames).toContain('getAPI');
    expect(toolNames).toContain('getServiceAPI');
    expect(toolNames).toContain('listAPIs');
    expect(toolNames).toContain('getMetrics');
  });
  
  it('should handle tool execution', async () => {
    const tool = toolRegistry.get('getProviders');
    expect(tool).toBeDefined();
    
    const result = await tool!.execute({});
    expect(result).toHaveProperty('data');
    expect(Array.isArray(result.data)).toBe(true);
  });
});
```

## Performance Considerations

### Lazy Tool Loading
```typescript
class LazyToolRegistry {
  private tools = new Map<string, () => Tool>();
  private instances = new Map<string, Tool>();
  
  registerFactory(name: string, factory: () => Tool): void {
    this.tools.set(name, factory);
  }
  
  get(name: string): Tool | undefined {
    if (!this.instances.has(name)) {
      const factory = this.tools.get(name);
      if (!factory) return undefined;
      
      this.instances.set(name, factory());
    }
    
    return this.instances.get(name);
  }
}
```

### Batch Operations
```typescript
class BatchToolExecutor {
  async executeBatch(requests: Array<{ tool: string; params: any }>): Promise<any[]> {
    const promises = requests.map(async (req) => {
      const tool = this.toolRegistry.get(req.tool);
      if (!tool) {
        throw new Error(`Tool not found: ${req.tool}`);
      }
      
      return await tool.execute(req.params);
    });
    
    return Promise.all(promises);
  }
}
```

## Utility Prompts

### Common Usage Patterns

```typescript
export const UTILITY_PROMPTS = {
  discoverProviders: `
    Use the getProviders tool to discover all available API providers.
    This will give you a list of organizations and companies that have APIs in the directory.
  `,
  
  exploreProvider: `
    Use the getProvider tool with a provider name to see all APIs available from that provider.
    This shows you the different services and versions available.
  `,
  
  findAPIVersions: `
    Use the getAPI tool to get detailed information about a specific API version.
    This includes metadata, documentation links, and OpenAPI specification URLs.
  `,
  
  searchAPIs: `
    Use the listAPIs tool to get a comprehensive list of all APIs in the directory.
    This is useful for discovery and searching across all available APIs.
  `,
  
  getDirectoryStats: `
    Use the getMetrics tool to get statistics about the entire API directory.
    This includes total counts, recent additions, and other interesting metrics.
  `
};
```