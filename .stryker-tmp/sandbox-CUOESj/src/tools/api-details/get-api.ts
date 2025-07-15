// @ts-nocheck
import { z } from "zod";
import { ToolDefinition, ToolContext } from "../types.js";

export const tool: ToolDefinition = {
  name: "get_api",
  description: "Get detailed information about a specific API",
  inputSchema: {
    type: "object",
    properties: {
      provider: {
        type: "string",
        description: 'Provider name (e.g., "googleapis.com", "azure.com")',
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
  async execute(args: any, context: ToolContext): Promise<any> {
    const schema = z.object({
      provider: z.string(),
      api: z.string(),
      service: z.string().optional(),
    });
    const params = schema.parse(args);

    if (params.service) {
      return await context.apiClient.getServiceAPI(
        params.provider,
        params.service,
        params.api,
      );
    } else {
      return await context.apiClient.getAPI(params.provider, params.api);
    }
  },
};

export default tool;
