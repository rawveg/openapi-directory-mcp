/**
 * Authentication handler for mock API servers
 * Supports all OpenAPI security schemes with proper validation
 */

import { OpenAPISecurityScheme, OpenAPISecurityRequirement } from '../types/openapi.js';
import { AuthenticationHandler, AuthValidationResult } from './types.js';

/**
 * Request interface for authentication validation
 */
interface AuthRequest {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
  body?: any;
}

/**
 * Security scheme with resolved reference
 */
interface ResolvedSecurityScheme extends OpenAPISecurityScheme {
  schemeName: string;
  scopes?: string[];
}

/**
 * Authentication handler implementation supporting all OpenAPI security schemes
 */
export class MockAuthenticationHandler implements AuthenticationHandler {
  /**
   * Validate authentication for a request against security requirements
   * @param req - Request object with headers, query, cookies
   * @param securityRequirements - Array of security requirements from OpenAPI spec
   * @param securitySchemes - Security schemes definitions from OpenAPI components
   * @returns Authentication validation result
   */
  validateAuth(
    req: AuthRequest,
    securityRequirements: OpenAPISecurityRequirement[],
    securitySchemes: Record<string, OpenAPISecurityScheme>
  ): AuthValidationResult {
    // If no security requirements, allow access
    if (!securityRequirements || securityRequirements.length === 0) {
      return { valid: true };
    }

    let lastError: AuthValidationResult | undefined;

    // Try each security requirement (OR logic between requirements)
    for (const requirement of securityRequirements) {
      const result = this.validateSecurityRequirement(req, requirement, securitySchemes);
      if (result.valid) {
        return result;
      }
      // Keep track of the last error for better error reporting
      lastError = result;
    }

    // No security requirement was satisfied - return the most specific error
    return lastError || {
      valid: false,
      error: 'Authentication required',
      statusCode: 401
    };
  }

  /**
   * Validate a single security requirement (AND logic within requirement)
   * @param req - Request object
   * @param requirement - Single security requirement
   * @param securitySchemes - Security schemes definitions
   * @returns Validation result
   */
  private validateSecurityRequirement(
    req: AuthRequest,
    requirement: OpenAPISecurityRequirement,
    securitySchemes: Record<string, OpenAPISecurityScheme>
  ): AuthValidationResult {
    const schemeNames = Object.keys(requirement);
    
    // Empty requirement means no authentication needed
    if (schemeNames.length === 0) {
      return { valid: true };
    }

    // All schemes in the requirement must be satisfied (AND logic)
    for (const schemeName of schemeNames) {
      const scheme = securitySchemes[schemeName];
      if (!scheme) {
        return {
          valid: false,
          error: `Unknown security scheme: ${schemeName}`,
          statusCode: 500
        };
      }

      const requiredScopes = requirement[schemeName] || [];
      const resolvedScheme: ResolvedSecurityScheme = {
        ...scheme,
        schemeName: schemeName,
        scopes: requiredScopes
      };

      const result = this.validateSecurityScheme(req, resolvedScheme);
      if (!result.valid) {
        // For AND logic, if any scheme fails, the whole requirement fails
        return result;
      }
    }

    return { valid: true };
  }

  /**
   * Validate a single security scheme
   * @param req - Request object
   * @param scheme - Security scheme to validate
   * @returns Validation result
   */
  private validateSecurityScheme(
    req: AuthRequest,
    scheme: ResolvedSecurityScheme
  ): AuthValidationResult {
    switch (scheme.type) {
      case 'apiKey':
        return this.validateApiKey(req, scheme);
      case 'http':
        return this.validateHttp(req, scheme);
      case 'oauth2':
        return this.validateOAuth2(req, scheme);
      case 'openIdConnect':
        return this.validateOpenIdConnect(req, scheme);
      default:
        return {
          valid: false,
          error: `Unsupported security scheme type: ${scheme.type}`,
          statusCode: 500
        };
    }
  }

