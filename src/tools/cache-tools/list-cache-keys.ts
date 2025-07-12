import { ToolDefinition, ToolContext } from '../types.js';

export const tool: ToolDefinition = {
  name: 'list_cache_keys',
  description: 'List all cache keys',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(_args: any, context: ToolContext): Promise<any> {
    return {
      keys: context.cacheManager.keys(),
      total: context.cacheManager.keys().length,
    };
  }
};

export default tool;