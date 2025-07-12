import { PromptTemplate } from '../types.js';

export const prompt: PromptTemplate = {
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

Please help me discover and evaluate APIs using this efficient workflow:

**Phase 1: Initial Discovery**
1. Use 'search_apis' tool to find relevant APIs (this returns paginated minimal results)
2. If needed, check additional pages using the pagination parameters
3. Use 'openapi://apis/summary' resource for directory overview and popular APIs

**Phase 2: Basic Evaluation** 
4. Use 'get_api_summary' tool for promising APIs to get:
   - Basic info, authentication type, documentation links
   - Categories, provider details, version info
   - This gives you essential details without overwhelming context

**Phase 3: Detailed Analysis (only for top candidates)**
5. Use 'get_endpoints' tool to see available endpoints (paginated)
6. Use 'get_endpoint_details' for specific endpoints you're interested in
7. Use 'get_endpoint_schema' or 'get_endpoint_examples' for implementation details

**Evaluation Criteria:**
- API quality and documentation availability
- Authentication requirements and complexity  
- Free tier availability and rate limits
- Community adoption and maintenance status
- Endpoint coverage for your use case

**Important:** Use the progressive discovery approach - start broad with search/summary, then drill down only into the most promising APIs. This prevents context saturation and allows comparison of many more APIs.

Begin with Phase 1 to discover relevant APIs efficiently.`
      }
    }
  ]
};

export default prompt;