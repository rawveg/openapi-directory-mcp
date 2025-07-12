import { PromptTemplate } from "../types.js";

export const prompt: PromptTemplate = {
  name: "authentication_guide",
  description: "Understand and implement authentication for APIs",
  template:
    "Guide for implementing {{auth_type}} authentication with {{api_name}} API",
  category: "core-discovery",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to understand authentication for",
      required: true,
    },
    {
      name: "auth_type",
      description:
        "Specific authentication type if known (e.g., 'OAuth2', 'API Key', 'JWT')",
      required: false,
    },
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `I need help with authentication for the ${args.api_name} API.

${args.auth_type ? `Authentication type: ${args.auth_type}` : ""}

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

Use the available tools to fetch the API specification and analyze its security schemas.`,
      },
    },
  ],
};

export default prompt;
