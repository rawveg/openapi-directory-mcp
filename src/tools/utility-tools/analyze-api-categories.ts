import { z } from "zod";
import { ToolDefinition, ToolContext } from "../types.js";

export const tool: ToolDefinition = {
  name: "analyze_api_categories",
  description: "Analyze API distribution by categories",
  inputSchema: {
    type: "object",
    properties: {
      provider: {
        type: "string",
        description: "Optional provider filter",
      },
    },
    required: [],
  },
  async execute(args: any, context: ToolContext): Promise<any> {
    const schema = z.object({
      provider: z.string().optional(),
    });
    const params = schema.parse(args);

    const allAPIs = await context.apiClient.listAPIs();
    const categories: Record<string, number> = {};

    for (const [apiId, api] of Object.entries(allAPIs)) {
      // If provider filter is specified, check if API matches
      if (params.provider && !apiId.includes(params.provider)) {
        continue;
      }

      // Get categories from preferred version
      const preferredVersion = api.versions[api.preferred];
      if (preferredVersion?.info?.["x-apisguru-categories"]) {
        const apiCategories = preferredVersion.info["x-apisguru-categories"];
        if (Array.isArray(apiCategories)) {
          for (const category of apiCategories) {
            categories[category] = (categories[category] || 0) + 1;
          }
        }
      }
    }

    // Sort categories by count
    const sortedCategories = Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .map(([category, count]) => ({ category, count }));

    return {
      totalAPIs: params.provider
        ? Object.keys(allAPIs).filter((id) => id.includes(params.provider!))
            .length
        : Object.keys(allAPIs).length,
      categories: sortedCategories,
    };
  },
};

export default tool;
