// @ts-nocheck
import { z } from "zod";
import { ToolDefinition, ToolContext } from "../types.js";

export const tool: ToolDefinition = {
  name: "get_provider_services",
  description: "List all services for a specific provider",
  inputSchema: {
    type: "object",
    properties: {
      provider: {
        type: "string",
        description: 'Provider name (e.g., "googleapis.com", "azure.com")',
      },
    },
    required: ["provider"],
  },
  async execute(args: any, context: ToolContext): Promise<any> {
    const schema = z.object({
      provider: z.string(),
    });
    const params = schema.parse(args);
    return await context.apiClient.getServices(params.provider);
  },
};

export default tool;
