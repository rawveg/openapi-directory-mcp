import { z } from "zod";
import { ToolDefinition, ToolContext } from "../types.js";

export const tool: ToolDefinition = {
  name: "get_provider_apis",
  description: "List all APIs for a specific provider",
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
    const providerSchema = z.object({
      provider: z.string(),
    });
    const { provider } = providerSchema.parse(args);
    return await context.apiClient.getProvider(provider);
  },
};

export default tool;
