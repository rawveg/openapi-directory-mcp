#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MCPLogger } from "./utils/mcp-logger.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { DualSourceApiClient } from "./api/dual-source-client.js";
import { PersistentCacheManager } from "./cache/persistent-manager.js";
import { ICacheManager } from "./cache/types.js";
import { ToolGenerator } from "./tools/generator.js";
import { PromptHandler } from "./prompts/handler.js";
import { z } from "zod";

// Configuration
const config = {
  name: "openapi-directory-mcp",
  version: "1.2.0",
  description:
    "Browse and discover APIs from dual-source OpenAPI directory (APIs.guru + enhanced)",
  cacheEnabled: process.env.DISABLE_CACHE !== "true",
  cacheTTL: parseInt(process.env.CACHE_TTL || "86400000"), // 24 hours in milliseconds
  primaryApiBaseUrl:
    process.env.PRIMARY_API_BASE_URL || "https://api.apis.guru/v2",
  secondaryApiBaseUrl:
    process.env.SECONDARY_API_BASE_URL || "https://api.openapidirectory.com",
};

export class OpenAPIDirectoryServer {
  private server: Server;
  private apiClient: DualSourceApiClient;
  private cacheManager: ICacheManager;
  private toolGenerator: ToolGenerator;
  private promptHandler: PromptHandler;

