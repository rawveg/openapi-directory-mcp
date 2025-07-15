// @ts-nocheck
import { ToolDefinition, ToolContext } from "../types.js";

export const tool: ToolDefinition = {
  name: "get_metrics",
  description: "Get statistics and metrics about the API directory",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
  async execute(_args: any, context: ToolContext): Promise<any> {
    return await context.apiClient.getMetrics();
  },
};

export default tool;
