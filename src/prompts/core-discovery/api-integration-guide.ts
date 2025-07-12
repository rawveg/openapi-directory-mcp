import { PromptTemplate } from "../types.js";

export const prompt: PromptTemplate = {
  name: "api_integration_guide",
  description: "Generate step-by-step integration guide for a specific API",
  template:
    "Generate {{programming_language}} integration guide for {{api_name}} API with {{use_case}} use case",
  category: "core-discovery",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to integrate with",
      required: true,
    },
    {
      name: "programming_language",
      description:
        "Programming language for code examples (e.g., 'JavaScript', 'Python', 'cURL')",
      required: false,
    },
    {
      name: "use_case",
      description: "Specific functionality you want to implement",
      required: false,
    },
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `I want to integrate with the ${args.api_name} API.

${args.programming_language ? `Programming language: ${args.programming_language}` : ""}
${args.use_case ? `Use case: ${args.use_case}` : ""}

Please create a comprehensive integration guide using this efficient approach:

**Step 1: API Discovery & Summary**
1. Search for the API using 'search_apis' tool with the API name
2. Get detailed summary using 'get_api_summary' tool to understand:
   - Authentication requirements and setup
   - Base URL and documentation links  
   - Available versions and preferred version
   - Categories and provider information

**Step 2: Endpoint Exploration**
3. Use 'get_endpoints' tool to see all available endpoints
4. Filter endpoints by tag if relevant to the use case
5. Identify the specific endpoints needed for the integration

**Step 3: Implementation Details**
6. For each needed endpoint, use 'get_endpoint_details' to understand:
   - Required parameters and their types
   - Response codes and error handling
   - Authentication and security requirements
7. Use 'get_endpoint_schema' to get request/response data structures
8. Use 'get_endpoint_examples' to see sample requests and responses

**Integration Guide Should Include:**
- Authentication setup and configuration
- Required headers and base URL setup
- Code examples for each endpoint (in specified language)
- Error handling and response processing
- Rate limiting considerations
- Best practices and common pitfalls

**Important:** Use the progressive discovery tools to gather information efficiently without overwhelming the context. Start with summary, then explore endpoints, then dive into implementation details only for relevant endpoints.

Begin by finding and summarizing the API details.`,
      },
    },
  ],
};

export default prompt;
