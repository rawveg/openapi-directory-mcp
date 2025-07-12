import { PromptTemplate } from '../types.js';

export const prompt: PromptTemplate = {
  name: "api_auth_flow_generator", 
  description: "Create interactive OAuth2 authentication flows with callback handlers",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API requiring OAuth2 authentication",
      required: true
    },
    {
      name: "redirect_uri",
      description: "OAuth2 redirect URI for callbacks",
      required: true
    },
    {
      name: "scope_requirements",
      description: "Required OAuth2 scopes (comma-separated)",
      required: false
    }
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Generate OAuth2 authentication flow for the ${args.api_name} API.

Redirect URI: ${args.redirect_uri}
${args.scope_requirements ? `Required scopes: ${args.scope_requirements}` : 'Use all available scopes'}

Please create complete OAuth2 flow implementation:

**Phase 1: OAuth2 Configuration Analysis**
1. Use 'search_apis' to find the ${args.api_name} API
2. Use 'get_openapi_spec' to extract OAuth2 security schemes
3. Identify authorization and token endpoints
4. Extract available scopes and their descriptions

**Phase 2: Flow Type Detection**
5. Determine supported OAuth2 flows:
   - Authorization Code with PKCE (recommended)
   - Client Credentials (backend-to-backend)
   - Device Authorization Grant (device flows)
6. Extract client registration requirements
7. Identify refresh token capabilities

**Phase 3: Implementation Generation**
8. Generate authorization URL builder
9. Create callback handler for authorization codes
10. Add token exchange implementation
11. Implement token refresh mechanism
12. Create secure token storage

**OAuth2 Flow Components:**

**1. Authorization Initiation:**
\`\`\`typescript
// Generate authorization URL with PKCE
const authUrl = oauth.getAuthorizationUrl({
  scope: '${args.scope_requirements || 'read write'}',
  redirectUri: '${args.redirect_uri}',
  state: secureRandomString(),
  codeChallenge: pkceChallenge,
  codeChallengeMethod: 'S256'
});
\`\`\`

**2. Callback Handler:**
\`\`\`typescript
// Handle OAuth2 callback
app.get('/oauth/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // Validate state parameter
  if (!validateState(state)) {
    throw new Error('Invalid state parameter');
  }
  
  // Exchange code for tokens
  const tokens = await oauth.exchangeCodeForTokens({
    code,
    redirectUri: '${args.redirect_uri}',
    codeVerifier: pkceVerifier
  });
  
  // Store tokens securely
  await tokenStorage.store(tokens);
});
\`\`\`

**3. Token Management:**
- Automatic refresh before expiry
- Secure storage with encryption
- Token revocation on logout
- Scope validation and management

**4. PKCE Implementation:**
- Code challenge generation
- Code verifier management
- Enhanced security for public clients
- Protection against authorization code interception

**Generated Components:**
\`\`\`
oauth2/
├── flows/           # OAuth2 flow implementations
├── handlers/        # Callback and webhook handlers
├── storage/         # Token storage adapters
├── pkce/           # PKCE implementation
├── scopes/         # Scope management
└── validation/     # Security validation
\`\`\`

**Security Features:**
- State parameter for CSRF protection
- PKCE for code injection prevention
- Secure token storage with encryption
- Token binding and validation
- Scope-based access control

**Frontend Integration:**
- JavaScript/TypeScript client
- React/Vue component examples
- Mobile app integration patterns
- Browser security considerations

Begin by analyzing the API's OAuth2 configuration and available flows.`
      }
    }
  ]
};

export default prompt;