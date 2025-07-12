import { ToolDefinition, ToolContext } from '../types.js';

export const tool: ToolDefinition = {
  name: 'clear_cache',
  description: 'Clear all cache entries',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(_args: any, context: ToolContext): Promise<any> {
    const keysBefore = context.cacheManager.keys().length;
    context.cacheManager.clear();
    return {
      message: `Cache cleared successfully. Removed ${keysBefore} entries.`,
      cleared: keysBefore,
    };
  }
};

export default tool;