  /**
   * Validate API key authentication
   * @param req - Request object
   * @param scheme - API key security scheme
   * @returns Validation result
   */
  private validateApiKey(
    req: AuthRequest,
    scheme: ResolvedSecurityScheme
  ): AuthValidationResult {
    if (!scheme.name || !scheme.in) {
      return {
        valid: false,
        error: 'Invalid API key scheme configuration',
        statusCode: 500
      };
    }

    let apiKey: string | undefined;

    switch (scheme.in) {
      case 'header':
        apiKey = this.getHeaderValue(req, scheme.name);
        break;
      case 'query':
        apiKey = this.getQueryValue(req, scheme.name);
        break;
      case 'cookie':
        apiKey = req.cookies?.[scheme.name];
        break;
      default:
        return {
          valid: false,
          error: `Invalid API key location: ${scheme.in}`,
          statusCode: 500
        };
    }

    if (!apiKey || apiKey.trim() === '') {
      return {
        valid: false,
        error: `Missing API key in ${scheme.in}: ${scheme.name}`,
        statusCode: 401
      };
    }

    // For mock server, accept any non-empty API key
    return {
      valid: true,
      scheme: scheme
    };
  }

  /**
   * Validate HTTP authentication (Basic, Bearer, etc.)
   * @param req - Request object
   * @param scheme - HTTP security scheme
   * @returns Validation result
   */
  private validateHttp(
    req: AuthRequest,
    scheme: ResolvedSecurityScheme
  ): AuthValidationResult {
    if (!scheme.scheme) {
      return {
        valid: false,
        error: 'Invalid HTTP scheme configuration',
        statusCode: 500
      };
    }

    const authHeader = this.getHeaderValue(req, 'authorization');
    
    if (!authHeader) {
      return {
        valid: false,
        error: 'Missing Authorization header',
        statusCode: 401
      };
    }

    const schemeLower = scheme.scheme.toLowerCase();
    const authLower = authHeader.toLowerCase();

    switch (schemeLower) {
      case 'basic':
        return this.validateBasicAuth(authHeader);
      case 'bearer':
        return this.validateBearerAuth(authHeader, scheme);
      case 'digest':
        return this.validateDigestAuth(authHeader);
      default:
        // Custom HTTP scheme - check if header starts with scheme name
        if (!authLower.startsWith(schemeLower + ' ')) {
          return {
            valid: false,
            error: `Invalid authentication scheme. Expected: ${scheme.scheme}`,
            statusCode: 401
          };
        }
        
        const credentials = authHeader.substring(scheme.scheme.length + 1).trim();
        if (!credentials) {
          return {
            valid: false,
            error: 'Missing credentials',
            statusCode: 401
          };
        }

        return {
          valid: true,
          scheme: scheme
        };
    }
  }

  /**
   * Validate Basic authentication
   * @param authHeader - Authorization header value
   * @returns Validation result
   */
  private validateBasicAuth(authHeader: string): AuthValidationResult {
    if (!authHeader.toLowerCase().startsWith('basic ')) {
      return {
        valid: false,
        error: 'Invalid Basic authentication format',
        statusCode: 401
      };
    }

    const credentials = authHeader.substring(6).trim();
    if (!credentials) {
      return {
        valid: false,
        error: 'Missing Basic authentication credentials',
        statusCode: 401
      };
    }

    // Validate base64 format first
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(credentials)) {
      return {
        valid: false,
        error: 'Invalid Basic authentication encoding',
        statusCode: 401
      };
    }

    try {
      const decoded = Buffer.from(credentials, 'base64').toString('utf-8');
      const colonIndex = decoded.indexOf(':');
      
      if (colonIndex === -1) {
        return {
          valid: false,
          error: 'Invalid Basic authentication format',
          statusCode: 401
        };
      }

      const username = decoded.substring(0, colonIndex);
      const password = decoded.substring(colonIndex + 1);

      // For mock server, accept any non-empty username/password
      if (!username || !password) {
        return {
          valid: false,
          error: 'Username and password required',
          statusCode: 401
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'Invalid Basic authentication encoding',
        statusCode: 401
      };
    }
  }

