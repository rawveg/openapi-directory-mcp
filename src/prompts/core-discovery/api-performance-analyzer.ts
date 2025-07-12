import { PromptTemplate } from "../types.js";

export const prompt: PromptTemplate = {
  name: "api_performance_analyzer",
  description:
    "Analyze API performance characteristics and optimization opportunities",
  template: "Analyze {{api_name}} API performance focusing on {{focus_area}}",
  category: "core-discovery",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to analyze performance for",
      required: true,
    },
    {
      name: "focus_area",
      description:
        "Specific performance area to focus on (latency, throughput, caching, etc.)",
      required: false,
    },
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Analyze performance characteristics of the ${args.api_name} API.

${args.focus_area ? `Focus area: ${args.focus_area}` : "Analyze all performance aspects"}

Please provide comprehensive performance analysis:

**Phase 1: API Performance Discovery**
1. Use 'search_apis' to find the ${args.api_name} API
2. Use 'get_api_summary' to understand API structure and limits
3. Use 'get_endpoints' to identify all available endpoints
4. Use 'get_endpoint_details' to analyze response patterns

**Phase 2: Performance Characteristics Analysis**
5. Analyze rate limiting and quota constraints
6. Evaluate response payload sizes and complexity
7. Identify caching opportunities and strategies
8. Assess authentication overhead and optimization

**Phase 3: Optimization Recommendations**
9. Recommend performance optimization strategies
10. Suggest efficient request patterns and batching
11. Identify bottlenecks and scaling limitations
12. Provide monitoring and metrics guidance

**Performance Analysis Areas:**
- **Latency**: Response times, geographic distribution
- **Throughput**: Request/response volume capabilities  
- **Caching**: Response caching strategies, cache headers
- **Batching**: Bulk operation support, request batching
- **Authentication**: Auth overhead, token caching
- **Rate Limiting**: Quota management, backoff strategies

**Optimization Strategies:**
- Connection pooling and reuse
- Response compression and optimization
- Efficient pagination patterns
- Smart retry and circuit breaker patterns
- Monitoring and alerting setup

Begin by analyzing the API's documented performance characteristics and constraints.`,
      },
    },
  ],
};

export default prompt;
