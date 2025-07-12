import { PromptTemplate } from "../types.js";

export const prompt: PromptTemplate = {
  name: "troubleshooting_guide",
  description: "Help debug API integration issues",
  template: "Troubleshoot {{api_name}} API issue: {{error_description}}",
  category: "core-discovery",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API having issues with",
      required: true,
    },
    {
      name: "error_description",
      description: "Description of the error or issue",
      required: true,
    },
    {
      name: "code_snippet",
      description: "Code snippet causing the issue (optional)",
      required: false,
    },
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `I'm having issues with the ${args.api_name} API.

Error: ${args.error_description}
${args.code_snippet ? `Code snippet: ${args.code_snippet}` : ""}

Please help me troubleshoot this issue:
1. Find the API in the directory and get its specification
2. Analyze the error description against the API documentation
3. Identify potential causes:
   - Authentication issues
   - Request format problems
   - Parameter validation errors
   - Rate limiting or quota exceeded
   - Endpoint or version issues
4. Provide step-by-step debugging guidance
5. Suggest fixes and workarounds
6. Include corrected code examples
7. Recommend preventive measures and best practices

Use the available tools to fetch the API specification and analyze the endpoints involved.`,
      },
    },
  ],
};

export default prompt;
