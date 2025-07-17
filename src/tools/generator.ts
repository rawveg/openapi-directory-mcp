import { Tool } from "@modelcontextprotocol/sdk/types.js";

export class ToolGenerator {
  /**
   * Generate all available tools for the MCP server
   */
  async generateTools(): Promise<Tool[]> {
    const tools: Tool[] = [
      {
        name: "get_providers",
        description: "List all API providers in the directory",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "get_provider_apis",
        description: "List all APIs for a specific provider",
        inputSchema: {
          type: "object",
          properties: {
            provider: {
              type: "string",
              description:
                'Provider name (e.g., "googleapis.com", "azure.com")',
            },
          },
          required: ["provider"],
        },
      },
      {
        name: "get_provider_services",
        description: "List all services for a specific provider",
        inputSchema: {
          type: "object",
          properties: {
            provider: {
              type: "string",
              description:
                'Provider name (e.g., "googleapis.com", "azure.com")',
            },
          },
          required: ["provider"],
        },
      },
      {
        name: "get_api",
        description: "Get detailed information about a specific API",
        inputSchema: {
          type: "object",
          properties: {
            provider: {
              type: "string",
              description:
                'Provider name (e.g., "googleapis.com", "azure.com")',
            },
            api: {
              type: "string",
              description: 'API version (e.g., "v3", "2.0")',
            },
            service: {
              type: "string",
              description: "Service name (optional, required for some APIs)",
            },
          },
          required: ["provider", "api"],
        },
      },
      {
        name: "list_all_apis",
        description: "List all APIs in the directory with metadata",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "get_metrics",
        description: "Get statistics and metrics about the API directory",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "search_apis",
        description:
          "Search for APIs by name, description, provider, or keywords with pagination support",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query string",
            },
            provider: {
              type: "string",
              description: "Optional provider filter",
            },
            page: {
              type: "number",
              description: "Page number (default: 1)",
              default: 1,
            },
            limit: {
              type: "number",
              description: "Number of results per page (default: 20, max: 50)",
              default: 20,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_popular_apis",
        description: "Get the most popular APIs based on various metrics",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of APIs to return (default: 20)",
              default: 20,
            },
          },
          required: [],
        },
      },
      {
        name: "get_recently_updated",
        description: "Get recently updated APIs",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of APIs to return (default: 10)",
              default: 10,
            },
          },
          required: [],
        },
      },
      {
        name: "get_provider_stats",
        description: "Get statistics for a specific provider",
        inputSchema: {
          type: "object",
          properties: {
            provider: {
              type: "string",
              description:
                'Provider name (e.g., "googleapis.com", "azure.com")',
            },
          },
          required: ["provider"],
        },
      },
      {
        name: "get_openapi_spec",
        description: "Get the OpenAPI specification for a specific API",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL to the OpenAPI specification (JSON or YAML)",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "analyze_api_categories",
        description: "Analyze API distribution by categories",
        inputSchema: {
          type: "object",
          properties: {
            provider: {
              type: "string",
              description: "Optional provider filter",
            },
          },
          required: [],
        },
      },
      {
        name: "get_api_summary",
        description:
          "Get basic information about a specific API without endpoint details",
        inputSchema: {
          type: "object",
          properties: {
            api_id: {
              type: "string",
              description:
                'API identifier (e.g., "googleapis.com:admin", "github.com")',
            },
          },
          required: ["api_id"],
        },
      },
      {
        name: "get_endpoints",
        description:
          "Get a paginated list of endpoints for a specific API with minimal information",
        inputSchema: {
          type: "object",
          properties: {
            api_id: {
              type: "string",
              description:
                'API identifier (e.g., "googleapis.com:admin", "github.com")',
            },
            page: {
              type: "number",
              description: "Page number (default: 1)",
              default: 1,
            },
            limit: {
              type: "number",
              description:
                "Number of endpoints per page (default: 30, max: 100)",
              default: 30,
            },
            tag: {
              type: "string",
              description:
                "Optional tag filter to show only endpoints with specific tag",
            },
          },
          required: ["api_id"],
        },
      },
      {
        name: "get_endpoint_details",
        description: "Get detailed information about a specific API endpoint",
        inputSchema: {
          type: "object",
          properties: {
            api_id: {
              type: "string",
              description:
                'API identifier (e.g., "googleapis.com:admin", "github.com")',
            },
            method: {
              type: "string",
              description: "HTTP method (GET, POST, PUT, PATCH, DELETE, etc.)",
            },
            path: {
              type: "string",
              description: 'API endpoint path (e.g., "/users/{id}", "/posts")',
            },
          },
          required: ["api_id", "method", "path"],
        },
      },
      {
        name: "get_endpoint_schema",
        description:
          "Get request and response schemas for a specific API endpoint",
        inputSchema: {
          type: "object",
          properties: {
            api_id: {
              type: "string",
              description:
                'API identifier (e.g., "googleapis.com:admin", "github.com")',
            },
            method: {
              type: "string",
              description: "HTTP method (GET, POST, PUT, PATCH, DELETE, etc.)",
            },
            path: {
              type: "string",
              description: 'API endpoint path (e.g., "/users/{id}", "/posts")',
            },
          },
          required: ["api_id", "method", "path"],
        },
      },
      {
        name: "get_endpoint_examples",
        description:
          "Get request and response examples for a specific API endpoint",
        inputSchema: {
          type: "object",
          properties: {
            api_id: {
              type: "string",
              description:
                'API identifier (e.g., "googleapis.com:admin", "github.com")',
            },
            method: {
              type: "string",
              description: "HTTP method (GET, POST, PUT, PATCH, DELETE, etc.)",
            },
            path: {
              type: "string",
              description: 'API endpoint path (e.g., "/users/{id}", "/posts")',
            },
          },
          required: ["api_id", "method", "path"],
        },
      },
    ];

    // Add utility tools including cache management tools
    tools.push(...this.generateUtilityTools());

    return tools;
  }

  /**
   * Generate tools from OpenAPI specification
   */
  async generateToolsFromSpec(spec: any): Promise<Tool[]> {
    const tools: Tool[] = [];

    if (!spec.paths) {
      return tools;
    }

    // Convert OpenAPI operations to MCP tools
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      if (typeof pathItem !== "object" || pathItem === null) {
        continue;
      }

      const operations = [
        "get",
        "post",
        "put",
        "patch",
        "delete",
        "head",
        "options",
        "trace",
      ];

      for (const method of operations) {
        const operation = (pathItem as any)[method];
        if (!operation) continue;

        const toolName =
          operation.operationId ||
          `${method}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`;
        const tool: Tool = {
          name: toolName,
          description:
            operation.summary ||
            operation.description ||
            `${method.toUpperCase()} ${path}`,
          inputSchema: this.generateInputSchema(operation, path),
        };

        tools.push(tool);
      }
    }

    return tools;
  }

  /**
   * Generate input schema for a tool based on OpenAPI operation
   */
  private generateInputSchema(operation: any, path: string): any {
    const properties: any = {};
    const required: string[] = [];

    // Extract path parameters
    const pathParams = path.match(/\{([^}]+)\}/g);
    if (pathParams) {
      for (const param of pathParams) {
        const paramName = param.slice(1, -1); // Remove { and }
        properties[paramName] = {
          type: "string",
          description: `Path parameter: ${paramName}`,
        };
        required.push(paramName);
      }
    }

    // Extract parameters from operation
    if (operation.parameters) {
      for (const param of operation.parameters) {
        if (param.in === "path") {
          properties[param.name] = {
            type: param.schema?.type || "string",
            description: param.description || `Path parameter: ${param.name}`,
          };
          if (param.required) {
            required.push(param.name);
          }
        } else if (param.in === "query") {
          properties[param.name] = {
            type: param.schema?.type || "string",
            description: param.description || `Query parameter: ${param.name}`,
          };
          if (param.required) {
            required.push(param.name);
          }
        }
      }
    }

    // Extract request body schema
    if (operation.requestBody) {
      const content = operation.requestBody.content;
      if (content) {
        const jsonContent = content["application/json"];
        if (jsonContent?.schema) {
          properties.body = {
            type: "object",
            description: "Request body",
            properties: jsonContent.schema.properties || {},
          };
          if (operation.requestBody.required) {
            required.push("body");
          }
        }
      }
    }

    return {
      type: "object",
      properties,
      required,
    };
  }

  /**
   * Generate additional utility tools
   */
  generateUtilityTools(): Tool[] {
    return [
      {
        name: "cache_stats",
        description: "Get cache statistics and information",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "list_cache_keys",
        description: "List all cache keys",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "clear_cache",
        description: "Clear all cache entries",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "clear_cache_key",
        description: "Clear a specific cache key",
        inputSchema: {
          type: "object",
          properties: {
            key: {
              type: "string",
              description: "The cache key to clear",
            },
          },
          required: ["key"],
        },
      },
      {
        name: "cache_info",
        description: "Get cache configuration and settings",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ];
  }
}
