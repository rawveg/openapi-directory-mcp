import { PromptTemplate } from '../types.js';

export const prompt: PromptTemplate = {
  name: "api_rate_limiter",
  description: "Implement rate limiting and quota management for APIs",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to create rate limiting for",
      required: true
    },
    {
      name: "storage_backend",
      description: "Storage backend (redis, memory, database)",
      required: false
    },
    {
      name: "rate_limits",
      description: "Custom rate limits (e.g., '100/minute,1000/hour')",
      required: false
    }
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Implement rate limiting and quota management for the ${args.api_name} API.

${args.storage_backend ? `Storage backend: ${args.storage_backend}` : 'Use Redis for distributed rate limiting'}
${args.rate_limits ? `Custom rate limits: ${args.rate_limits}` : 'Extract limits from API documentation'}

Please create comprehensive rate limiting:

**Phase 1: API Rate Limit Analysis**
1. Use 'search_apis' to find the ${args.api_name} API
2. Use 'get_api_summary' to understand rate limiting policies
3. Use 'get_endpoint_details' to check per-endpoint limits
4. Identify quota types (requests, bandwidth, operations)

**Phase 2: Rate Limiter Design**
5. Design rate limiting algorithms (token bucket, sliding window)
6. Plan storage strategy for rate limit counters
7. Create quota tracking and enforcement
8. Design rate limit headers and responses

**Phase 3: Implementation Generation**
9. Generate rate limiter middleware
10. Create quota tracking system
11. Add graceful degradation logic
12. Implement rate limit monitoring
13. Add configuration management

**Rate Limiting Features:**

**1. Multiple Algorithm Support:**
- Token Bucket: Burst traffic handling
- Sliding Window: Precise rate limiting
- Fixed Window: Simple, efficient counting
- Leaky Bucket: Smooth traffic shaping

**2. Flexible Rate Definitions:**
\`\`\`
Rate Limit Examples:
- 100 requests per minute
- 1000 requests per hour
- 10MB bandwidth per day
- 50 API calls per user per hour
\`\`\`

**3. Storage Backends:**
${args.storage_backend === 'redis' || !args.storage_backend ? `
**Redis Backend:**
- Distributed rate limiting
- Atomic operations with Lua scripts
- Persistence and replication
- High performance at scale
` : ''}
${args.storage_backend === 'memory' ? `
**Memory Backend:**
- Fast, in-process limiting
- No external dependencies
- Limited to single instance
- Good for development/testing
` : ''}
${args.storage_backend === 'database' ? `
**Database Backend:**
- Persistent storage
- Complex quota queries
- Audit trail capability
- Slower but more features
` : ''}

**4. Advanced Features:**
- Per-user/per-IP/per-API-key limits
- Dynamic rate limit adjustment
- Rate limit sharing across endpoints
- Quota reset scheduling
- Rate limit exemptions

**Generated Components:**
\`\`\`
rate-limiter/
├── algorithms/        # Rate limiting algorithms
├── storage/          # Backend adapters
├── middleware/       # Framework integration
├── monitoring/       # Metrics and alerts
├── config/           # Rate limit definitions
└── utils/            # Helper functions
\`\`\`

**Integration Examples:**
- Express.js middleware
- API Gateway policies
- Microservice rate limiting
- Client-side rate limiting

Begin by analyzing the API's documented rate limits and quota policies.`
      }
    }
  ]
};

export default prompt;