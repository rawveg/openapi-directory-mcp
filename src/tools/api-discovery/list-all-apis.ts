import { ToolDefinition, ToolContext } from "../types.js";

export const tool: ToolDefinition = {
  name: "list_all_apis",
  description: "List all APIs in the directory with metadata",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
  async execute(_args: any, context: ToolContext): Promise<any> {
    return await context.apiClient.listAPIs();
  },
};

export default tool;
