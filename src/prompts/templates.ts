import { PromptMessage } from '@modelcontextprotocol/sdk/types.js';

export interface PromptTemplate {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
  generateMessages: (args: Record<string, unknown>) => PromptMessage[];
}

export const API_DISCOVERY_PROMPT: PromptTemplate = {
  name: "api_discovery",
  description: "Help discover APIs for specific use cases and requirements",
  arguments: [
    {
      name: "use_case",
      description: "What you want to accomplish (e.g., 'send emails', 'process payments', 'analyze images')",
      required: true
    },
    {
      name: "requirements",
      description: "Specific requirements or constraints (e.g., 'free tier available', 'good documentation', 'REST API')",
      required: false
    }
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `I need to find APIs for: ${args.use_case}

${args.requirements ? `Requirements: ${args.requirements}` : ''}

Please help me:
1. Search the APIs.guru directory for relevant APIs
2. Evaluate the top candidates based on:
   - API quality and documentation
   - Authentication requirements
   - Rate limits and pricing
   - Community adoption
3. Provide specific API recommendations with reasons
4. Include links to documentation and OpenAPI specs

Use the available tools to search and analyze APIs from the directory.`
      }
    }
  ]
};

export const API_INTEGRATION_GUIDE: PromptTemplate = {
  name: "api_integration_guide",
  description: "Generate step-by-step integration guide for a specific API",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to integrate with",
      required: true
    },
    {
      name: "programming_language",
      description: "Programming language for code examples (e.g., 'JavaScript', 'Python', 'cURL')",
      required: false
    },
    {
      name: "use_case",
      description: "Specific functionality you want to implement",
      required: false
    }
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `I want to integrate with the ${args.api_name} API.

${args.programming_language ? `Programming language: ${args.programming_language}` : ''}
${args.use_case ? `Use case: ${args.use_case}` : ''}

Please provide a complete integration guide:
1. Find the API in the directory and get its OpenAPI specification
2. Analyze the authentication requirements
3. Identify the relevant endpoints for my use case
4. Generate code examples for:
   - Authentication setup
   - Making API calls
   - Handling responses and errors
5. Provide best practices and common pitfalls
6. Include rate limiting and error handling strategies

Use the available tools to fetch the API specification and analyze its capabilities.`
      }
    }
  ]
};

export const API_COMPARISON_PROMPT: PromptTemplate = {
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

export const AUTHENTICATION_GUIDE: PromptTemplate = {
  name: "authentication_guide",
  description: "Understand and implement authentication for APIs",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to understand authentication for",
      required: true
    },
    {
      name: "auth_type",
      description: "Specific authentication type if known (e.g., 'OAuth2', 'API Key', 'JWT')",
      required: false
    }
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `I need help with authentication for the ${args.api_name} API.

${args.auth_type ? `Authentication type: ${args.auth_type}` : ''}

Please provide a comprehensive authentication guide:
1. Find the API in the directory and get its specification
2. Analyze the authentication requirements from the OpenAPI spec
3. Explain the authentication flow step-by-step
4. Provide code examples for:
   - Obtaining credentials/tokens
   - Making authenticated requests
   - Handling token refresh (if applicable)
   - Error handling for auth failures
5. Include security best practices
6. Explain common authentication pitfalls and how to avoid them

Use the available tools to fetch the API specification and analyze its security schemas.`
      }
    }
  ]
};

export const CODE_GENERATION_PROMPT: PromptTemplate = {
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

export const API_DOCUMENTATION_ANALYSIS: PromptTemplate = {
  name: "api_documentation_analysis",
  description: "Analyze API capabilities, limitations, and best practices",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to analyze",
      required: true
    },
    {
      name: "focus_area",
      description: "Specific area to focus on (e.g., 'rate limits', 'data models', 'error handling')",
      required: false
    }
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Analyze the ${args.api_name} API in detail.

${args.focus_area ? `Focus area: ${args.focus_area}` : ''}

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

Use the available tools to fetch the API specification and compare with related APIs.`
      }
    }
  ]
};

export const TROUBLESHOOTING_GUIDE: PromptTemplate = {
  name: "troubleshooting_guide",
  description: "Help debug API integration issues",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API having issues with",
      required: true
    },
    {
      name: "error_description",
      description: "Description of the error or issue",
      required: true
    },
    {
      name: "code_snippet",
      description: "Code snippet causing the issue (optional)",
      required: false
    }
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `I'm having issues with the ${args.api_name} API.

Error/Issue: ${args.error_description}

${args.code_snippet ? `Code snippet:\n\`\`\`\n${args.code_snippet}\n\`\`\`` : ''}

Please help me troubleshoot:
1. Find the API in the directory and analyze its specification
2. Identify potential causes of the issue based on:
   - API documentation and requirements
   - Common integration problems
   - Authentication and authorization issues
   - Rate limiting and quota problems
3. Provide step-by-step debugging steps
4. Suggest fixes and improvements
5. Include prevention strategies for future issues
6. Provide corrected code examples if applicable

Use the available tools to fetch the API specification and analyze the error context.`
      }
    }
  ]
};

export const ALL_PROMPTS: PromptTemplate[] = [
  API_DISCOVERY_PROMPT,
  API_INTEGRATION_GUIDE,
  API_COMPARISON_PROMPT,
  AUTHENTICATION_GUIDE,
  CODE_GENERATION_PROMPT,
  API_DOCUMENTATION_ANALYSIS,
  TROUBLESHOOTING_GUIDE
];