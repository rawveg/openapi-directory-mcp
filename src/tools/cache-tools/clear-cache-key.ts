import { z } from "zod";
import { ToolDefinition, ToolContext } from "../types.js";

export const tool: ToolDefinition = {
  name: "clear_cache_key",
  description: "Clear a specific cache key",
  inputSchema: {
    type: "object",
    properties: {
      key: {
        type: "string",
        description: "Cache key to clear",
      },
    },
    required: ["key"],
  },
  async execute(args: any, context: ToolContext): Promise<any> {
    const schema = z.object({
      key: z.string(),
    });
    const params = schema.parse(args);
    const deleted = context.cacheManager.delete(params.key);
    return {
      message:
        deleted > 0
          ? `Cache key '${params.key}' cleared successfully.`
          : `Cache key '${params.key}' not found.`,
      deleted: deleted,
    };
  },
};

export default tool;