  /**
   * Validate Bearer token authentication
   * @param authHeader - Authorization header value
   * @param scheme - Bearer security scheme
   * @returns Validation result
   */
  private validateBearerAuth(
    authHeader: string,
    scheme: ResolvedSecurityScheme
  ): AuthValidationResult {
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return {
        valid: false,
        error: 'Invalid Bearer token format',
        statusCode: 401
      };
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return {
        valid: false,
        error: 'Missing Bearer token',
        statusCode: 401
      };
    }

    // For mock server, accept any non-empty token
    // In real implementation, you would validate the token format based on bearerFormat
    if (scheme.bearerFormat === 'JWT') {
      // Basic JWT format validation (3 parts separated by dots)
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {
          valid: false,
          error: 'Invalid JWT token format',
          statusCode: 401
        };
      }
    }

    return {
      valid: true,
      scheme: scheme
    };
  }

  /**
   * Validate Digest authentication
   * @param authHeader - Authorization header value
   * @returns Validation result
   */
  private validateDigestAuth(authHeader: string): AuthValidationResult {
    if (!authHeader.toLowerCase().startsWith('digest ')) {
      return {
        valid: false,
        error: 'Invalid Digest authentication format',
        statusCode: 401
      };
    }

    const credentials = authHeader.substring(7).trim();
    if (!credentials) {
      return {
        valid: false,
        error: 'Missing Digest authentication credentials',
        statusCode: 401
      };
    }

    // For mock server, accept any properly formatted digest credentials
    // Basic validation: should contain username, realm, nonce, uri, response
    const requiredFields = ['username', 'realm', 'nonce', 'uri', 'response'];
    const hasAllFields = requiredFields.every(field => 
      credentials.includes(`${field}=`)
    );

    if (!hasAllFields) {
      return {
        valid: false,
        error: 'Invalid Digest authentication format',
        statusCode: 401
      };
    }

    return { valid: true };
  }

  /**
   * Validate OAuth2 authentication
   * @param req - Request object
   * @param scheme - OAuth2 security scheme
   * @returns Validation result
   */
  private validateOAuth2(
    req: AuthRequest,
    scheme: ResolvedSecurityScheme
  ): AuthValidationResult {
    // OAuth2 typically uses Bearer tokens in Authorization header
    const authHeader = this.getHeaderValue(req, 'authorization');
    
    if (!authHeader) {
      return {
        valid: false,
        error: 'Missing Authorization header for OAuth2',
        statusCode: 401
      };
    }

    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return {
        valid: false,
        error: 'OAuth2 requires Bearer token',
        statusCode: 401
      };
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return {
        valid: false,
        error: 'Missing OAuth2 access token',
        statusCode: 401
      };
    }

    // For mock server, accept any non-empty token
    // In real implementation, you would validate token and scopes
    return {
      valid: true,
      scheme: scheme
    };
  }

  /**
   * Validate OpenID Connect authentication
   * @param req - Request object
   * @param scheme - OpenID Connect security scheme
   * @returns Validation result
   */
  private validateOpenIdConnect(
    req: AuthRequest,
    scheme: ResolvedSecurityScheme
  ): AuthValidationResult {
    // OpenID Connect typically uses JWT tokens in Authorization header
    const authHeader = this.getHeaderValue(req, 'authorization');
    
    if (!authHeader) {
      return {
        valid: false,
        error: 'Missing Authorization header for OpenID Connect',
        statusCode: 401
      };
    }

    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return {
        valid: false,
        error: 'OpenID Connect requires Bearer token',
        statusCode: 401
      };
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return {
        valid: false,
        error: 'Missing OpenID Connect ID token',
        statusCode: 401
      };
    }

    // Basic JWT format validation for ID token
    const parts = token.split('.');
    if (parts.length !== 3) {
      return {
        valid: false,
        error: 'Invalid OpenID Connect ID token format',
        statusCode: 401
      };
    }

    return {
      valid: true,
      scheme: scheme
    };
  }

  /**
   * Generate appropriate authentication error response
   * @param scheme - Security scheme that failed
   * @returns Error response with status code and body
   */
  generateAuthError(scheme: ResolvedSecurityScheme): { statusCode: number; body: any } {
    const statusCode = 401;
    let body: any;
    let wwwAuthenticate: string | undefined;

    switch (scheme.type) {
      case 'apiKey':
        body = {
          error: 'Unauthorized',
          message: `Missing or invalid API key in ${scheme.in}: ${scheme.name}`,
          code: 'INVALID_API_KEY'
        };
        break;

      case 'http':
        switch (scheme.scheme?.toLowerCase()) {
          case 'basic':
            wwwAuthenticate = 'Basic realm="Mock API Server"';
            body = {
              error: 'Unauthorized',
              message: 'Invalid or missing Basic authentication credentials',
              code: 'INVALID_BASIC_AUTH'
            };
            break;

          case 'bearer':
            wwwAuthenticate = `Bearer realm="Mock API Server"${scheme.bearerFormat ? `, bearer_format="${scheme.bearerFormat}"` : ''}`;
            body = {
              error: 'Unauthorized',
              message: 'Invalid or missing Bearer token',
              code: 'INVALID_BEARER_TOKEN'
            };
            break;

          case 'digest':
            wwwAuthenticate = 'Digest realm="Mock API Server", nonce="mock-nonce", algorithm=MD5, qop="auth"';
            body = {
              error: 'Unauthorized',
              message: 'Invalid or missing Digest authentication credentials',
              code: 'INVALID_DIGEST_AUTH'
            };
            break;

          default:
            body = {
              error: 'Unauthorized',
              message: `Invalid or missing ${scheme.scheme} authentication`,
              code: 'INVALID_HTTP_AUTH'
            };
        }
        break;

      case 'oauth2':
        wwwAuthenticate = 'Bearer realm="Mock API Server", error="invalid_token"';
        body = {
          error: 'invalid_token',
          error_description: 'The access token provided is expired, revoked, malformed, or invalid',
          code: 'INVALID_OAUTH2_TOKEN'
        };
        break;

      case 'openIdConnect':
        wwwAuthenticate = 'Bearer realm="Mock API Server", error="invalid_token"';
        body = {
          error: 'invalid_token',
          error_description: 'The ID token provided is expired, revoked, malformed, or invalid',
          code: 'INVALID_OIDC_TOKEN'
        };
        break;

      default:
        body = {
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        };
    }

    const response: { statusCode: number; body: any; headers?: Record<string, string> } = {
      statusCode,
      body
    };

    if (wwwAuthenticate) {
      response.headers = {
        'WWW-Authenticate': wwwAuthenticate
      };
    }

    return response;
  }

  /**
   * Generate 403 Forbidden response for insufficient permissions
   * @param scheme - Security scheme
   * @param requiredScopes - Required scopes that were missing
   * @returns Error response
   */
  generateForbiddenError(
    _scheme: ResolvedSecurityScheme,
    requiredScopes?: string[]
  ): { statusCode: number; body: any } {
    return {
      statusCode: 403,
      body: {
        error: 'Forbidden',
        message: 'Insufficient permissions to access this resource',
        code: 'INSUFFICIENT_PERMISSIONS',
        required_scopes: requiredScopes
      }
    };
  }

  /**
   * Get header value (case-insensitive)
   * @param req - Request object
   * @param headerName - Header name
   * @returns Header value or undefined
   */
  private getHeaderValue(req: AuthRequest, headerName: string): string | undefined {
    const lowerName = headerName.toLowerCase();
    
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() === lowerName) {
        return Array.isArray(value) ? value[0] : (value || undefined);
      }
    }
    
    return undefined;
  }

  /**
   * Get query parameter value
   * @param req - Request object
   * @param paramName - Parameter name
   * @returns Parameter value or undefined
   */
  private getQueryValue(req: AuthRequest, paramName: string): string | undefined {
    const value = req.query[paramName];
    return Array.isArray(value) ? value[0] : value;
  }
}

/**
 * Default authentication handler instance
 */
export const authHandler = new MockAuthenticationHandler();