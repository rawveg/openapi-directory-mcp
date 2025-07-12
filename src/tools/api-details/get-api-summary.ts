import { z } from 'zod';
import { ToolDefinition, ToolContext } from '../types.js';

export const tool: ToolDefinition = {
  name: 'get_api_summary',
  description: 'Get basic information about a specific API without endpoint details',
  inputSchema: {
    type: 'object',
    properties: {
      api_id: {
        type: 'string',
        description: 'API identifier (e.g., "googleapis.com:admin", "github.com")',
      },
    },
    required: ['api_id'],
  },
  async execute(args: any, context: ToolContext): Promise<any> {
    const schema = z.object({
      api_id: z.string(),
    });
    const params = schema.parse(args);
    return await context.apiClient.getAPISummaryById(params.api_id);
  }
};

export default tool;