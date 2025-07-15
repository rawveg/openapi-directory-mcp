// @ts-nocheck
import { z } from "zod";
import { ToolDefinition, ToolContext } from "../types.js";

export const tool: ToolDefinition = {
  name: "get_endpoint_details",
  description: "Get detailed information about a specific API endpoint",
  inputSchema: {
    type: "object",
    properties: {
      api_id: {
        type: "string",
        description:
          'API identifier (e.g., "googleapis.com:admin", "github.com")',
      },
      method: {
        type: "string",
        description: "HTTP method (GET, POST, PUT, PATCH, DELETE, etc.)",
      },
      path: {
        type: "string",
        description: 'API endpoint path (e.g., "/users/{id}", "/posts")',
      },
    },
    required: ["api_id", "method", "path"],
  },
  async execute(args: any, context: ToolContext): Promise<any> {
    const schema = z.object({
      api_id: z.string(),
      method: z.string(),
      path: z.string(),
    });
    const params = schema.parse(args);
    return await context.apiClient.getEndpointDetails(
      params.api_id,
      params.method,
      params.path,
    );
  },
};

export default tool;
