# Project Structure and File Organization

## Directory Layout

```
openapi-directory-mcp/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # CI/CD pipeline
│       └── release.yml            # NPM release automation
├── src/
│   ├── index.ts                   # MCP server entry point
│   ├── server.ts                  # Main server implementation
│   ├── types/
│   │   ├── index.ts              # Exported types
│   │   ├── api.types.ts          # APIs.guru API types
│   │   └── mcp.types.ts          # MCP-specific types
│   ├── tools/
│   │   ├── index.ts              # Tool registry
│   │   ├── providers.tool.ts     # getProviders implementation
│   │   ├── provider.tool.ts      # getProvider implementation
│   │   ├── services.tool.ts      # getServices implementation
│   │   ├── api.tool.ts           # getAPI implementation
│   │   ├── service-api.tool.ts   # getServiceAPI implementation
│   │   ├── list.tool.ts          # listAPIs implementation
│   │   └── metrics.tool.ts       # getMetrics implementation
│   ├── cache/
│   │   ├── index.ts              # Cache manager interface
│   │   ├── file-cache.ts         # File-based cache implementation
│   │   └── cache.types.ts        # Cache-related types
│   ├── client/
│   │   ├── index.ts              # API client interface
│   │   ├── apis-guru.client.ts   # APIs.guru API client
│   │   └── http.client.ts        # Base HTTP client with retry
│   ├── utils/
│   │   ├── logger.ts             # Logging utilities
│   │   ├── validator.ts          # Parameter validation
│   │   ├── transformer.ts        # Response transformations
│   │   └── errors.ts             # Custom error classes
│   └── config/
│       ├── index.ts              # Configuration loader
│       └── defaults.ts           # Default configuration
├── tests/
│   ├── unit/
│   │   ├── tools/                # Tool-specific tests
│   │   ├── cache/                # Cache tests
│   │   └── client/               # Client tests
│   ├── integration/
│   │   └── server.test.ts        # Server integration tests
│   └── fixtures/
│       └── responses/            # Mock API responses
├── docs/
│   ├── ARCHITECTURE.md           # Architecture documentation
│   ├── PROJECT_STRUCTURE.md      # This file
│   ├── CACHE_STRATEGY.md         # Cache implementation details
│   ├── TOOL_GENERATION.md        # Tool generation approach
│   └── openapi.yaml              # APIs.guru OpenAPI spec
├── examples/
│   ├── basic-usage.ts            # Basic usage example
│   ├── cache-management.ts       # Cache management example
│   └── advanced-queries.ts       # Advanced query patterns
├── scripts/
│   ├── generate-types.ts         # Generate types from OpenAPI
│   ├── build.ts                  # Build script
│   └── prepare-release.ts        # Release preparation
├── .vscode/
│   ├── settings.json             # VSCode settings
│   └── launch.json               # Debug configurations
├── dist/                         # Compiled output (gitignored)
├── node_modules/                 # Dependencies (gitignored)
├── .cache/                       # Local cache (gitignored)
├── package.json                  # Package configuration
├── tsconfig.json                 # TypeScript configuration
├── .gitignore                    # Git ignore rules
├── .npmignore                    # NPM ignore rules
├── .eslintrc.json               # ESLint configuration
├── .prettierrc                   # Prettier configuration
├── jest.config.js               # Jest configuration
├── LICENSE                       # AGPLv3 license
└── README.md                     # Project documentation
```

## Key Files Description

### Entry Points

#### `src/index.ts`
```typescript
#!/usr/bin/env node
// NPX entry point that initializes and starts the MCP server
```

#### `src/server.ts`
```typescript
// Main server class implementing the MCP protocol
// Handles tool registration, request routing, and lifecycle
```

### Tool Implementations

Each tool follows a consistent pattern:
```typescript
// src/tools/{toolname}.tool.ts
export interface {ToolName}Params {
  // Tool-specific parameters
}

export class {ToolName}Tool implements Tool {
  name = '{toolName}';
  description = '...';
  
  async execute(params: {ToolName}Params): Promise<{ResponseType}> {
    // Implementation
  }
}
```

### Cache Layer

#### `src/cache/file-cache.ts`
- Implements file-based caching with TTL
- Handles cache key generation
- Manages cache invalidation

### API Client

#### `src/client/apis-guru.client.ts`
- Wraps APIs.guru API endpoints
- Implements retry logic
- Handles response transformation

## Module Organization

### Core Modules
1. **Server Module**: MCP server implementation
2. **Tools Module**: Tool definitions and registry
3. **Cache Module**: Caching implementations
4. **Client Module**: API client implementations
5. **Utils Module**: Shared utilities

### Module Dependencies
```
index.ts
    └── server.ts
        ├── tools/
        │   └── client/
        │       └── cache/
        └── utils/
```

## Build Output Structure

```
dist/
├── index.js                    # Compiled entry point
├── index.d.ts                  # Type definitions
├── server.js
├── server.d.ts
├── tools/
├── cache/
├── client/
├── utils/
└── types/
```

## Configuration Files

### TypeScript Configuration
- **Target**: ES2022
- **Module**: CommonJS (for NPX compatibility)
- **Strict**: Enabled
- **Source Maps**: Enabled

### ESLint Configuration
- **Extends**: typescript-recommended
- **Rules**: Consistent code style
- **Ignores**: dist/, node_modules/

### Jest Configuration
- **Test Environment**: Node
- **Coverage**: 80% threshold
- **Transform**: ts-jest

## Development Setup Files

### `.vscode/settings.json`
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### `.vscode/launch.json`
```json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug MCP Server",
      "program": "${workspaceFolder}/src/index.ts",
      "preLaunchTask": "tsc: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```