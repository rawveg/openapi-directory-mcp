// @ts-nocheck
import { z } from "zod";
import { ToolDefinition, ToolContext } from "../types.js";

export const tool: ToolDefinition = {
  name: "search_apis",
  description:
    "Search for APIs by name, description, provider, or keywords with pagination support",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query string",
      },
      provider: {
        type: "string",
        description: "Optional provider filter",
      },
      page: {
        type: "number",
        description: "Page number (default: 1)",
        default: 1,
      },
      limit: {
        type: "number",
        description: "Number of results per page (default: 20, max: 50)",
        default: 20,
      },
    },
    required: ["query"],
  },
  async execute(args: any, context: ToolContext): Promise<any> {
    const searchSchema = z.object({
      query: z.string(),
      provider: z.string().optional(),
      page: z.number().optional().default(1),
      limit: z.number().optional().default(20),
    });
    const params = searchSchema.parse(args);
    return await context.apiClient.searchAPIs(
      params.query,
      params.provider,
      params.page,
      params.limit,
    );
  },
};

export default tool;
