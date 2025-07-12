import { PromptTemplate } from '../types.js';

export const prompt: PromptTemplate = {
  name: "api_auth_debugger",
  description: "Generate debugging utilities for authentication troubleshooting",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to create auth debugging for",
      required: true
    }
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Generate authentication debugging utilities for the ${args.api_name} API.

Please create comprehensive debugging tools:

**Phase 1: Authentication Debug Analysis**
1. Use 'search_apis' to find the ${args.api_name} API
2. Use 'get_openapi_spec' to understand authentication mechanisms
3. Identify common authentication failure points
4. Plan debugging tool requirements

**Phase 2: Debug Tool Design**
5. Design authentication flow visualization
6. Plan token inspection and validation tools
7. Create request/response debugging utilities
8. Design authentication state monitoring

**Phase 3: Debug Tool Generation**
9. Generate authentication inspector
10. Create token decoder and validator
11. Add request/response logger
12. Implement authentication flow tracer
13. Add troubleshooting guide generator

**Authentication Debugging Tools:**

**1. Token Inspector:**
\`\`\`typescript
class TokenInspector {
  inspect(token: string) {
    return {
      type: this.detectTokenType(token),
      payload: this.decodePayload(token),
      signature: this.validateSignature(token),
      expiration: this.checkExpiration(token),
      scopes: this.extractScopes(token),
      issuer: this.getIssuer(token)
    };
  }
  
  validateAgainstAPI(token: string, apiSpec: OpenAPISpec) {
    // Validate token against API requirements
    const requirements = apiSpec.components.securitySchemes;
    return this.checkCompliance(token, requirements);
  }
}
\`\`\`

**2. Authentication Flow Tracer:**
\`\`\`typescript
class AuthFlowTracer {
  traceOAuth2Flow(authConfig: OAuth2Config) {
    console.log('🔍 OAuth2 Flow Trace:');
    console.log('1. Authorization URL:', this.buildAuthUrl(authConfig));
    console.log('2. Expected callback parameters:', this.getCallbackParams());
    console.log('3. Token exchange endpoint:', authConfig.tokenEndpoint);
    console.log('4. Required headers:', this.getRequiredHeaders());
  }
  
  traceAPIKeyAuth(apiKeyConfig: APIKeyConfig) {
    console.log('🔑 API Key Authentication:');
    console.log('Header name:', apiKeyConfig.headerName);
    console.log('Query parameter:', apiKeyConfig.queryParam);
    console.log('Expected format:', apiKeyConfig.format);
  }
}
\`\`\`

**3. Request/Response Debugger:**
\`\`\`typescript
class AuthRequestDebugger {
  debugRequest(request: HTTPRequest) {
    console.log('📤 Authentication Request Debug:');
    console.log('Headers:', this.inspectAuthHeaders(request.headers));
    console.log('Authorization header:', request.headers.authorization);
    console.log('API key headers:', this.findApiKeyHeaders(request.headers));
    console.log('Cookies:', this.inspectAuthCookies(request.cookies));
    console.log('Query params:', this.inspectAuthParams(request.query));
  }
  
  debugResponse(response: HTTPResponse) {
    console.log('📥 Authentication Response Debug:');
    console.log('Status:', response.status);
    console.log('Auth headers:', response.headers['www-authenticate']);
    console.log('Token response:', this.parseTokenResponse(response.body));
    console.log('Error details:', this.parseAuthError(response.body));
  }
}
\`\`\`

**4. Common Error Diagnostics:**
- Invalid token format detection
- Expired token identification
- Missing scope analysis
- Incorrect header formatting
- CORS authentication issues
- Rate limit exceeded detection

**Generated Debug Tools:**
\`\`\`
auth-debugger/
├── inspector/       # Token and credential inspection
├── tracer/         # Authentication flow tracing
├── validator/      # Compliance and format validation
├── logger/         # Request/response logging
├── diagnostics/    # Error diagnosis and suggestions
└── cli/            # Command-line debugging tools
\`\`\`

**CLI Debug Commands:**
\`\`\`bash
# Inspect a JWT token
auth-debug inspect-token "eyJhbGciOiJIUzI1NiIs..."

# Trace OAuth2 flow
auth-debug trace-oauth2 --client-id=abc --redirect-uri=http://localhost

# Validate API key format
auth-debug validate-apikey --key="sk_test_123" --api="${args.api_name}"

# Debug authentication request
auth-debug request --url="/api/protected" --auth-header="Bearer token"
\`\`\`

**Troubleshooting Guide Generation:**
- Automatic error code explanations
- Step-by-step resolution guides
- Common pitfall identification
- Best practice recommendations

Begin by analyzing the API's authentication mechanisms to create targeted debugging tools.`
      }
    }
  ]
};

export default prompt;