  constructor() {
    this.server = new Server({
      name: config.name,
      version: config.version,
    });

    this.cacheManager = new PersistentCacheManager(config.cacheTTL);
    this.apiClient = new DualSourceApiClient(
      config.primaryApiBaseUrl,
      config.secondaryApiBaseUrl,
      this.cacheManager,
    );
    this.toolGenerator = new ToolGenerator();
    this.promptHandler = new PromptHandler();

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = await this.getAvailableResources();
      return { resources };
    });

    // Read a specific resource
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const { uri } = request.params;
        const resourceContent = await this.readResource(uri);
        return {
          contents: [
            {
              uri,
              mimeType: "text/plain",
              text: resourceContent,
            },
          ],
        };
      },
    );

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = await this.toolGenerator.generateTools();
      return { tools };
    });

    // Call a tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const result = await this.callTool(name, args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return await this.promptHandler.listPrompts();
    });

    // Get a specific prompt
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const promptRequest: {
          name: string;
          arguments?: Record<string, unknown>;
        } = { name };
        if (args) {
          promptRequest.arguments = args as Record<string, unknown>;
        }
        return await this.promptHandler.getPrompt(promptRequest);
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Prompt retrieval failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    });
  }

  private async getAvailableResources() {
    const resources = [];

    // Add static resources
    resources.push({
      uri: "openapi://providers",
      name: "API Providers List",
      description: "List of all API providers in the directory",
      mimeType: "application/json",
    });

    resources.push({
      uri: "openapi://metrics",
      name: "Directory Metrics",
      description: "Basic metrics and statistics about the API directory",
      mimeType: "application/json",
    });

    // Add API summary resource
    resources.push({
      uri: "openapi://apis/summary",
      name: "API Directory Summary",
      description:
        "Overview of the API directory including popular APIs and statistics",
      mimeType: "application/json",
    });

    // Add paginated API resources (pages 1-20)
    for (let page = 1; page <= 20; page++) {
      resources.push({
        uri: `openapi://apis/page/${page}`,
        name: `APIs Page ${page}`,
        description: `Page ${page} of APIs in the directory (50 APIs per page)`,
        mimeType: "application/json",
      });
    }

    return resources;
  }

  private async readResource(uri: string): Promise<string> {
    // Handle openapi:// URIs
    if (uri.startsWith("openapi://")) {
      const path = uri.replace("openapi://", "");

      switch (path) {
        case "providers": {
          const providers = await this.apiClient.getProviders();
          return JSON.stringify(providers, null, 2);
        }

        case "metrics": {
          const metrics = await this.apiClient.getMetrics();
          return JSON.stringify(metrics, null, 2);
        }

        case "apis/summary": {
          const summary = await this.apiClient.getAPISummary();
          return JSON.stringify(summary, null, 2);
        }

        default: {
          // Handle paginated API resources: apis/page/N
          if (path.startsWith("apis/page/")) {
            const pageMatch = path.match(/^apis\/page\/(\d+)$/);
            if (pageMatch && pageMatch[1]) {
              const page = parseInt(pageMatch[1], 10);
              if (page >= 1 && page <= 20) {
                const paginatedAPIs = await this.apiClient.getPaginatedAPIs(
                  page,
                  50,
                );
                return JSON.stringify(paginatedAPIs, null, 2);
              }
            }
          }

          throw new McpError(
            ErrorCode.InvalidRequest,
            `Unknown resource: ${uri}`,
          );
        }
      }
    }

    throw new McpError(
      ErrorCode.InvalidRequest,
      `Invalid resource URI: ${uri}`,
    );
  }

  private async callTool(toolName: string, args: any) {
    switch (toolName) {
      case "get_providers":
        return await this.apiClient.getProviders();

      case "get_provider_apis": {
        const providerSchema = z.object({
          provider: z.string(),
        });
        const { provider } = providerSchema.parse(args);
        return await this.apiClient.getProvider(provider);
      }

      case "get_provider_services": {
        const servicesSchema = z.object({
          provider: z.string(),
        });
        const servicesArgs = servicesSchema.parse(args);
        return await this.apiClient.getServices(servicesArgs.provider);
      }

      case "get_api": {
        const apiSchema = z.object({
          provider: z.string(),
          api: z.string(),
          service: z.string().optional(),
        });
        const apiArgs = apiSchema.parse(args);
        if (apiArgs.service) {
          return await this.apiClient.getServiceAPI(
            apiArgs.provider,
            apiArgs.service,
            apiArgs.api,
          );
        } else {
          return await this.apiClient.getAPI(apiArgs.provider, apiArgs.api);
        }
      }

      case "list_all_apis":
        return await this.apiClient.listAPIs();

      case "get_metrics":
        return await this.apiClient.getMetrics();

      case "search_apis": {
        const searchSchema = z.object({
          query: z.string(),
          provider: z.string().optional(),
          page: z.number().optional().default(1),
          limit: z.number().optional().default(20),
        });
        const searchArgs = searchSchema.parse(args);
        return await this.apiClient.searchAPIs(
          searchArgs.query,
          searchArgs.provider,
          searchArgs.page,
          searchArgs.limit,
        );
      }

      case "get_popular_apis":
        return await this.apiClient.getPopularAPIs();

      case "get_recently_updated": {
        const recentSchema = z.object({
          limit: z.number().optional().default(10),
        });
        const recentArgs = recentSchema.parse(args);
        return await this.apiClient.getRecentlyUpdatedAPIs(recentArgs.limit);
      }

      case "get_provider_stats": {
        const statsSchema = z.object({
          provider: z.string(),
        });
        const statsArgs = statsSchema.parse(args);
        return await this.apiClient.getProviderStats(statsArgs.provider);
      }

      case "get_openapi_spec": {
        const specSchema = z.object({
          url: z.string(),
        });
        const specArgs = specSchema.parse(args);
        return await this.apiClient.getOpenAPISpec(specArgs.url);
      }

      case "analyze_api_categories": {
        const categoriesSchema = z.object({
          provider: z.string().optional(),
        });
        const categoriesArgs = categoriesSchema.parse(args);
        return await this.analyzeApiCategories(categoriesArgs.provider);
      }

      case "get_api_summary": {
        const summarySchema = z.object({
          api_id: z.string(),
        });
        const summaryArgs = summarySchema.parse(args);
        return await this.apiClient.getAPISummaryById(summaryArgs.api_id);
      }

      case "get_endpoints": {
        const endpointsSchema = z.object({
          api_id: z.string(),
          page: z.number().optional().default(1),
          limit: z.number().optional().default(30),
          tag: z.string().optional(),
        });
        const endpointsArgs = endpointsSchema.parse(args);
        return await this.apiClient.getAPIEndpoints(
          endpointsArgs.api_id,
          endpointsArgs.page,
          endpointsArgs.limit,
          endpointsArgs.tag,
        );
      }

      case "get_endpoint_details": {
        const detailsSchema = z.object({
          api_id: z.string(),
          method: z.string(),
          path: z.string(),
        });
        const detailsArgs = detailsSchema.parse(args);
        return await this.apiClient.getEndpointDetails(
          detailsArgs.api_id,
          detailsArgs.method,
          detailsArgs.path,
        );
      }

      case "get_endpoint_schema": {
        const schemaSchema = z.object({
          api_id: z.string(),
          method: z.string(),
          path: z.string(),
        });
        const schemaArgs = schemaSchema.parse(args);
        return await this.apiClient.getEndpointSchema(
          schemaArgs.api_id,
          schemaArgs.method,
          schemaArgs.path,
        );
      }

      case "get_endpoint_examples": {
        const examplesSchema = z.object({
          api_id: z.string(),
          method: z.string(),
          path: z.string(),
        });
        const examplesArgs = examplesSchema.parse(args);
        return await this.apiClient.getEndpointExamples(
          examplesArgs.api_id,
          examplesArgs.method,
          examplesArgs.path,
        );
      }

      case "cache_stats": {
        return this.cacheManager.getStats();
      }

      case "list_cache_keys": {
        return {
          keys: this.cacheManager.keys(),
          total: this.cacheManager.keys().length,
        };
      }

      case "clear_cache": {
        const keysBefore = this.cacheManager.keys().length;
        this.cacheManager.clear();
        return {
          message: `Cache cleared successfully. Removed ${keysBefore} entries.`,
          cleared: keysBefore,
        };
      }

      case "clear_cache_key": {
        const keySchema = z.object({
          key: z.string(),
        });
        const keyArgs = keySchema.parse(args);
        const deleted = this.cacheManager.delete(keyArgs.key);
        return {
          message:
            deleted > 0
              ? `Cache key '${keyArgs.key}' cleared successfully.`
              : `Cache key '${keyArgs.key}' not found.`,
          deleted: deleted,
        };
      }

      case "cache_info": {
        return {
          enabled: this.cacheManager.isEnabled(),
          config: this.cacheManager.getConfig(),
          size: this.cacheManager.getSize(),
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${toolName}`,
        );
    }
  }

  private async analyzeApiCategories(provider?: string) {
    const allAPIs = await this.apiClient.listAPIs();
    const categories: Record<string, number> = {};

    for (const [apiId, api] of Object.entries(allAPIs)) {
      // If provider filter is specified, check if API matches
      if (provider && !apiId.includes(provider)) {
        continue;
      }

      // Get categories from preferred version
      const preferredVersion = api.versions[api.preferred];
      if (preferredVersion?.info?.["x-apisguru-categories"]) {
        const apiCategories = preferredVersion.info["x-apisguru-categories"];
        if (Array.isArray(apiCategories)) {
          for (const category of apiCategories) {
            categories[category] = (categories[category] || 0) + 1;
          }
        }
      }
    }

    // Sort categories by count
    const sortedCategories = Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .map(([category, count]) => ({ category, count }));

    return {
      totalAPIs: provider
        ? Object.keys(allAPIs).filter((id) => id.includes(provider)).length
        : Object.keys(allAPIs).length,
      categories: sortedCategories,
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // MCP servers must not write to stdout/stderr - it breaks the protocol
    // All output must be JSON-RPC messages only
    // Startup logging removed to ensure MCP protocol compliance

    // Set up graceful shutdown
    const shutdown = () => {
      // MCP servers must not write to stdout/stderr during shutdown
      if (
        this.cacheManager &&
        this.cacheManager.isEnabled() &&
        this.cacheManager.destroy
      ) {
        this.cacheManager.destroy();
      }
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    process.on("beforeExit", shutdown);
  }
}

// Export alias for compatibility with tests
export { OpenAPIDirectoryServer as MCPServer };

// CLI handler for custom spec management
import { CLIHandler } from "./cli/cli-handler.js";

async function main() {
  // Initialize MCP compliance - must be first to silence all console output
  MCPLogger.initializeMCPCompliance();

  // Parse command line arguments (skip 'node' and script name)
  const args = process.argv.slice(2);

  // Handle CLI commands if any are provided
  if (args.length > 0) {
    const cliHandler = new CLIHandler();
    const parsedArgs = cliHandler.parseArgs(args);
    const handled = await cliHandler.handleCommand(parsedArgs);

    // If command was handled, exit
    if (handled) {
      process.exit(0);
    }
  }

  // No CLI commands, start the MCP server
  const server = new OpenAPIDirectoryServer();
  await server.start();
}

// Start the application
main().catch(() => {
  // MCP servers must not write to stdout/stderr
  // Exit silently on error to maintain protocol compliance
  process.exit(1);
});
