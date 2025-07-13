import { PromptTemplate } from "../types.js";

export const prompt: PromptTemplate = {
  name: "api_type_generator",
  description:
    "Generate TypeScript/Python/Go type definitions from OpenAPI specs",
  template: "Generate {{language}} type definitions for {{api_name}} API",
  category: "action-oriented",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to generate types for",
      required: true,
    },
    {
      name: "language",
      description: "Target language (typescript, python, go, rust)",
      required: true,
    },
    {
      name: "output_path",
      description: "Output file path for generated types",
      required: true,
    },
    {
      name: "include_validators",
      description: "Include runtime validators (true/false)",
      required: false,
    },
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Generate ${args.language} type definitions for the ${args.api_name} API.

Output path: ${args.output_path}
${args.include_validators === "true" ? "Include runtime validators: Yes" : ""}

Please generate comprehensive type definitions:

**Phase 1: API Discovery**
1. Use 'search_apis' to find the ${args.api_name} API
2. Use 'get_api_summary' to understand the API structure
3. Use 'get_openapi_spec' to fetch the complete OpenAPI specification

**Phase 2: Schema Analysis**
4. Extract all data models from the OpenAPI spec
5. Identify request/response schemas for all endpoints
6. Map OpenAPI types to ${args.language} native types
7. Handle nested objects, arrays, and unions

**Phase 3: Code Generation**
8. Generate base types for all data models
9. Create request/response interfaces for each endpoint
10. Add proper imports and module structure
11. Include JSDoc/docstrings with field descriptions
12. Handle optional vs required fields correctly
13. Add enum types where applicable

**Language-Specific Features:**
${
  args.language === "typescript"
    ? `
- Use proper TypeScript syntax with strict types
- Generate union types for oneOf/anyOf schemas
- Add utility types for partial updates
- Include branded types for IDs where appropriate
${args.include_validators === "true" ? "- Generate Zod schemas for runtime validation" : ""}
`
    : ""
}
${
  args.language === "python"
    ? `
- Use typing annotations (Union, Optional, List, Dict)
- Generate Pydantic models if validators requested
- Use dataclasses for simple models
- Include proper __slots__ for performance
${args.include_validators === "true" ? "- Add Pydantic validators for field validation" : ""}
`
    : ""
}
${
  args.language === "go"
    ? `
- Use proper Go struct tags (json, yaml)
- Generate pointer types for optional fields
- Add validation tags if validators requested
- Include custom marshal/unmarshal methods if needed
${args.include_validators === "true" ? "- Use go-playground/validator tags" : ""}
`
    : ""
}

**Output Requirements:**
- Clean, idiomatic ${args.language} code
- Comprehensive type coverage
- Clear field documentation
- Consistent naming conventions
- Error-free compilation

Begin by discovering the API and fetching its OpenAPI specification.`,
      },
    },
  ],
};

export default prompt;
