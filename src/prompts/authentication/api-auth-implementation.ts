import { PromptTemplate } from '../types.js';

export const prompt: PromptTemplate = {
  name: "api_auth_implementation",
  description: "Generate complete authentication implementation from OpenAPI security schemes",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to implement authentication for",
      required: true
    },
    {
      name: "framework",
      description: "Target framework (express, fastapi, gin, etc.)",
      required: false
    },
    {
      name: "credential_storage",
      description: "Credential storage method (env, config, keychain, vault)",
      required: false
    }
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Generate complete authentication implementation for the ${args.api_name} API.

${args.framework ? `Target framework: ${args.framework}` : 'Generate framework-agnostic code'}
${args.credential_storage ? `Credential storage: ${args.credential_storage}` : 'Use environment variables'}

Please create comprehensive authentication code:

**Phase 1: Security Scheme Analysis**
1. Use 'search_apis' to find the ${args.api_name} API
2. Use 'get_api_summary' to understand authentication requirements
3. Use 'get_openapi_spec' to extract complete security schemes
4. Analyze all authentication methods supported

**Phase 2: Authentication Pattern Detection**
5. Identify security scheme types (apiKey, http, oauth2, openIdConnect)
6. Extract OAuth2 flows and scopes if applicable
7. Determine authentication header/query parameter names
8. Find token endpoints and refresh mechanisms

**Phase 3: Implementation Generation**
9. Generate authentication classes for each scheme type
10. Create credential management system
11. Add token refresh and expiry handling
12. Implement authentication middleware
13. Add comprehensive error handling

**Authentication Patterns Supported:**

**1. API Key Authentication:**
\`\`\`typescript
// Header-based API key
headers: { 'X-API-Key': apiKey }

// Query parameter API key  
url: 'https://api.example.com/data?api_key=' + apiKey

// Cookie-based API key
headers: { 'Cookie': 'auth-token=' + apiKey }
\`\`\`

**2. Bearer Token Authentication:**
\`\`\`typescript
headers: { 
  'Authorization': 'Bearer ' + token 
}
\`\`\`

**3. Basic Authentication:**
\`\`\`typescript
const credentials = btoa(username + ':' + password);
headers: { 
  'Authorization': 'Basic ' + credentials 
}
\`\`\`

**4. OAuth2 Flows:**
- Authorization Code with PKCE
- Client Credentials
- Resource Owner Password
- Implicit (deprecated but supported)
- Device Authorization Grant

**5. Custom Authentication:**
- HMAC signatures
- JWT tokens with custom claims
- Multi-factor authentication
- Certificate-based authentication

**Generated Authentication System:**
\`\`\`
auth/
├── schemes/          # Individual auth scheme handlers
├── managers/         # Credential and token managers  
├── flows/           # OAuth2 flow implementations
├── middleware/      # Framework integration
├── storage/         # Credential storage adapters
└── utils/           # Crypto and validation helpers
\`\`\`

**Key Features:**
- Automatic token refresh before expiry
- Secure credential storage
- Thread-safe token management
- Comprehensive error handling
- Audit logging for security events
- Rate limit aware authentication

**Framework Integration:**
${args.framework ? `
Generate ${args.framework}-specific:
- Middleware/dependencies
- Route protection
- Error handlers
- Configuration setup
` : ''}

Begin by extracting and analyzing the API's security schemes from the OpenAPI specification.`
      }
    }
  ]
};

export default prompt;