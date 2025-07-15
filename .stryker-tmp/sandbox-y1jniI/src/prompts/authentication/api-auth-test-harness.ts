// @ts-nocheck
import { PromptTemplate } from "../types.js";

export const prompt: PromptTemplate = {
  name: "api_auth_test_harness",
  description: "Generate comprehensive authentication testing setup",
  template:
    "Generate authentication test harness for {{api_name}} API with {{test_credentials_location}} credentials",
  category: "authentication",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to test authentication for",
      required: true,
    },
    {
      name: "test_credentials_location",
      description: "Location of test credentials (env, config, mock)",
      required: false,
    },
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Generate comprehensive authentication testing setup for the ${args.api_name} API.

${args.test_credentials_location ? `Test credentials: ${args.test_credentials_location}` : "Use mock credentials and servers"}

Please create thorough authentication testing:

**Phase 1: Authentication Test Analysis**
1. Use 'search_apis' to find the ${args.api_name} API
2. Use 'get_openapi_spec' to understand all authentication methods
3. Identify test scenarios for each auth type
4. Plan mock server and credential requirements

**Phase 2: Test Strategy Design**
5. Create test cases for successful authentication
6. Design failure scenario tests (invalid credentials, expired tokens)
7. Plan integration tests with real authentication flows
8. Create performance tests for auth operations

**Phase 3: Test Harness Generation**
9. Generate mock authentication servers
10. Create test credential management
11. Add authentication flow test suites
12. Implement security vulnerability tests
13. Add performance and load testing

**Authentication Test Categories:**

**1. Credential Validation Tests:**
\`\`\`typescript
describe('API Key Authentication', () => {
  test('should authenticate with valid API key', async () => {
    const response = await api.get('/protected', {
      headers: { 'X-API-Key': validApiKey }
    });
    expect(response.status).toBe(200);
  });
  
  test('should reject invalid API key', async () => {
    const response = await api.get('/protected', {
      headers: { 'X-API-Key': 'invalid-key' }
    });
    expect(response.status).toBe(401);
  });
});
\`\`\`

**2. OAuth2 Flow Tests:**
- Authorization code exchange
- Token refresh mechanisms
- PKCE validation
- Scope verification
- State parameter validation

**3. Security Tests:**
- Token replay attacks
- CSRF protection
- Token hijacking prevention
- Brute force protection
- Rate limiting enforcement

**4. Edge Case Tests:**
- Expired token handling
- Malformed token processing
- Missing authentication headers
- Invalid signature verification
- Network timeout scenarios

**Mock Infrastructure:**
\`\`\`
test-harness/
├── mocks/           # Mock authentication servers
├── credentials/     # Test credential management
├── scenarios/       # Test scenario definitions
├── utils/          # Testing utilities
├── fixtures/       # Test data and responses
└── integration/    # End-to-end test flows
\`\`\`

**Mock Authentication Server:**
- Simulates real OAuth2 provider
- Configurable response scenarios
- Token generation and validation
- Rate limiting simulation
- Error condition simulation

**Test Credential Management:**
${
  args.test_credentials_location === "env"
    ? `
- Environment variable based credentials
- Separate test environment configuration
- Credential rotation testing
- Secret management integration
`
    : ""
}
${
  args.test_credentials_location === "mock" || !args.test_credentials_location
    ? `
- Mock credential generation
- Deterministic test tokens
- Configurable expiration times
- Invalid credential scenarios
`
    : ""
}

**Performance Testing:**
- Authentication latency measurement
- Token refresh performance
- Concurrent authentication testing
- Rate limit compliance verification

**Security Vulnerability Testing:**
- Token enumeration attacks
- Timing attack prevention
- Injection attack protection
- Cross-site request forgery tests

Begin by analyzing the API's authentication methods to design comprehensive test coverage.`,
      },
    },
  ],
};

export default prompt;
