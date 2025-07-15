// @ts-nocheck
import { PromptTemplate } from "../types.js";

export const prompt: PromptTemplate = {
  name: "api_auth_middleware",
  description: "Generate framework-specific authentication middleware",
  template:
    "Generate {{framework}} authentication middleware for {{api_name}} API",
  category: "authentication",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to create middleware for",
      required: true,
    },
    {
      name: "framework",
      description: "Target framework (express, fastapi, gin, django, etc.)",
      required: true,
    },
    {
      name: "auth_strategy",
      description: "Authentication strategy (jwt, bearer, apikey, oauth2)",
      required: false,
    },
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Generate ${args.framework} authentication middleware for the ${args.api_name} API.

${args.auth_strategy ? `Authentication strategy: ${args.auth_strategy}` : "Auto-detect from API specification"}

Please create comprehensive middleware:

**Phase 1: API Authentication Analysis**
1. Use 'search_apis' to find the ${args.api_name} API
2. Use 'get_openapi_spec' to extract security requirements
3. Identify authentication methods and token formats
4. Analyze protected vs public endpoints

**Phase 2: Middleware Design**
5. Design middleware stack for ${args.framework}
6. Plan authentication flow integration
7. Create authorization and access control logic
8. Design error handling and response formatting

**Phase 3: Implementation Generation**
9. Generate authentication middleware functions
10. Create token validation and parsing
11. Add user context injection
12. Implement error handling middleware
13. Add logging and monitoring

**${args.framework} Middleware Features:**

${
  args.framework === "express"
    ? `
**Express.js Middleware:**
\`\`\`typescript
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: UserContext;
  token?: TokenInfo;
}

export const authenticateAPI = async (
  req: AuthenticatedRequest,
  res: Response, 
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    const user = await validateToken(token);
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
};
\`\`\`
`
    : ""
}

${
  args.framework === "fastapi"
    ? `
**FastAPI Dependencies:**
\`\`\`python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def authenticate_api(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> UserContext:
    try:
        token = credentials.credentials
        user = await validate_token(token)
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"}
        )
\`\`\`
`
    : ""
}

${
  args.framework === "gin"
    ? `
**Gin Middleware:**
\`\`\`go
func AuthenticateAPI() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := extractToken(c)
        if token == "" {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "Authentication required",
            })
            c.Abort()
            return
        }
        
        user, err := validateToken(token)
        if err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "Invalid token",
            })
            c.Abort()
            return
        }
        
        c.Set("user", user)
        c.Next()
    }
}
\`\`\`
`
    : ""
}

**Authentication Features:**
- Token extraction from headers/cookies/query
- Multi-format token support (JWT, opaque, API keys)
- User context injection
- Permission and scope validation
- Rate limiting integration
- Audit logging

**Security Features:**
- Token blacklist checking
- Expiration validation
- Signature verification
- Scope-based authorization
- IP allowlist support
- Brute force protection

**Error Handling:**
- Consistent error response format
- Detailed logging for debugging
- Security event monitoring
- Graceful degradation options

**Generated Middleware Stack:**
\`\`\`
middleware/
├── auth/            # Core authentication logic
├── validation/      # Token and credential validation  
├── context/        # User context management
├── errors/         # Error handling and formatting
├── logging/        # Security event logging
└── utils/          # Helper functions
\`\`\`

Begin by analyzing the API's authentication requirements for ${args.framework} integration.`,
      },
    },
  ],
};

export default prompt;
