import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { DualSourceApiClient } from "../api/dual-source-client.js";
import { ICacheManager } from "../cache/types.js";
import { MockServerManager } from "../mock-server/types.js";

export interface ToolContext {
  apiClient: DualSourceApiClient;
  cacheManager: ICacheManager;
  mockServerManager?: MockServerManager;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any; // JSON Schema object
  category?: string;
  execute(args: any, context: ToolContext): Promise<any>;
}

export interface ToolCategory {
  name: string;
  tools: ToolDefinition[];
}

// Convert ToolDefinition to MCP Tool format
export function toMcpTool(toolDef: ToolDefinition): Tool {
  return {
    name: toolDef.name,
    description: toolDef.description,
    inputSchema: toolDef.inputSchema,
  };
}
