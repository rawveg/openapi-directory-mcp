// @ts-nocheck
import { PromptTemplate } from "../types.js";

export const prompt: PromptTemplate = {
  name: "api_test_suite",
  description: "Generate comprehensive test suites for API integrations",
  template: "Generate {{test_framework}} test suite for {{api_name}} API",
  category: "action-oriented",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to test",
      required: true,
    },
    {
      name: "test_framework",
      description: "Test framework (jest, pytest, go-test, etc.)",
      required: true,
    },
    {
      name: "coverage_type",
      description: "Test coverage type (unit, integration, e2e)",
      required: true,
    },
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Generate a comprehensive ${args.coverage_type} test suite for the ${args.api_name} API using ${args.test_framework}.

Please create thorough test coverage:

**Phase 1: API Analysis**
1. Use 'search_apis' to find the ${args.api_name} API
2. Use 'get_api_summary' to understand authentication and structure
3. Use 'get_endpoints' to identify all endpoints to test
4. Use 'get_endpoint_details' for each endpoint's requirements

**Phase 2: Test Planning**
5. Identify test scenarios for each endpoint:
   - Happy path scenarios
   - Error cases (4xx, 5xx responses)
   - Edge cases (boundary values, empty data)
   - Authentication failures
   - Rate limiting scenarios

**Phase 3: Test Suite Generation**
6. Generate test setup and teardown
7. Create mock responses based on OpenAPI examples
8. Generate authentication test helpers
9. Create data factories for test data generation
10. Add assertion helpers for response validation

**Test Categories to Include:**
- **Authentication Tests**: Token validation, refresh, expiry
- **Input Validation**: Required fields, data types, formats
- **Response Validation**: Schema compliance, status codes
- **Error Handling**: Network errors, timeouts, retries
- **Edge Cases**: Large payloads, special characters, Unicode
- **Performance**: Response times, concurrent requests

**${args.test_framework} Specific Features:**
- Use appropriate assertion libraries
- Include setup/teardown hooks
- Add test data builders/factories
- Generate mock server configurations
- Include coverage reporting setup
- Add CI/CD integration examples

**Mock Strategy:**
- Generate realistic mock responses from OpenAPI examples
- Create reusable mock server setup
- Include various response scenarios
- Add network simulation (delays, failures)

Begin by analyzing the API structure to plan comprehensive test coverage.`,
      },
    },
  ],
};

export default prompt;
