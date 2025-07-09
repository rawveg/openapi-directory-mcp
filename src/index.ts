#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ApiClient } from './api/client.js';
import { CacheManager } from './cache/manager.js';
import { ToolGenerator } from './tools/generator.js';
import { PromptHandler } from './prompts/handler.js';
import { z } from 'zod';

// Configuration
const config = {
  name: 'openapi-directory-mcp',
  version: '1.0.0',
  description: 'Browse and discover APIs from APIs.guru OpenAPI directory',
  cacheEnabled: process.env.DISABLE_CACHE !== 'true',
  cacheTTL: parseInt(process.env.CACHE_TTL || '86400000'), // 24 hours in milliseconds
  apiBaseUrl: process.env.API_BASE_URL || 'https://api.apis.guru/v2',
};

class OpenAPIDirectoryServer {
  private server: Server;
  private apiClient: ApiClient;
  private cacheManager: CacheManager;
  private toolGenerator: ToolGenerator;
  private promptHandler: PromptHandler;

  constructor() {
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      }
    );

    this.cacheManager = new CacheManager(config.cacheTTL);
    this.apiClient = new ApiClient(config.apiBaseUrl, this.cacheManager);
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
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      const resourceContent = await this.readResource(uri);
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: resourceContent,
          },
        ],
      };
    });

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
              type: 'text',
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
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
        const promptRequest: { name: string; arguments?: Record<string, unknown> } = { name };
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
          `Prompt retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  private async getAvailableResources() {
    const resources = [];

    // Add static resources
    resources.push({
      uri: 'openapi://providers',
      name: 'API Providers List',
      description: 'List of all API providers in the directory',
      mimeType: 'application/json',
    });

    resources.push({
      uri: 'openapi://metrics',
      name: 'Directory Metrics',
      description: 'Basic metrics and statistics about the API directory',
      mimeType: 'application/json',
    });

    resources.push({
      uri: 'openapi://list',
      name: 'All APIs List',
      description: 'Complete list of all APIs in the directory',
      mimeType: 'application/json',
    });


    return resources;
  }

  private async readResource(uri: string): Promise<string> {
    // Handle openapi:// URIs
    if (uri.startsWith('openapi://')) {
      const path = uri.replace('openapi://', '');
      
      switch (path) {
        case 'providers': {
          const providers = await this.apiClient.getProviders();
          return JSON.stringify(providers, null, 2);
        }
          
        case 'metrics': {
          const metrics = await this.apiClient.getMetrics();
          return JSON.stringify(metrics, null, 2);
        }
          
        case 'list': {
          const apis = await this.apiClient.listAPIs();
          return JSON.stringify(apis, null, 2);
        }
          
        default:
          throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
      }
    }


    throw new McpError(ErrorCode.InvalidRequest, `Invalid resource URI: ${uri}`);
  }

  private async callTool(toolName: string, args: any) {
    switch (toolName) {
      case 'get_providers':
        return await this.apiClient.getProviders();
        
      case 'get_provider_apis': {
        const providerSchema = z.object({
          provider: z.string(),
        });
        const { provider } = providerSchema.parse(args);
        return await this.apiClient.getProvider(provider);
      }
        
      case 'get_provider_services': {
        const servicesSchema = z.object({
          provider: z.string(),
        });
        const servicesArgs = servicesSchema.parse(args);
        return await this.apiClient.getServices(servicesArgs.provider);
      }
        
      case 'get_api': {
        const apiSchema = z.object({
          provider: z.string(),
          api: z.string(),
          service: z.string().optional(),
        });
        const apiArgs = apiSchema.parse(args);
        if (apiArgs.service) {
          return await this.apiClient.getServiceAPI(apiArgs.provider, apiArgs.service, apiArgs.api);
        } else {
          return await this.apiClient.getAPI(apiArgs.provider, apiArgs.api);
        }
      }
        
      case 'list_all_apis':
        return await this.apiClient.listAPIs();
        
      case 'get_metrics':
        return await this.apiClient.getMetrics();
        
      case 'search_apis': {
        const searchSchema = z.object({
          query: z.string(),
          provider: z.string().optional(),
        });
        const searchArgs = searchSchema.parse(args);
        return await this.apiClient.searchAPIs(searchArgs.query, searchArgs.provider);
      }
        
      case 'get_popular_apis':
        return await this.apiClient.getPopularAPIs();
        
      case 'get_recently_updated': {
        const recentSchema = z.object({
          limit: z.number().optional().default(10),
        });
        const recentArgs = recentSchema.parse(args);
        return await this.apiClient.getRecentlyUpdatedAPIs(recentArgs.limit);
      }
        
      case 'get_provider_stats': {
        const statsSchema = z.object({
          provider: z.string(),
        });
        const statsArgs = statsSchema.parse(args);
        return await this.apiClient.getProviderStats(statsArgs.provider);
      }
        
      case 'get_openapi_spec': {
        const specSchema = z.object({
          url: z.string(),
        });
        const specArgs = specSchema.parse(args);
        return await this.apiClient.getOpenAPISpec(specArgs.url);
      }
        
      case 'analyze_api_categories': {
        const categoriesSchema = z.object({
          provider: z.string().optional(),
        });
        const categoriesArgs = categoriesSchema.parse(args);
        return await this.analyzeApiCategories(categoriesArgs.provider);
      }
        
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
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
      if (preferredVersion?.info?.['x-apisguru-categories']) {
        const apiCategories = preferredVersion.info['x-apisguru-categories'];
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
      totalAPIs: provider ? 
        Object.keys(allAPIs).filter(id => id.includes(provider)).length :
        Object.keys(allAPIs).length,
      categories: sortedCategories,
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error(`${config.name} v${config.version} - MCP server started`);
    console.error(`Cache: ${config.cacheEnabled ? 'enabled' : 'disabled'} (TTL: ${config.cacheTTL}ms)`);
  }
}

// Start the server
const server = new OpenAPIDirectoryServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});