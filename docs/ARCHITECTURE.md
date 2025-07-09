# API Documentation MCP Server Architecture

## Overview

The API Documentation MCP (Model Context Protocol) server provides a seamless interface to the APIs.guru directory, exposing over 3,000 API definitions through dynamically generated tools. This server enables AI models to discover, explore, and retrieve API documentation from the world's largest collection of OpenAPI specifications.

## Core Architecture Components

### 1. MCP Server Core
- **Framework**: @modelcontextprotocol/sdk
- **Runtime**: Node.js 18+
- **Protocol**: JSON-RPC over stdio
- **License**: AGPLv3

### 2. Tool Generation Engine
- **Dynamic Tool Creation**: Generates MCP tools from OpenAPI endpoints
- **Schema Validation**: Validates parameters against OpenAPI schemas
- **Type Safety**: TypeScript interfaces generated from OpenAPI types

### 3. Caching Layer
- **Storage**: File-based cache with JSON serialization
- **TTL**: 24-hour time-to-live for API responses
- **Strategy**: Cache-first with fallback to API
- **Location**: `~/.cache/openapi-directory-mcp/`

### 4. API Client
- **HTTP Client**: Node.js fetch API
- **Base URL**: https://api.apis.guru/v2
- **Error Handling**: Exponential backoff with retry
- **Response Validation**: Against OpenAPI schemas

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        AI Model/Client                       │
└─────────────────────┬───────────────────────────────────────┘
                      │ MCP Protocol (JSON-RPC)
┌─────────────────────▼───────────────────────────────────────┐
│                    MCP Server Core                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │               Tool Registry                          │    │
│  │  - getProviders    - getAPI                        │    │
│  │  - getProvider     - getServiceAPI                 │    │
│  │  - getServices     - listAPIs                      │    │
│  │  - getMetrics                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            Request Handler Pipeline                  │    │
│  │  1. Parameter Validation                            │    │
│  │  2. Cache Check                                     │    │
│  │  3. API Call (if needed)                           │    │
│  │  4. Response Transformation                         │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────┬──────────────────────┬─────────────────────────┘
             │                      │
┌────────────▼────────┐  ┌──────────▼──────────┐
│   Caching Layer     │  │   API Client         │
│  - File-based       │  │  - HTTP/HTTPS        │
│  - 24h TTL          │  │  - Retry logic       │
│  - JSON storage     │  │  - Rate limiting     │
└─────────────────────┘  └───────────┬─────────┘
                                      │
                         ┌────────────▼────────────┐
                         │   APIs.guru API         │
                         │  https://api.apis.guru  │
                         └─────────────────────────┘
```

## Tool Definitions

### 1. getProviders
- **Purpose**: List all API providers in the directory
- **Cache Key**: `providers`
- **Response**: Array of provider names

### 2. getProvider
- **Purpose**: List all APIs for a specific provider
- **Parameters**: `provider` (string)
- **Cache Key**: `provider:{provider}`
- **Response**: APIs object with API details

### 3. getServices
- **Purpose**: List all services for a provider
- **Parameters**: `provider` (string)
- **Cache Key**: `services:{provider}`
- **Response**: Array of service names

### 4. getAPI
- **Purpose**: Get specific API version
- **Parameters**: `provider` (string), `api` (string)
- **Cache Key**: `api:{provider}:{api}`
- **Response**: API metadata and links

### 5. getServiceAPI
- **Purpose**: Get API with service name
- **Parameters**: `provider` (string), `service` (string), `api` (string)
- **Cache Key**: `api:{provider}:{service}:{api}`
- **Response**: API metadata and links

### 6. listAPIs
- **Purpose**: List all APIs in the directory
- **Cache Key**: `list`
- **Response**: Complete API directory

### 7. getMetrics
- **Purpose**: Get directory metrics
- **Cache Key**: `metrics`
- **Response**: Statistics about the directory

## Caching Strategy

### Cache Structure
```
~/.cache/openapi-directory-mcp/
├── cache.json          # Cache metadata
└── data/
    ├── providers.json
    ├── provider-{name}.json
    ├── services-{provider}.json
    ├── api-{provider}-{api}.json
    ├── api-{provider}-{service}-{api}.json
    ├── list.json
    └── metrics.json
```

### Cache Operations
1. **Read**: Check TTL → Return if valid → Fetch if expired
2. **Write**: Store response + timestamp
3. **Invalidate**: Remove expired entries on startup
4. **Clear**: Manual cache clear command

## Error Handling

### API Errors
- **4xx**: Return user-friendly error messages
- **5xx**: Retry with exponential backoff
- **Network**: Fallback to cached data if available

### Validation Errors
- Parameter validation before API calls
- Schema validation for responses
- Type checking for tool inputs

## Security Considerations

1. **API Key Management**: No authentication required for APIs.guru
2. **Input Sanitization**: Validate all parameters
3. **Rate Limiting**: Respect API rate limits
4. **Cache Security**: User-specific cache directories

## Performance Optimizations

1. **Parallel Requests**: Batch related API calls
2. **Lazy Loading**: Load tools on demand
3. **Stream Processing**: For large API lists
4. **Compression**: Gzip for cache storage

## Extensibility

### Plugin Architecture
- Tool loader interface
- Custom cache backends
- Response transformers
- Middleware pipeline

### Future Enhancements
1. GraphQL endpoint support
2. API specification fetching
3. Search functionality
4. API comparison tools
5. Version diff utilities

## Development Workflow

### Build Process
1. TypeScript compilation
2. Schema generation from OpenAPI
3. Tool registration
4. Bundle optimization

### Testing Strategy
- Unit tests for each component
- Integration tests with mock API
- E2E tests with real API
- Cache behavior tests

### Deployment
- NPX package for zero-config usage
- Docker container option
- CI/CD with GitHub Actions
- Semantic versioning