import { PromptTemplate } from '../types.js';

export const prompt: PromptTemplate = {
  name: "code_generation",
  description: "Generate code examples for API usage",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to generate code for",
      required: true
    },
    {
      name: "operation",
      description: "Specific operation or endpoint to use",
      required: true
    },
    {
      name: "language",
      description: "Programming language for code generation",
      required: true
    },
    {
      name: "framework",
      description: "Specific framework or library to use (optional)",
      required: false
    }
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Generate ${args.language} code for the ${args.api_name} API.

Operation: ${args.operation}
${args.framework ? `Framework: ${args.framework}` : ''}

Please provide complete code examples:
1. Find the API and fetch its OpenAPI specification
2. Locate the specific operation/endpoint
3. Generate production-ready code including:
   - Proper imports and setup
   - Authentication handling
   - Request construction with parameters
   - Response parsing and validation
   - Error handling and retry logic
   - Type definitions (if applicable)
4. Include comments explaining each step
5. Provide usage examples and test cases
6. Add documentation and best practices

Use the available tools to fetch the API specification and analyze the endpoint details.`
      }
    }
  ]
};

export default prompt;