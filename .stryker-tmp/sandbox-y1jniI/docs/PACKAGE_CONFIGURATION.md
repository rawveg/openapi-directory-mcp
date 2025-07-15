# Package Configuration for NPX

## Overview

This document outlines the complete package.json configuration for making the API Documentation MCP server available as an NPX package with zero-config installation and usage.

## Package.json Configuration

### Complete package.json
```json
{
  "name": "openapi-directory-mcp",
  "version": "1.0.0",
  "description": "MCP server for APIs.guru OpenAPI directory - access 3000+ API specifications",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "openapi-directory-mcp": "./dist/index.js"
  },
  "scripts": {
    "build": "npm run clean && tsc",
    "clean": "rimraf dist",
    "dev": "ts-node src/index.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts",
    "format:check": "prettier --check src/**/*.ts",
    "prepare": "npm run build",
    "prepublishOnly": "npm run test && npm run lint",
    "preversion": "npm run lint && npm run test",
    "version": "npm run format && git add -A src",
    "postversion": "git push && git push --tags"
  },
  "keywords": [
    "mcp",
    "model-context-protocol",
    "openapi",
    "api-documentation",
    "apis-guru",
    "swagger",
    "api-discovery",
    "ai-tools",
    "claude"
  ],
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com",
    "url": "https://github.com/yourusername"
  },
  "license": "AGPL-3.0",
  "homepage": "https://github.com/yourusername/openapi-directory-mcp#readme",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yourusername/openapi-directory-mcp.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/openapi-directory-mcp/issues"
  },
  "files": [
    "dist/**/*",
    "README.md",
    "LICENSE",
    "package.json"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.0",
    "jest": "^29.5.0",
    "prettier": "^3.0.0",
    "rimraf": "^5.0.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

## NPX Configuration

### Binary Entry Point
The `bin` field in package.json makes the package executable via NPX:

```json
{
  "bin": {
    "openapi-directory-mcp": "./dist/index.js"
  }
}
```

### Executable Script Header
The main entry file must include a shebang for NPX execution:

```typescript
#!/usr/bin/env node
/**
 * OpenAPI Directory MCP Server
 * 
 * NPX entry point for the APIs.guru MCP server
 */

import { Server } from './server.js';

async function main() {
  const server = new Server();
  await server.start();
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
```

## TypeScript Configuration

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "tests"
  ]
}
```

### tsconfig.test.json
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"]
  },
  "include": [
    "src/**/*",
    "tests/**/*"
  ]
}
```

## Build Configuration

### Build Process
```bash
# Clean previous build
npm run clean

# Compile TypeScript
tsc

# Make binary executable
chmod +x dist/index.js
```

### Build Script Enhancement
```json
{
  "scripts": {
    "build": "npm run clean && tsc && chmod +x dist/index.js",
    "build:watch": "tsc --watch",
    "build:prod": "npm run clean && tsc --build --verbose"
  }
}
```

## Publishing Configuration

### NPM Publishing
```json
{
  "files": [
    "dist/**/*",
    "README.md",
    "LICENSE",
    "package.json"
  ],
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

### Pre-publish Hooks
```json
{
  "scripts": {
    "prepublishOnly": "npm run test && npm run lint && npm run build",
    "preversion": "npm run lint && npm run test",
    "version": "npm run format && git add -A src",
    "postversion": "git push && git push --tags"
  }
}
```

## Usage Instructions

### Installation via NPX
```bash
# Direct execution (recommended)
npx openapi-directory-mcp

# Global installation
npm install -g openapi-directory-mcp
openapi-directory-mcp

# Local installation
npm install openapi-directory-mcp
./node_modules/.bin/openapi-directory-mcp
```

### Configuration in Claude Desktop

#### claude_desktop_config.json
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

#### Alternative Configuration
```json
{
  "mcpServers": {
    "openapi-directory": {
      "command": "node",
      "args": ["/path/to/openapi-directory-mcp/dist/index.js"]
    }
  }
}
```

## Development Workflow

### Development Scripts
```json
{
  "scripts": {
    "dev": "ts-node src/index.ts",
    "dev:watch": "nodemon --exec ts-node src/index.ts",
    "dev:debug": "ts-node --inspect src/index.ts",
    "test:dev": "jest --watch --verbose"
  }
}
```

### Development Dependencies
```json
{
  "devDependencies": {
    "nodemon": "^3.0.0",
    "ts-node": "^10.9.0",
    "concurrently": "^8.0.0"
  }
}
```

## Quality Assurance

### Linting Configuration
```json
{
  "scripts": {
    "lint": "eslint src/**/*.ts --ext .ts",
    "lint:fix": "eslint src/**/*.ts --ext .ts --fix",
    "lint:ci": "eslint src/**/*.ts --ext .ts --format json --output-file eslint-report.json"
  }
}
```

### Testing Configuration
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage --coverageReporters=text-lcov | coveralls",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

### Jest Configuration
```json
{
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "roots": ["<rootDir>/src", "<rootDir>/tests"],
    "testMatch": ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
    "collectCoverageFrom": [
      "src/**/*.ts",
      "!src/**/*.d.ts",
      "!src/**/*.test.ts",
      "!src/**/*.spec.ts"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## GitHub Actions Configuration

### .github/workflows/ci.yml
```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run tests
      run: npm run test:ci
    
    - name: Build
      run: npm run build
    
    - name: Test NPX execution
      run: |
        npm pack
        npx ./openapi-directory-mcp-*.tgz --version
```

### .github/workflows/release.yml
```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18.x'
        registry-url: 'https://registry.npmjs.org'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm run test:ci
    
    - name: Build
      run: npm run build
    
    - name: Publish to NPM
      run: npm publish
      env:
        NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Version Management

### Semantic Versioning
```bash
# Patch version (bug fixes)
npm version patch

# Minor version (new features)
npm version minor

# Major version (breaking changes)
npm version major
```

### Version Scripts
```json
{
  "scripts": {
    "version:patch": "npm version patch && npm publish",
    "version:minor": "npm version minor && npm publish",
    "version:major": "npm version major && npm publish"
  }
}
```

## Distribution Testing

### Test Installation
```bash
# Test local package
npm pack
npx ./openapi-directory-mcp-1.0.0.tgz

# Test published package
npx openapi-directory-mcp@latest
```

### Verification Script
```bash
#!/bin/bash
# verify-package.sh

echo "Testing package installation and execution..."

# Test NPX execution
if npx openapi-directory-mcp --version; then
  echo "✅ NPX execution successful"
else
  echo "❌ NPX execution failed"
  exit 1
fi

# Test global installation
if npm install -g openapi-directory-mcp; then
  echo "✅ Global installation successful"
else
  echo "❌ Global installation failed"
  exit 1
fi

# Test direct execution
if openapi-directory-mcp --version; then
  echo "✅ Direct execution successful"
else
  echo "❌ Direct execution failed"
  exit 1
fi

echo "✅ All package tests passed!"
```

## Performance Optimization

### Bundle Analysis
```json
{
  "scripts": {
    "analyze": "npm run build && bundlesize",
    "bundle:analyze": "webpack-bundle-analyzer dist/index.js"
  }
}
```

### Size Optimization
```json
{
  "bundlesize": [
    {
      "path": "./dist/index.js",
      "maxSize": "50 KB"
    }
  ]
}
```