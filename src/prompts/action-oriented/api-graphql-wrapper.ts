import { PromptTemplate } from "../types.js";

export const prompt: PromptTemplate = {
  name: "api_graphql_wrapper",
  description: "Create GraphQL wrapper for REST APIs",
  template: "Create {{schema_style}} GraphQL wrapper for {{api_name}} REST API",
  category: "action-oriented",
  arguments: [
    {
      name: "api_name",
      description: "Name of the REST API to wrap with GraphQL",
      required: true,
    },
    {
      name: "schema_style",
      description: "GraphQL schema style (relay, simple, custom)",
      required: false,
    },
    {
      name: "included_operations",
      description: "Specific operations to include (comma-separated)",
      required: false,
    },
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Create a GraphQL wrapper for the ${args.api_name} REST API.

${args.schema_style ? `Schema style: ${args.schema_style}` : "Use simple, intuitive schema design"}
${args.included_operations ? `Include operations: ${args.included_operations}` : "Wrap all major operations"}

Please create a comprehensive GraphQL API:

**Phase 1: REST API Analysis**
1. Use 'search_apis' to find the ${args.api_name} API
2. Use 'get_api_summary' to understand the API structure
3. Use 'get_endpoints' to catalog all available operations
4. Use 'get_endpoint_schema' to understand data models

**Phase 2: GraphQL Schema Design**
5. Map REST resources to GraphQL types
6. Design Query, Mutation, and Subscription operations
7. Plan relationship handling and data fetching
8. Create input types and enums

**Phase 3: Implementation Generation**
9. Generate GraphQL schema definitions
10. Create resolver functions for each operation
11. Add DataLoader for efficient batching
12. Implement authentication and authorization
13. Add error handling and validation

**GraphQL Schema Features:**

**1. Type System:**
\`\`\`graphql
# Example generated types
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
}
\`\`\`

**2. Query Operations:**
- Resource fetching with filtering
- Nested relationship resolution
- Pagination with connections
- Search and aggregation

**3. Mutation Operations:**
- Create, update, delete operations
- Batch mutations for efficiency
- Input validation and sanitization
- Optimistic UI support

**4. Advanced Features:**
${
  args.schema_style === "relay"
    ? `
**Relay Compliance:**
- Global ID specification
- Connection-based pagination
- Node interface implementation
- Mutation payload patterns
`
    : ""
}
- DataLoader for N+1 problem prevention
- Real-time subscriptions where applicable
- GraphQL Federation support
- Schema stitching capabilities

**Generated Components:**
\`\`\`
graphql-wrapper/
├── schema/           # GraphQL schema definitions
├── resolvers/        # Resolver implementations
├── dataloaders/      # Efficient data fetching
├── types/            # Generated TypeScript types
├── middleware/       # Authentication & validation
└── subscriptions/    # Real-time features
\`\`\`

**Resolver Implementation:**
- Efficient REST API calls
- Response transformation
- Error handling and mapping
- Caching strategies
- Authentication forwarding

**Performance Optimizations:**
- Query complexity analysis
- Rate limiting integration
- Response caching
- Batch request optimization
- Connection pooling

Begin by analyzing the REST API structure to design an intuitive GraphQL schema.`,
      },
    },
  ],
};

export default prompt;
