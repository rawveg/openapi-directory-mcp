import { PromptTemplate } from '../types.js';

export const prompt: PromptTemplate = {
  name: "api_migration_assistant",
  description: "Help migrate from one API version/provider to another",
  arguments: [
    {
      name: "from_api",
      description: "Current API name/version to migrate from",
      required: true
    },
    {
      name: "to_api",
      description: "Target API name/version to migrate to",
      required: true
    },
    {
      name: "mapping_strategy",
      description: "Migration strategy (direct, adapter, gradual)",
      required: false
    }
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Help me migrate from ${args.from_api} to ${args.to_api}.

${args.mapping_strategy ? `Migration strategy: ${args.mapping_strategy}` : 'Use adapter pattern'}

Please create a comprehensive migration plan:

**Phase 1: API Comparison Analysis**
1. Use 'search_apis' to find both APIs
2. Use 'get_api_summary' for both to compare basic capabilities
3. Use 'get_endpoints' to compare available endpoints
4. Use 'get_endpoint_details' to analyze parameter differences

**Phase 2: Compatibility Analysis**
5. Map equivalent endpoints between APIs
6. Identify breaking changes in data structures
7. Compare authentication methods
8. Analyze rate limits and quotas
9. Find deprecated vs new features

**Phase 3: Migration Strategy Generation**
10. Create endpoint mapping table
11. Generate data transformation functions
12. Design authentication migration plan
13. Plan phased rollout strategy
14. Create rollback procedures

**Migration Deliverables:**
- **Compatibility Matrix**: Endpoint-by-endpoint comparison
- **Data Mappers**: Transform request/response formats
- **Adapter Layer**: Unified interface for both APIs
- **Migration Scripts**: Automated migration tools
- **Test Suite**: Validate migration correctness
- **Rollout Plan**: Phased migration strategy

**Migration Patterns:**
${args.mapping_strategy === 'adapter' || !args.mapping_strategy ? `
**Adapter Pattern:**
- Create unified interface wrapping both APIs
- Route calls to appropriate API version
- Handle data format differences transparently
- Enable gradual migration endpoint by endpoint
` : ''}
${args.mapping_strategy === 'direct' ? `
**Direct Migration:**
- Replace all calls immediately
- Update data structures in one go
- Requires comprehensive testing
- Faster but higher risk approach
` : ''}
${args.mapping_strategy === 'gradual' ? `
**Gradual Migration:**
- Migrate endpoints one by one
- Run both APIs in parallel
- Use feature flags for switching
- Monitor and compare results
` : ''}

**Risk Mitigation:**
- Identify high-risk changes
- Create comprehensive test coverage
- Plan monitoring and alerting
- Design quick rollback mechanisms
- Document all breaking changes

Begin by analyzing both APIs to understand the migration scope.`
      }
    }
  ]
};

export default prompt;