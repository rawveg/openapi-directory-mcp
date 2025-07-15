# Complete Architecture Design Document

## Executive Summary

This document presents the complete architecture design for the **OpenAPI Directory MCP Server** - a Model Context Protocol server that provides seamless access to the APIs.guru directory containing over 3,000 API specifications. The server enables AI models to discover, explore, and retrieve API documentation through seven dynamically generated tools with intelligent caching and zero-configuration deployment.

## System Overview

### Key Features
- **3,000+ API Access**: Complete access to APIs.guru directory
- **Zero Configuration**: NPX-based installation and execution
- **24-Hour Caching**: Intelligent caching with TTL management
- **7 Core Tools**: Comprehensive API discovery and retrieval
- **Type Safety**: Full TypeScript implementation
- **AGPLv3 License**: Open source with copyleft protection

### Architecture Principles
1. **Simplicity**: Zero-config installation and usage
2. **Performance**: Intelligent caching and efficient API calls
3. **Reliability**: Robust error handling and fallback mechanisms
4. **Extensibility**: Modular design for future enhancements
5. **Standards Compliance**: Full MCP protocol implementation

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Models (Claude, GPT, etc.)             │
└─────────────────────┬───────────────────────────────────────┘
                      │ MCP Protocol (JSON-RPC over stdio)
┌─────────────────────▼───────────────────────────────────────┐
│                  MCP Server Core                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                Tool Registry                         │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ getProviders | getProvider | getServices   │    │    │
│  │  │ getAPI | getServiceAPI | listAPIs | getMetrics │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            Request Processing Pipeline               │    │
│  │  1. Parameter Validation                            │    │
│  │  2. Cache Lookup                                    │    │
│  │  3. API Call (if cache miss)                       │    │
│  │  4. Response Transformation                         │    │
│  │  5. Cache Storage                                   │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────┬──────────────────────┬─────────────────────────┘
             │                      │
┌────────────▼────────┐  ┌──────────▼──────────┐
│   File Cache        │  │   HTTP Client        │
│  (~/.cache/...)     │  │  (with retry logic)  │
│  - 24h TTL          │  │  - Rate limiting     │
│  - JSON storage     │  │  - Error handling    │
│  - LRU cleanup      │  │  - Response validation│
└─────────────────────┘  └───────────┬─────────┘
                                      │
                         ┌────────────▼────────────┐
                         │      APIs.guru API      │
                         │  (https://api.apis.guru) │
                         │  - 3000+ API definitions │
                         │  - OpenAPI specifications│
                         │  - Real-time updates    │
                         └─────────────────────────┘
```

## Core Components

### 1. MCP Server Core (`src/server.ts`)
- **Protocol Implementation**: Full MCP JSON-RPC over stdio
- **Tool Management**: Dynamic tool registration and execution
- **Request Routing**: Efficient request distribution
- **Error Handling**: Comprehensive error management
- **Lifecycle Management**: Graceful startup and shutdown

### 2. Tool Registry (`src/tools/`)
Seven specialized tools for API discovery and retrieval:

#### Core Tools
1. **getProviders**: List all API providers (Google, Microsoft, etc.)
2. **getProvider**: Get all APIs from a specific provider
3. **getServices**: List services for a provider
4. **getAPI**: Retrieve specific API version metadata
5. **getServiceAPI**: Get API with service name
6. **listAPIs**: Complete directory listing
7. **getMetrics**: Directory statistics and metrics

#### Tool Implementation Pattern
```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  execute(params: any): Promise<any>;
}
```

### 3. Caching Layer (`src/cache/`)
- **Storage**: File-based JSON cache in `~/.cache/openapi-directory-mcp/`
- **TTL Management**: 24-hour default with configurable per-tool TTL
- **Cleanup**: Automatic expired entry removal and LRU eviction
- **Performance**: Cache-first strategy with API fallback

### 4. API Client (`src/client/`)
- **HTTP Client**: Node.js fetch with retry logic
- **Rate Limiting**: Respectful API usage
- **Error Handling**: Exponential backoff and graceful degradation
- **Response Validation**: Schema validation against OpenAPI specs

### 5. Type System (`src/types/`)
- **Generated Types**: Auto-generated from OpenAPI specification
- **Type Safety**: Full TypeScript coverage
- **Schema Validation**: Runtime parameter validation
- **API Contracts**: Strict interface definitions

## Tool Specifications

### Input/Output Schemas

#### getProviders
```typescript
// Input: None
// Output: { data: string[] }
```

#### getProvider
```typescript
// Input: { provider: string }
// Output: APIsResponse (object with API details)
```

#### getServices
```typescript
// Input: { provider: string }
// Output: { data: string[] }
```

#### getAPI
```typescript
// Input: { provider: string, api: string }
// Output: APIResponse (API metadata)
```

#### getServiceAPI
```typescript
// Input: { provider: string, service: string, api: string }
// Output: APIResponse (API metadata)
```

#### listAPIs
```typescript
// Input: None
// Output: APIsResponse (complete directory)
```

#### getMetrics
```typescript
// Input: None
// Output: MetricsResponse (directory statistics)
```

## Caching Strategy

### Cache Architecture
```
~/.cache/openapi-directory-mcp/
├── meta.json                    # Cache metadata
├── index.json                   # Cache index with TTL
└── data/
    ├── providers.json           # 24h TTL
    ├── provider-{name}.json     # 24h TTL
    ├── services-{provider}.json # 24h TTL
    ├── api-{provider}-{api}.json # 24h TTL
    ├── api-{provider}-{service}-{api}.json # 24h TTL
    ├── list.json                # 24h TTL
    └── metrics.json             # 1h TTL (more dynamic)
