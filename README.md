<h1 align="center">OpenAPI Directory MCP Server</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/openapi-directory-mcp"><img src="https://img.shields.io/npm/v/openapi-directory-mcp.svg?style=flat-square&aaa=1" alt="NPM Version"></a>
  <a href="https://github.com/rawveg/openapi-directory-mcp/blob/main/LICENSE"><img src="https://img.shields.io/github/license/rawveg/openapi-directory-mcp.svg?style=flat-square&aaa=1" alt="License"></a>
  <a href="https://github.com/rawveg/openapi-directory-mcp/actions"><img src="https://img.shields.io/github/actions/workflow/status/rawveg/openapi-directory-mcp/ci.yml?branch=main&style=flat-square&aaa=1" alt="Build Status"></a>
  <a href="https://github.com/rawveg/openapi-directory-mcp"><img src="https://img.shields.io/github/stars/rawveg/openapi-directory-mcp?style=flat-square&aaa=1" alt="GitHub Stars"></a>
  <a href="https://github.com/sponsors/rawveg"><img src="https://img.shields.io/badge/sponsor-%E2%9D%A4-lightgrey?style=flat-square&aaa=1" alt="Sponsor"></a>
</p>

---


A Model Context Protocol (MCP) server that provides access to the APIs.guru directory - the world's largest repository of OpenAPI specifications with over 3,000 APIs from 600+ providers.

## Table of Contents

