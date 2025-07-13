import { PromptTemplate } from "../types.js";

export const prompt: PromptTemplate = {
  name: "api_documentation_analysis",
  description: "Analyze API capabilities, limitations, and best practices",
  template: "Analyze {{api_name}} API focusing on {{focus_area}}",
  category: "core-discovery",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to analyze",
      required: true,
    },
    {
      name: "focus_area",
      description:
        "Specific area to focus on (e.g., 'rate limits', 'data models', 'error handling')",
      required: false,
    },
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Analyze the ${args.api_name} API in detail.

${args.focus_area ? `Focus area: ${args.focus_area}` : ""}

Please provide a comprehensive analysis:
1. Find the API in the directory and get its specification
2. Analyze the API structure and capabilities:
   - Available endpoints and operations
   - Data models and schemas
   - Authentication and security
   - Rate limiting and quotas
   - Error handling and status codes
3. Identify strengths and limitations
4. Provide integration recommendations
5. Suggest best practices for using this API
6. Highlight any potential issues or gotchas
7. Compare with similar APIs in the directory

Use the available tools to fetch the API specification and compare with related APIs.`,
      },
    },
  ],
};

export default prompt;
