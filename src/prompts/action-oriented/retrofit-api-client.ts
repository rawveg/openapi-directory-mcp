import { PromptTemplate } from "../types.js";

export const prompt: PromptTemplate = {
  name: "retrofit_api_client",
  description: "Retrofit existing codebase with a typed API client",
  template: "Retrofit {{target_directory}} with typed {{api_name}} API client",
  category: "action-oriented",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to integrate",
      required: true,
    },
    {
      name: "target_directory",
      description: "Directory path to analyze and retrofit",
      required: true,
    },
    {
      name: "detect_framework",
      description: "Whether to auto-detect framework (true/false)",
      required: false,
    },
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `I need to retrofit my existing codebase with a typed API client for: ${args.api_name}

Target directory: ${args.target_directory}
${args.detect_framework === "true" ? "Auto-detect framework: Yes" : ""}

Please help me retrofit my codebase using this approach:

**Phase 1: Codebase Analysis**
1. Scan the target directory for existing HTTP calls, API integrations
2. Identify framework patterns (Express, FastAPI, React, etc.)
3. Find existing API call patterns and error handling

**Phase 2: API Discovery & Analysis**
4. Use 'search_apis' to find the ${args.api_name} API
5. Use 'get_api_summary' to understand authentication and structure
6. Use 'get_endpoints' to see all available endpoints
7. Use 'get_endpoint_schema' for type generation

**Phase 3: Generate Integration Code**
8. Create typed client class that follows existing patterns
9. Generate TypeScript interfaces from OpenAPI schemas
10. Add proper error handling and retry logic
11. Include authentication setup
12. Generate usage examples that integrate with existing code

**Code Generation Requirements:**
- Follow existing code style and patterns
- Include proper TypeScript types
- Add comprehensive error handling
- Support both Promise and async/await patterns
- Include JSDoc documentation
- Add unit tests matching existing test patterns
- Ensure backward compatibility with existing code

Begin by analyzing the codebase structure and then discovering the API details.`,
      },
    },
  ],
};

export default prompt;
