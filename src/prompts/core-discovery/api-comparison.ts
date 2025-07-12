import { PromptTemplate } from '../types.js';

export const prompt: PromptTemplate = {
  name: "api_comparison",
  description: "Compare multiple APIs for the same functionality",
  arguments: [
    {
      name: "apis",
      description: "Comma-separated list of APIs to compare",
      required: true
    },
    {
      name: "criteria",
      description: "Specific criteria to compare (e.g., 'pricing', 'features', 'documentation quality')",
      required: false
    }
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `I need to compare these APIs: ${args.apis}

${args.criteria ? `Comparison criteria: ${args.criteria}` : ''}

Please provide a detailed comparison:
1. Find each API in the directory
2. Analyze their OpenAPI specifications
3. Compare them across these dimensions:
   - Available endpoints and functionality
   - Authentication methods
   - Request/response formats
   - Error handling
   - Rate limits and pricing (if available)
   - Documentation quality
   - Community adoption and support
4. Provide a recommendation matrix
5. Suggest the best choice for different use cases

Use the available tools to fetch and analyze each API's specification.`
      }
    }
  ]
};

export default prompt;