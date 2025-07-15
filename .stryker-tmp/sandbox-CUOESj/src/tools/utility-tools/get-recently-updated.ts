// @ts-nocheck
import { z } from "zod";
import { ToolDefinition, ToolContext } from "../types.js";

export const tool: ToolDefinition = {
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
  async execute(args: any, context: ToolContext): Promise<any> {
    const schema = z.object({
      limit: z.number().optional().default(10),
    });
    const params = schema.parse(args);
    return await context.apiClient.getRecentlyUpdatedAPIs(params.limit);
  },
};

export default tool;