```

### Cache Operations
1. **Read**: Check TTL → Return if valid → Fetch if expired
2. **Write**: Store response with timestamp and TTL
3. **Cleanup**: Remove expired entries and LRU eviction
4. **Invalidate**: Manual cache clearing capability

### Performance Optimizations
- **Parallel Requests**: Concurrent cache operations
- **Lazy Loading**: Load cache entries on demand
- **Batch Operations**: Multiple cache operations in single transaction
- **Size Management**: LRU eviction when cache exceeds 100MB

## NPX Package Configuration

### Zero-Config Installation
```bash
npx openapi-directory-mcp
```

### Package Structure
```json
{
  "name": "openapi-directory-mcp",
  "version": "1.0.0",
  "bin": {
    "openapi-directory-mcp": "./dist/index.js"
  },
  "files": [
    "dist/**/*",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Claude Desktop Integration
```json
{
  "mcpServers": {
    "openapi-directory": {
      "command": "npx",
      "args": ["openapi-directory-mcp"]
    }
  }
}
```

## Development Workflow

### Project Structure
```
src/
├── index.ts                 # NPX entry point
├── server.ts               # MCP server implementation
├── tools/                  # Tool implementations
│   ├── providers.tool.ts
│   ├── provider.tool.ts
│   ├── services.tool.ts
│   ├── api.tool.ts
│   ├── service-api.tool.ts
│   ├── list.tool.ts
│   └── metrics.tool.ts
├── cache/                  # Caching layer
│   ├── file-cache.ts
│   └── cache.types.ts
├── client/                 # API client
│   ├── apis-guru.client.ts
│   └── http.client.ts
├── types/                  # Type definitions
│   ├── api.types.ts
│   └── mcp.types.ts
└── utils/                  # Shared utilities
    ├── logger.ts
    ├── validator.ts
    └── errors.ts
```

### Build Process
1. **TypeScript Compilation**: `tsc` with strict settings
2. **Type Generation**: Auto-generate from OpenAPI spec
3. **Executable Creation**: Shebang for NPX compatibility
4. **Testing**: Unit and integration tests
5. **Packaging**: NPM package preparation

## Error Handling

### Error Types
```typescript
class APIError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
  }
}

class CacheError extends Error {
  constructor(message: string, public operation: string) {
    super(message);
  }
}

class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
  }
}
```

### Error Strategy
1. **Validation Errors**: Return user-friendly messages
2. **API Errors**: Retry with exponential backoff
3. **Cache Errors**: Degrade gracefully to API calls
4. **Network Errors**: Fallback to cached data if available

## Security Considerations

### API Security
- **No Authentication**: APIs.guru is public
- **Rate Limiting**: Respect API limits
- **Input Validation**: Sanitize all parameters
- **Response Validation**: Validate against schemas

### Cache Security
- **User Isolation**: User-specific cache directories
- **File Permissions**: Proper cache file permissions
- **Path Traversal**: Prevent malicious path access
- **Size Limits**: Prevent cache bombing

## Performance Benchmarks

### Target Metrics
- **Cold Start**: < 2 seconds
- **Cache Hit**: < 50ms response time
- **Cache Miss**: < 500ms response time
- **Memory Usage**: < 100MB steady state
- **Cache Size**: < 100MB on disk

### Optimization Strategies
1. **Lazy Loading**: Load components on demand
2. **Parallel Processing**: Concurrent operations
3. **Efficient Serialization**: Optimized JSON handling
4. **Connection Pooling**: Reuse HTTP connections

## Testing Strategy

### Test Coverage
- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end tool execution
- **Performance Tests**: Load and stress testing
- **Cache Tests**: TTL and cleanup behavior
- **NPX Tests**: Package installation and execution

### Test Structure
```
tests/
├── unit/
│   ├── tools/
│   ├── cache/
│   └── client/
├── integration/
│   └── server.test.ts
└── fixtures/
    └── responses/
```

## Deployment and CI/CD

### GitHub Actions
1. **CI Pipeline**: Lint, test, build on PR
2. **Release Pipeline**: Automated NPM publishing
3. **Quality Gates**: Coverage and performance thresholds
4. **Security Scanning**: Vulnerability checks

### Release Process
1. **Semantic Versioning**: Automated version management
2. **Change Logs**: Generated from commit messages
3. **NPM Publishing**: Automated package publishing
4. **Documentation**: Auto-generated API docs

## Future Enhancements

### Planned Features
1. **Search Functionality**: Full-text API search
2. **API Comparison**: Compare different API versions
3. **Specification Fetching**: Direct OpenAPI spec retrieval
4. **GraphQL Support**: GraphQL endpoint integration
5. **Webhook Support**: Real-time update notifications

### Extension Points
- **Plugin System**: Custom tool development
- **Custom Caches**: Alternative cache backends
- **Middleware**: Request/response transformation
- **Metrics**: Custom monitoring and analytics

## Conclusion

The OpenAPI Directory MCP Server provides a comprehensive, production-ready solution for AI models to access the world's largest collection of API specifications. With its zero-config installation, intelligent caching, and robust architecture, it enables seamless API discovery and exploration while maintaining high performance and reliability.

The modular design ensures future extensibility while the comprehensive test suite and CI/CD pipeline guarantee quality and reliability. The AGPLv3 license ensures the project remains open source while encouraging contribution and collaboration.

This architecture serves as a foundation for building more sophisticated API tooling and demonstrates best practices for MCP server development in the rapidly evolving AI ecosystem.