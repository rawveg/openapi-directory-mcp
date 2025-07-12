import { ToolDefinition, ToolContext } from '../types.js';

export const tool: ToolDefinition = {
  name: 'cache_stats',
  description: 'Get cache statistics and performance metrics',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(_args: any, context: ToolContext): Promise<any> {
    return await context.cacheManager.getStats();
  }
};

export default tool;