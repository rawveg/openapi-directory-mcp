import { ToolDefinition, ToolContext } from '../types.js';

export const tool: ToolDefinition = {
  name: 'cache_info',
  description: 'Get cache configuration and settings',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(_args: any, context: ToolContext): Promise<any> {
    return {
      enabled: context.cacheManager.isEnabled(),
      config: context.cacheManager.getConfig(),
      size: context.cacheManager.getSize(),
    };
  }
};

export default tool;