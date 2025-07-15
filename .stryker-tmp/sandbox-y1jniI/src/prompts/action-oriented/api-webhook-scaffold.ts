// @ts-nocheck
import { PromptTemplate } from "../types.js";

export const prompt: PromptTemplate = {
  name: "api_webhook_scaffold",
  description: "Generate webhook handling infrastructure for APIs",
  template:
    "Generate webhook handlers for {{api_name}} API with {{webhook_types}} types",
  category: "action-oriented",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API that sends webhooks",
      required: true,
    },
    {
      name: "webhook_types",
      description: "Specific webhook types to handle (comma-separated)",
      required: false,
    },
    {
      name: "verification_method",
      description: "Webhook verification method (hmac, jwt, basic)",
      required: false,
    },
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Generate webhook handling infrastructure for ${args.api_name} webhooks.

${args.webhook_types ? `Webhook types: ${args.webhook_types}` : "Handle all webhook types"}
${args.verification_method ? `Verification method: ${args.verification_method}` : "Auto-detect from API spec"}

Please create complete webhook infrastructure:

**Phase 1: Webhook Discovery**
1. Use 'search_apis' to find the ${args.api_name} API
2. Use 'get_api_summary' and 'get_endpoints' to find webhook documentation
3. Use 'get_endpoint_details' to understand webhook payloads
4. Identify webhook verification requirements

**Phase 2: Infrastructure Design**
5. Design webhook endpoint handlers
6. Plan signature verification system
7. Create event routing architecture
8. Design retry and dead letter queue handling

**Phase 3: Code Generation**
9. Generate webhook receiver endpoints
10. Create signature verification middleware
11. Add event type routing
12. Implement processing queues
13. Add monitoring and logging

**Webhook Infrastructure Components:**

**1. Webhook Receiver:**
- HTTP endpoint to receive webhooks
- Request validation and parsing
- Signature verification
- Event type detection

**2. Verification System:**
${
  args.verification_method === "hmac" || !args.verification_method
    ? `
- HMAC signature validation
- Timestamp verification to prevent replay attacks
- Secret key management
`
    : ""
}
${
  args.verification_method === "jwt"
    ? `
- JWT token validation
- Public key verification
- Claims validation
`
    : ""
}
${
  args.verification_method === "basic"
    ? `
- Basic authentication
- API key validation
- IP whitelist checking
`
    : ""
}

**3. Event Processing:**
- Type-safe event handlers
- Async processing queues
- Error handling and retries
- Dead letter queue for failed events

**4. Monitoring & Observability:**
- Webhook delivery tracking
- Processing metrics
- Error rate monitoring
- Alert configuration

**Generated Code Structure:**
\`\`\`
webhooks/
├── receivers/         # Webhook endpoints
├── handlers/          # Event processing logic
├── verification/      # Signature validation
├── queues/           # Async processing
├── types/            # Webhook event types
└── monitoring/       # Metrics and logging
\`\`\`

**Framework Integration:**
- Express.js middleware
- FastAPI dependencies
- Error boundary handling
- Request logging
- Health check endpoints

Begin by analyzing the API's webhook documentation and requirements.`,
      },
    },
  ],
};

export default prompt;
