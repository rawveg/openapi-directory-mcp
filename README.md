<h1 align="center">OpenAPI Directory MCP Server</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/openapi-directory-mcp"><img src="https://img.shields.io/npm/v/openapi-directory-mcp.svg?style=flat-square&aaa=1" alt="NPM Version"></a>
  <a href="https://github.com/rawveg/openapi-directory-mcp/blob/main/LICENSE"><img src="https://img.shields.io/github/license/rawveg/openapi-directory-mcp.svg?style=flat-square&aaa=1" alt="License"></a>
  <a href="https://github.com/rawveg/openapi-directory-mcp"><img src="https://img.shields.io/github/stars/rawveg/openapi-directory-mcp?style=flat-square&aaa=1" alt="GitHub Stars"></a>
  <a href="https://github.com/sponsors/rawveg"><img src="https://img.shields.io/badge/sponsor-%E2%9D%A4-lightgrey?style=flat-square&aaa=1" alt="Sponsor"></a>
</p>

---


A Model Context Protocol (MCP) server that provides access to the APIs.guru directory - the world's largest repository of OpenAPI specifications with over 3,000 API Specs from 600+ providers.

## Table of Contents

- [Acknowledgments](#acknowledgments)
- [Features](#features)
- [Context Optimization & Progressive Discovery](#-context-optimization--progressive-discovery)
- [Quick Start](#-quick-start)
- [Available Tools](#%EF%B8%8F-available-tools)
- [Available Resources](#-available-resources)
- [Available Prompts](#-available-prompts-context-optimized)
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
| **Comprehensive API Coverage**| Access to 3,000+ API specs from APIs.guru                    |
| **Context Optimized**         | Progressive discovery reduces context usage by ~95%          |
| **Intelligent Caching**       | 24-hour TTL caching for optimal performance                  |
| **Rich Tool Set**             | 17 specialized tools for API discovery and endpoint analysis |
| **Paginated Resources**       | Efficient data access with pagination support                |
| **NPX Ready**                 | Install and run with a single command                        |
| **Type Safe**                 | Built with TypeScript for reliability                        |

---

## 🎯 Context Optimization & Progressive Discovery

This MCP server implements a **progressive discovery approach** that dramatically reduces context usage, allowing you to explore many more APIs before hitting context limits.

### The Problem
Traditional API discovery tools return massive amounts of data that quickly saturate LLM context windows. For example, searching for "social media APIs" and fetching their full specifications could exhaust your context before providing useful answers.

### Our Solution: 95% Context Reduction
We've redesigned the discovery workflow into three efficient phases:

**🔍 Phase 1: Initial Discovery**
- `search_apis` returns minimal, paginated results (20 per page)
- `openapi://apis/summary` provides directory overview
- Quick browsing of 1,000+ APIs without context overload

**📋 Phase 2: Basic Evaluation**  
- `get_api_summary` provides essential details without endpoints
- Authentication, documentation, categories, and provider info
- Compare multiple APIs efficiently

**⚙️ Phase 3: Detailed Analysis**
- `get_endpoints` shows paginated endpoint lists (30 per page)
- `get_endpoint_details` for specific endpoint information
- `get_endpoint_schema` and `get_endpoint_examples` for implementation

### Smart Prompts Guide You
All 7 built-in prompts automatically use this progressive approach:
- `api_discovery` guides you through efficient API exploration
- `api_integration_guide` uses progressive endpoint discovery
- Each prompt prevents context saturation while maximizing useful information

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

### Core API Discovery Tools (Context Optimized)

| Tool                  | Description                                    |
|-----------------------|------------------------------------------------|
| `get_providers`       | List all API providers                         |
| `get_provider_apis`   | Get APIs for a specific provider               |
| `get_provider_services`| Get services for a provider                   |
| `get_api`             | Get detailed API information                   |
| `list_all_apis`       | ⚠️ **Use with caution** - Returns massive data |
| `get_metrics`         | Directory statistics                           |
| `search_apis`         | 🎯 **Paginated search** (20 results max per page) |

### Progressive Discovery Tools (Recommended)

| Tool                | Description                                      |
|---------------------|--------------------------------------------------|
| `get_api_summary`   | 📋 **Phase 2** - Basic API info without endpoints |
| `get_endpoints`     | ⚙️ **Phase 3** - Paginated endpoint list (30 per page) |
| `get_endpoint_details`| ⚙️ **Phase 3** - Detailed endpoint information |
| `get_endpoint_schema`| ⚙️ **Phase 3** - Request/response schemas |
| `get_endpoint_examples`| ⚙️ **Phase 3** - Request/response examples |

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

### Context-Optimized Resources

| Resource                  | Description                                      |
|---------------------------|--------------------------------------------------|
| `openapi://providers`     | Complete provider list                           |
| `openapi://metrics`       | Directory metrics                                |
| `openapi://apis/summary`  | 🎯 **Recommended** - Directory overview with popular APIs |

### Paginated API Resources

| Resource                  | Description                                      |
|---------------------------|--------------------------------------------------|
| `openapi://apis/page/1`   | 🔍 **Phase 1** - APIs 1-50 with minimal data    |
| `openapi://apis/page/2`   | 🔍 **Phase 1** - APIs 51-100 with minimal data  |
| `...`                     | Pages 1-20 available (50 APIs per page)         |
| `openapi://apis/page/20`  | 🔍 **Phase 1** - APIs 951-1000 with minimal data|

**Note**: The previous `openapi://list` resource has been removed as it exceeded context limits with massive data. Use the paginated `openapi://apis/page/N` resources or `openapi://apis/summary` instead.

---

## 💡 Available Prompts (Context-Optimized)

All prompts automatically use the progressive discovery workflow to prevent context saturation:

| Prompt                       | Purpose                                      | Workflow                |
|------------------------------|----------------------------------------------|-------------------------|
| `api_discovery`              | 🎯 **Most Popular** - Discover APIs for use cases | 3-phase progressive discovery |
| `api_integration_guide`      | Step-by-step integration guide for APIs       | Progressive endpoint exploration |
| `api_comparison`             | Compare multiple APIs for functionality       | Efficient API summaries  |
| `authentication_guide`       | Understand API authentication methods         | Focused auth analysis    |
| `code_generation`            | Generate code examples for API usage          | Endpoint-specific examples |
| `api_documentation_analysis` | Analyze API capabilities and limitations      | Progressive capability mapping |
| `troubleshooting_guide`      | Debug API integration issues                  | Targeted problem analysis |

**💡 Pro Tip**: Start with `api_discovery` prompt for any use case - it guides you through the most efficient exploration workflow.

## Configuration

The server works with zero configuration but supports customization via environment variables:

```bash
export OPENAPI_DIRECTORY_CACHE_TTL=86400  # Cache TTL in seconds (default: 24 hours)
export OPENAPI_DIRECTORY_BASE_URL=https://api.apis.guru/v2  # Base API URL
export OPENAPI_DIRECTORY_CACHE_DIR=~/.cache/openapi-directory-mcp  # Cache directory
```

---

## 🧑‍💻 Example Usage

### 🎯 Progressive Discovery Workflow (Recommended)

```javascript
// Phase 1: Initial Discovery (Context-efficient search)
const searchResults = await search_apis({ 
  query: "payment", 
  page: 1, 
  limit: 20 
});

// Phase 2: Basic Evaluation (Get summaries for promising APIs)
const stripeInfo = await get_api_summary({ api_id: "stripe.com" });
const paypalInfo = await get_api_summary({ api_id: "paypal.com" });

// Phase 3: Detailed Analysis (Only for chosen API)
const endpoints = await get_endpoints({ 
  api_id: "stripe.com", 
  page: 1, 
  limit: 30 
});

// Get specific endpoint details for implementation
const paymentEndpoint = await get_endpoint_details({
  api_id: "stripe.com",
  method: "POST", 
  path: "/v1/charges"
});

// Get schemas and examples for coding
const schemas = await get_endpoint_schema({
  api_id: "stripe.com",
  method: "POST", 
  path: "/v1/charges"
});

const examples = await get_endpoint_examples({
  api_id: "stripe.com",
  method: "POST", 
  path: "/v1/charges"
});
```

### 📋 Efficient Resource Access

```javascript
// Get directory overview (recommended starting point)
const summary = await readResource("openapi://apis/summary");

// Browse APIs in pages (50 per page)
const page1 = await readResource("openapi://apis/page/1");
const page2 = await readResource("openapi://apis/page/2");

// ⚠️ Avoid this - returns massive data
// const allApis = await list_all_apis(); // Can saturate context!
```

### 🎯 Smart Prompt Usage

```javascript
// Best practice: Use api_discovery prompt for any use case
// Prompt: api_discovery  
// Arguments: { 
//   use_case: "send emails", 
//   requirements: "free tier available, good documentation" 
// }

// The prompt automatically guides through:
// 1. Efficient search with pagination
// 2. API summaries for comparison  
// 3. Progressive endpoint discovery
// 4. Implementation details only when needed

// Integration guide with progressive approach
// Prompt: api_integration_guide
// Arguments: { 
//   api_name: "Gmail API", 
//   programming_language: "JavaScript",
//   use_case: "send automated notifications"
// }
```

### Legacy Tools (Use with Caution)

```javascript
// These work but can consume lots of context:
const metrics = await get_metrics();
const providerStats = await get_provider_stats({ provider: "amazonaws.com" });
const popularApis = await get_popular_apis({ limit: 10 });
```

---

## 🏗️ Architecture

The server uses a modular, context-optimized architecture:

- **API Client**: Handles communication with APIs.guru with progressive data fetching
- **Cache Manager**: Implements 24-hour TTL caching for performance
- **Tool Generator**: Creates MCP tools with pagination and context limits
- **Resource Handler**: Manages paginated resource streaming (20 pages of 50 APIs each)
- **Progressive Discovery**: Smart workflow guides preventing context saturation
- **Prompt System**: 7 context-aware prompts using efficient discovery patterns

---

## ⚡ Performance

| Metric              | Value                         |
|---------------------|-------------------------------|
| **Cold Start**      | < 2 seconds                   |
| **Cache Hit**       | < 50ms response time          |
| **Cache Miss**      | < 500ms response time         |
| **Memory**          | < 100MB steady state          |
| **Context Usage**   | 🎯 **95% reduction** vs traditional approaches |
| **API Discovery**   | Explore 100+ APIs before context limits |
| **Pagination**      | 20-50 results per request (configurable) |

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
