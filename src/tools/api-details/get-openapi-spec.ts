import { z } from 'zod';
import { ToolDefinition, ToolContext } from '../types.js';

export const tool: ToolDefinition = {
  name: 'get_openapi_spec',
  description: 'Get the OpenAPI specification for a specific API',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to the OpenAPI specification (JSON or YAML)',
      },
    },
    required: ['url'],
  },
  async execute(args: any, context: ToolContext): Promise<any> {
    const schema = z.object({
      url: z.string(),
    });
    const params = schema.parse(args);
    return await context.apiClient.getOpenAPISpec(params.url);
  }
};

export default tool;