- [Acknowledgments](#acknowledgments)
- [Features](#features)
- [Quick Start](#-quick-start)
- [Available Tools](#%EF%B8%8F-available-tools)
- [Available Resources](#-available-resources)
- [Available Prompts](#-available-prompts)
- [Configuration](#configuration)
- [Example Usage](#-example-usage)
- [Architecture](#%EF%B8%8F-architecture)
- [Performance](#-performance)
- [Development](#development)
- [Contributing](#-contributing)
- [License](#-license)
- [Support This Project](#%EF%B8%8F-support-this-project)
- [Support](#support)
- [Credits](#-credits)

---

## Acknowledgments

This project builds upon the exceptional work of [APIs.guru](https://apis.guru) and their comprehensive [OpenAPI Directory](https://github.com/APIs-guru/openapi-directory). The APIs.guru project maintains the largest repository of machine-readable API definitions, providing an invaluable resource to the developer community through their free API service at https://api.apis.guru/v2.

Their dedication to creating and maintaining this comprehensive directory of OpenAPI specifications makes projects like this possible. We are deeply grateful for their contribution to the open source ecosystem and their commitment to making API discovery accessible to everyone.

The source data is provided under the Creative Commons Zero v1.0 Universal License, reflecting their generous approach to knowledge sharing.

---

## Features

| Feature                       | Description                                                  |
|-------------------------------|--------------------------------------------------------------|
| **Zero Configuration**        | Works out of the box with sensible defaults                  |
| **Comprehensive API Coverage**| Access to 3,000+ APIs from APIs.guru                         |
| **Intelligent Caching**       | 24-hour TTL caching for optimal performance                  |
| **Rich Tool Set**             | 13 specialized tools for API discovery and analysis           |
| **NPX Ready**                 | Install and run with a single command                        |
| **Type Safe**                 | Built with TypeScript for reliability                        |

---

## 🚀 Quick Start

### Local Development Setup

1. **Clone and build**:
```bash
git clone https://github.com/rawveg/openapi-directory-mcp.git
cd openapi-directory-mcp
npm install
npm run build
```

2. **Test locally**:
```bash
node dist/index.js
```

### Configuration for Local Development

#### Claude Desktop (Local)
```json
{
  "mcpServers": {
    "openapi-directory": {
      "command": "node",
      "args": ["/path/to/openapi-directory-mcp/dist/index.js"],
      "cwd": "/path/to/openapi-directory-mcp"
    }
  }
}
```

#### Claude Code (Local)
```bash
claude mcp add openapi-directory -- node /absolute/path/to/openapi-directory-mcp/dist/index.js
```

#### Cursor (Local)
```json
{
  "mcp.servers": {
    "openapi-directory": {
      "command": "node",
      "args": ["/path/to/openapi-directory-mcp/dist/index.js"],
      "cwd": "/path/to/openapi-directory-mcp"
    }
  }
}
```

#### Windsurf (Local)
```json
{
  "servers": {
    "openapi-directory": {
      "command": "node /path/to/openapi-directory-mcp/dist/index.js"
    }
  }
}
```

### NPX Installation (After Publishing)

**Note**: This package is not yet published to NPM. Once published, you can use:

```bash
npx -y openapi-directory-mcp
```

#### Claude Desktop (NPX)
```json
{
  "mcpServers": {
    "openapi-directory": {
      "command": "npx",
      "args": ["-y", "openapi-directory-mcp"]
    }
  }
}
```

#### Claude Code (NPX)
```bash
claude mcp add openapi-directory -- npx -y openapi-directory-mcp
```

**Claude Code MCP Management**:
```bash
# List all configured MCP servers
claude mcp list

# Get details about the server
claude mcp get openapi-directory

# Remove the server
claude mcp remove openapi-directory

# Check server status in chat
/mcp
```

#### Cursor (NPX)
```json
{
  "mcp.servers": {
    "openapi-directory": {
      "command": "npx",
      "args": ["-y", "openapi-directory-mcp"]
    }
  }
}
```

#### Windsurf (NPX)
```json
{
  "servers": {
    "openapi-directory": {
      "command": "npx -y openapi-directory-mcp"
    }
  }
}
```

---

## 🛠️ Available Tools

### Core API Discovery Tools

| Tool                  | Description                       |
|-----------------------|-----------------------------------|
| `get_providers`       | List all API providers            |
| `get_provider_apis`   | Get APIs for a specific provider  |
| `get_provider_services`| Get services for a provider      |
| `get_api`             | Get detailed API information      |
| `list_all_apis`       | List all APIs with metadata       |
| `get_metrics`         | Directory statistics              |
| `search_apis`         | Search APIs by keywords           |

### Utility Tools

| Tool                | Description                |
|---------------------|----------------------------|
| `get_popular_apis`  | Get popular APIs           |
| `get_recently_updated`| Get recently updated APIs |
| `get_provider_stats`| Provider statistics        |
| `get_openapi_spec`  | Fetch OpenAPI specifications|
| `analyze_api_categories`| Analyze API categories   |

---

## 📦 Available Resources

| Resource                  | Description             |
|---------------------------|-------------------------|
| `openapi://providers`     | Complete provider list  |
| `openapi://metrics`       | Directory metrics       |
| `openapi://list`          | Complete API list       |

---

## 💡 Available Prompts

| Prompt                       | Purpose                                      |
|------------------------------|----------------------------------------------|
| `api_discovery`              | Help discover APIs for specific use cases     |
| `api_integration_guide`      | Step-by-step integration guide for APIs       |
| `api_comparison`             | Compare multiple APIs for functionality       |
| `authentication_guide`       | Understand API authentication methods         |
| `code_generation`            | Generate code examples for API usage          |
| `api_documentation_analysis` | Analyze API capabilities and limitations      |
| `troubleshooting_guide`      | Debug API integration issues                  |

## Configuration

The server works with zero configuration but supports customization via environment variables:

```bash
export OPENAPI_DIRECTORY_CACHE_TTL=86400  # Cache TTL in seconds (default: 24 hours)
export OPENAPI_DIRECTORY_BASE_URL=https://api.apis.guru/v2  # Base API URL
export OPENAPI_DIRECTORY_CACHE_DIR=~/.cache/openapi-directory-mcp  # Cache directory
```

---

## 🧑‍💻 Example Usage

### Find APIs by Provider

```javascript
// Get all Google APIs
const googleApis = await get_provider_apis({ provider: "googleapis.com" });

// Get specific API details
const driveApi = await get_api({ provider: "googleapis.com", api: "drive:v3" });
```

### Search for APIs

```javascript
// Search for payment APIs
const paymentApis = await search_apis({ query: "payment" });

// Get popular APIs
const popularApis = await get_popular_apis({ limit: 10 });
```

### Get API Statistics

```javascript
// Get directory metrics
const metrics = await get_metrics();

// Get provider statistics
const providerStats = await get_provider_stats({ provider: "amazonaws.com" });
```

### Use MCP Prompts

```javascript
// Discover APIs for a specific use case
// Prompt: api_discovery
// Arguments: { use_case: "send emails", requirements: "free tier available" }

// Generate integration guide for an API
// Prompt: api_integration_guide  
// Arguments: { api_name: "Gmail API", programming_language: "JavaScript" }

// Compare multiple APIs
// Prompt: api_comparison
// Arguments: { apis: "stripe.com, paypal.com, square.com", criteria: "pricing, features" }
```

---

## 🏗️ Architecture

The server uses a modular architecture with:

- **API Client**: Handles communication with APIs.guru
- **Cache Manager**: Implements 24-hour TTL caching
- **Tool Generator**: Creates MCP tools from OpenAPI specs
- **Resource Handler**: Manages resource streaming

---

## ⚡ Performance

| Metric         | Value                      |
|----------------|----------------------------|
| **Cold Start** | < 2 seconds                |
| **Cache Hit**  | < 50ms response time       |
| **Cache Miss** | < 500ms response time      |
| **Memory**     | < 100MB steady state       |

## Development

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Setup

```bash
git clone https://github.com/rawveg/openapi-directory-mcp.git
cd openapi-directory-mcp
npm install
```

### Development Workflow

```bash
# Build the project
npm run build

# Run locally for testing
node dist/index.js

# Run tests
npm test
npm run test:coverage

# Development with auto-rebuild
npm run dev

# Lint code
npm run lint
npm run lint:fix
```

### Publishing to NPM

```bash
# Ensure you're logged in to NPM
npm login

# Build and test
npm run build
npm test

# Publish (automatically runs prepublishOnly script)
npm publish

# Or publish with specific tag
npm publish --tag beta
```

### Local Testing with MCP Clients

After building, you can test with any MCP client using the absolute path:

```bash
# Get absolute path
pwd
# Example: /Users/yourname/projects/openapi-directory-mcp

# Use in client config:
node /Users/yourname/projects/openapi-directory-mcp/dist/index.js
```

### Testing NPX Package Locally

To test the NPX installation before publishing:

```bash
# Create a local package
npm pack

# Test NPX installation from local tarball
npx ./openapi-directory-mcp-1.0.0.tgz
```

#### Option 1: Use Tarball Directly
```bash
# Claude Code with local tarball
claude mcp add openapi-directory -- npx -y ./openapi-directory-mcp-1.0.0.tgz

# Claude Desktop with local tarball
{
  "mcpServers": {
    "openapi-directory": {
      "command": "npx",
      "args": ["-y", "./openapi-directory-mcp-1.0.0.tgz"],
      "cwd": "/Users/yourname/projects/openapi-directory-mcp"
    }
  }
}
```

#### Option 2: Install Globally First
```bash
# Install globally for testing
npm install -g ./openapi-directory-mcp-1.0.0.tgz

# Find the installed binary path
which openapi-directory-mcp

# Use direct path (NPX still tries to fetch from registry)
claude mcp add openapi-directory -- /path/to/openapi-directory-mcp

# For Claude Desktop, use direct path
{
  "mcpServers": {
    "openapi-directory": {
      "command": "/path/to/openapi-directory-mcp"
    }
  }
}

# Uninstall when done testing
npm uninstall -g openapi-directory-mcp
```

**Note**: Even with global installation, `npx openapi-directory-mcp` will try to fetch from the NPM registry first and fail with 404. Use the direct binary path instead.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## ❤️ Support This Project

> **If you find this MCP server valuable, especially if you're using it in a commercial context, please consider supporting its development through [GitHub Sponsors](https://github.com/sponsors/rawveg).**

### Our Commitment

> **All sponsorship proceeds for this project are shared equally (50/50) with the [APIs.guru](https://apis.guru) project in recognition of their foundational work and the ongoing costs of maintaining the API infrastructure this project depends upon.**

> By sponsoring this project, you're not just supporting this MCP server - you're helping sustain the entire ecosystem that makes comprehensive API discovery possible. APIs.guru maintains over 3,000 API specifications and provides free API access to the developer community. Your support helps keep this invaluable resource available for everyone.

## Support

| Support Type  | Link                                                            |
|--------------|-----------------------------------------------------------------|
| **Issues**   | [GitHub Issues](https://github.com/rawveg/openapi-directory-mcp/issues)        |
| **Docs**     | [API Reference](docs/API.md)                                     |
| **Examples** | [Examples Directory](examples/)                                  |

---

## 🙏 Credits

- Built with [Model Context Protocol](https://github.com/modelcontextprotocol/specification)
- API data from [APIs.guru](https://apis.guru/)
- Maintained by the OpenAPI Directory MCP team