import { ToolDefinition, ToolContext } from "../types.js";

export const tool: ToolDefinition = {
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
  async execute(_args: any, context: ToolContext): Promise<any> {
    return await context.apiClient.getPopularAPIs();
  },
};

export default tool;
