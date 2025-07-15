// @ts-nocheck
import { PromptTemplate } from "../types.js";

export const prompt: PromptTemplate = {
  name: "api_error_handler",
  description: "Generate robust error handling and retry logic for APIs",
  template:
    "Generate error handling and {{retry_strategy}} retry logic for {{api_name}} API",
  category: "action-oriented",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to create error handling for",
      required: true,
    },
    {
      name: "retry_strategy",
      description: "Retry strategy (exponential, linear, fixed)",
      required: false,
    },
    {
      name: "error_mapping",
      description: "Custom error code mapping (optional)",
      required: false,
    },
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Generate robust error handling and retry logic for the ${args.api_name} API.

${args.retry_strategy ? `Retry strategy: ${args.retry_strategy}` : "Use exponential backoff"}
${args.error_mapping ? `Error mapping: ${args.error_mapping}` : ""}

Please create comprehensive error handling:

**Phase 1: API Error Analysis**
1. Use 'search_apis' to find the ${args.api_name} API
2. Use 'get_api_summary' and 'get_endpoints' to understand error responses
3. Use 'get_endpoint_details' to analyze error codes for each endpoint
4. Identify rate limiting and quota information

**Phase 2: Error Classification**
5. Categorize errors by type:
   - Client errors (4xx): Bad requests, authentication, not found
   - Server errors (5xx): Internal errors, service unavailable
   - Network errors: Timeouts, connection failures
   - Rate limiting: 429 responses, quota exceeded

**Phase 3: Error Handler Generation**
6. Create error classes/types for each category
7. Generate retry logic with backoff strategies
8. Add circuit breaker pattern for repeated failures
9. Create logging and monitoring integration
10. Add error context preservation

**Error Handling Features:**
- **Retry Logic**: Configurable attempts, backoff timing
- **Circuit Breaker**: Fail-fast when service is down
- **Error Context**: Preserve request details for debugging
- **Rate Limit Handling**: Respect retry-after headers
- **Timeout Management**: Progressive timeouts
- **Dead Letter Queue**: Handle permanently failed requests

**Retry Strategy Implementation:**
${
  args.retry_strategy === "exponential" || !args.retry_strategy
    ? `
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Jitter to prevent thundering herd
- Maximum retry attempts: 5
- Total timeout: 60 seconds
`
    : ""
}
${
  args.retry_strategy === "linear"
    ? `
- Linear backoff: 2s, 4s, 6s, 8s, 10s
- No jitter, predictable timing
- Maximum retry attempts: 5
`
    : ""
}
${
  args.retry_strategy === "fixed"
    ? `
- Fixed interval: 3 seconds between retries
- Maximum retry attempts: 3
- Quick failure detection
`
    : ""
}

**Code Generation Requirements:**
- Thread-safe error handling
- Comprehensive logging
- Metrics integration
- Configuration options
- Documentation with examples

Begin by analyzing the API's error response patterns.`,
      },
    },
  ],
};

export default prompt;
