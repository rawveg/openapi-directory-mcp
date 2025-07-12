import { ToolDefinition, ToolContext } from "../types.js";

export const tool: ToolDefinition = {
  name: "get_providers",
  description: "List all API providers in the directory",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
  async execute(_args: any, context: ToolContext): Promise<any> {
    return await context.apiClient.getProviders();
  },
};

export default tool;
