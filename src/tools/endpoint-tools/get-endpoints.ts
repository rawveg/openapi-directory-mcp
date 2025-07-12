import { z } from 'zod';
import { ToolDefinition, ToolContext } from '../types.js';

export const tool: ToolDefinition = {
  name: 'get_endpoints',
  description: 'Get a paginated list of endpoints for a specific API with minimal information',
  inputSchema: {
    type: 'object',
    properties: {
      api_id: {
        type: 'string',
        description: 'API identifier (e.g., "googleapis.com:admin", "github.com")',
      },
      page: {
        type: 'number',
        description: 'Page number (default: 1)',
        default: 1,
      },
      limit: {
        type: 'number',
        description: 'Number of endpoints per page (default: 30, max: 100)',
        default: 30,
      },
      tag: {
        type: 'string',
        description: 'Optional tag filter to show only endpoints with specific tag',
      },
    },
    required: ['api_id'],
  },
  async execute(args: any, context: ToolContext): Promise<any> {
    const schema = z.object({
      api_id: z.string(),
      page: z.number().optional().default(1),
      limit: z.number().optional().default(30),
      tag: z.string().optional(),
    });
    const params = schema.parse(args);
    return await context.apiClient.getAPIEndpoints(params.api_id, params.page, params.limit, params.tag);
  }
};

export default tool;