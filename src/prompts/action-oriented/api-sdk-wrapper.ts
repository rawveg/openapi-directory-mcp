import { PromptTemplate } from '../types.js';

export const prompt: PromptTemplate = {
  name: "api_sdk_wrapper",
  description: "Create a simplified, opinionated SDK wrapper for APIs",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to wrap",
      required: true
    },
    {
      name: "included_operations",
      description: "Specific operations to include (comma-separated)",
      required: false
    },
    {
      name: "naming_convention",
      description: "SDK naming convention (camelCase, snake_case, etc.)",
      required: false
    }
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Create a simplified SDK wrapper for the ${args.api_name} API.

${args.included_operations ? `Focus on operations: ${args.included_operations}` : 'Include all major operations'}
${args.naming_convention ? `Naming convention: ${args.naming_convention}` : 'Use idiomatic naming for target language'}

Please create an opinionated, easy-to-use SDK:

**Phase 1: API Analysis**
1. Use 'search_apis' to find the ${args.api_name} API
2. Use 'get_api_summary' to understand authentication and structure
3. Use 'get_endpoints' to see all available operations
4. Use 'get_endpoint_details' for the most commonly used endpoints

**Phase 2: SDK Design**
5. Group related operations into logical modules
6. Design fluent interface for common workflows
7. Create simplified method signatures
8. Plan configuration and authentication handling

**Phase 3: Implementation Generation**
9. Generate main SDK client class
10. Create module classes for grouped operations
11. Add convenience methods for common tasks
12. Implement proper error handling
13. Add comprehensive documentation

**SDK Features:**
- **Fluent Interface**: Chain method calls naturally
- **Smart Defaults**: Sensible configuration out of the box
- **Type Safety**: Full TypeScript/type annotations
- **Error Handling**: Meaningful error messages
- **Async Support**: Proper Promise/async-await patterns
- **Pagination Helpers**: Easy iteration over large datasets
- **Retry Logic**: Built-in resilience
- **Debug Mode**: Detailed logging when needed

**Code Organization:**
\`\`\`
SDK/
├── client.ts          # Main client class
├── auth/              # Authentication handling
├── modules/           # Feature-specific modules
├── types/             # Type definitions
├── utils/             # Helper utilities
└── errors/            # Custom error classes
\`\`\`

**Example SDK Usage:**
\`\`\`typescript
const client = new ${String(args.api_name || 'Api').replace(/[^a-zA-Z0-9]/g, '')}SDK({
  apiKey: 'your-key',
  debug: true
});

// Fluent interface example
const result = await client
  .users()
  .create({ name: 'John' })
  .withRetry(3)
  .execute();
\`\`\`

**Developer Experience Features:**
- Clear error messages with suggestions
- Comprehensive TypeScript intellisense
- Minimal required configuration
- Consistent naming across all methods
- Built-in validation and sanitization

Begin by analyzing the API to design an intuitive SDK interface.`
      }
    }
  ]
};

export default prompt;