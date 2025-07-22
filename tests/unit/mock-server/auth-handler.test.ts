/**
 * Unit tests for MockAuthenticationHandler
 * Tests all OpenAPI security schemes and authentication scenarios
 */

import { MockAuthenticationHandler } from '../../../src/mock-server/auth-handler.js';
import { OpenAPISecurityScheme, OpenAPISecurityRequirement } from '../../../src/types/openapi.js';

describe('MockAuthenticationHandler', () => {
  let authHandler: MockAuthenticationHandler;

  beforeEach(() => {
    authHandler = new MockAuthenticationHandler();
  });

  describe('validateAuth', () => {
    it('should allow access when no security requirements are specified', () => {
      const req = { headers: {}, query: {} };
      const result = authHandler.validateAuth(req, [], {});
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow access when security requirements array is empty', () => {
      const req = { headers: {}, query: {} };
      const result = authHandler.validateAuth(req, [], {});
      
      expect(result.valid).toBe(true);
    });

    it('should return 401 when no security requirement is satisfied', () => {
      const req = { headers: {}, query: {} };
      const securityRequirements = [{ 'api_key': [] }];
      const securitySchemes = {
        'api_key': { type: 'apiKey', name: 'X-API-Key', in: 'header' }
      };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Missing API key in header: X-API-Key');
    });

    it('should succeed when any security requirement is satisfied (OR logic)', () => {
      const req = { 
        headers: { 'x-api-key': 'valid-key' }, 
        query: {} 
      };
      const securityRequirements = [
        { 'basic_auth': [] },
        { 'api_key': [] }
      ];
      const securitySchemes = {
        'basic_auth': { type: 'http', scheme: 'basic' },
        'api_key': { type: 'apiKey', name: 'X-API-Key', in: 'header' }
      };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(true);
    });

    it('should require all schemes in a requirement to be satisfied (AND logic)', () => {
      const req = { 
        headers: { 'x-api-key': 'valid-key' }, 
        query: {} 
      };
      const securityRequirements = [
        { 'api_key': [], 'basic_auth': [] }
      ];
      const securitySchemes = {
        'basic_auth': { type: 'http', scheme: 'basic' },
        'api_key': { type: 'apiKey', name: 'X-API-Key', in: 'header' }
      };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
    });

    it('should handle unknown security scheme', () => {
      const req = { headers: {}, query: {} };
      const securityRequirements = [{ 'unknown_scheme': [] }];
      const securitySchemes = {};
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('Unknown security scheme: unknown_scheme');
    });

    it('should allow access for empty security requirement object', () => {
      const req = { headers: {}, query: {} };
      const securityRequirements = [{}];
      const securitySchemes = {};
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('API Key Authentication', () => {
    const apiKeyScheme: OpenAPISecurityScheme = {
      type: 'apiKey',
      name: 'X-API-Key',
      in: 'header'
    };

    it('should validate API key in header', () => {
      const req = { 
        headers: { 'x-api-key': 'valid-key' }, 
        query: {} 
      };
      const securityRequirements = [{ 'api_key': [] }];
      const securitySchemes = { 'api_key': apiKeyScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(true);
    });

    it('should validate API key in query parameter', () => {
      const queryScheme = { ...apiKeyScheme, in: 'query' as const, name: 'api_key' };
      const req = { 
        headers: {}, 
        query: { 'api_key': 'valid-key' } 
      };
      const securityRequirements = [{ 'api_key': [] }];
      const securitySchemes = { 'api_key': queryScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(true);
    });

    it('should validate API key in cookie', () => {
      const cookieScheme = { ...apiKeyScheme, in: 'cookie' as const, name: 'api_key' };
      const req = { 
        headers: {}, 
        query: {},
        cookies: { 'api_key': 'valid-key' }
      };
      const securityRequirements = [{ 'api_key': [] }];
      const securitySchemes = { 'api_key': cookieScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(true);
    });

    it('should reject missing API key', () => {
      const req = { headers: {}, query: {} };
      const securityRequirements = [{ 'api_key': [] }];
      const securitySchemes = { 'api_key': apiKeyScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Missing API key in header: X-API-Key');
    });

    it('should reject empty API key', () => {
      const req = { 
        headers: { 'x-api-key': '   ' }, 
        query: {} 
      };
      const securityRequirements = [{ 'api_key': [] }];
      const securitySchemes = { 'api_key': apiKeyScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
    });

    it('should handle invalid API key configuration', () => {
      const invalidScheme = { type: 'apiKey' as const };
      const req = { headers: {}, query: {} };
      const securityRequirements = [{ 'api_key': [] }];
      const securitySchemes = { 'api_key': invalidScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('Invalid API key scheme configuration');
    });

    it('should handle invalid API key location', () => {
      const invalidScheme = { 
        type: 'apiKey' as const, 
        name: 'api_key', 
        in: 'invalid' as any 
      };
      const req = { headers: {}, query: {} };
      const securityRequirements = [{ 'api_key': [] }];
      const securitySchemes = { 'api_key': invalidScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('Invalid API key location: invalid');
    });
  });

  describe('HTTP Basic Authentication', () => {
    const basicScheme: OpenAPISecurityScheme = {
      type: 'http',
      scheme: 'basic'
    };

    it('should validate valid Basic authentication', () => {
      const credentials = Buffer.from('username:password').toString('base64');
      const req = { 
        headers: { 'authorization': `Basic ${credentials}` }, 
        query: {} 
      };
      const securityRequirements = [{ 'basic_auth': [] }];
      const securitySchemes = { 'basic_auth': basicScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(true);
    });

    it('should reject missing Authorization header', () => {
      const req = { headers: {}, query: {} };
      const securityRequirements = [{ 'basic_auth': [] }];
      const securitySchemes = { 'basic_auth': basicScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Missing Authorization header');
    });

    it('should reject invalid Basic authentication format', () => {
      const req = { 
        headers: { 'authorization': 'Bearer token' }, 
        query: {} 
      };
      const securityRequirements = [{ 'basic_auth': [] }];
      const securitySchemes = { 'basic_auth': basicScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Invalid Basic authentication format');
    });

    it('should reject missing credentials', () => {
      const req = { 
        headers: { 'authorization': 'Basic ' }, 
        query: {} 
      };
      const securityRequirements = [{ 'basic_auth': [] }];
      const securitySchemes = { 'basic_auth': basicScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Missing Basic authentication credentials');
    });

    it('should reject invalid base64 encoding', () => {
      const req = { 
        headers: { 'authorization': 'Basic !!invalid-base64!!' }, 
        query: {} 
      };
      const securityRequirements = [{ 'basic_auth': [] }];
      const securitySchemes = { 'basic_auth': basicScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Invalid Basic authentication encoding');
    });

    it('should reject credentials without colon separator', () => {
      const credentials = Buffer.from('usernamepassword').toString('base64');
      const req = { 
        headers: { 'authorization': `Basic ${credentials}` }, 
        query: {} 
      };
      const securityRequirements = [{ 'basic_auth': [] }];
      const securitySchemes = { 'basic_auth': basicScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Invalid Basic authentication format');
    });

    it('should reject empty username or password', () => {
      const credentials = Buffer.from(':password').toString('base64');
      const req = { 
        headers: { 'authorization': `Basic ${credentials}` }, 
        query: {} 
      };
      const securityRequirements = [{ 'basic_auth': [] }];
      const securitySchemes = { 'basic_auth': basicScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Username and password required');
    });
  });

  describe('HTTP Bearer Authentication', () => {
    const bearerScheme: OpenAPISecurityScheme = {
      type: 'http',
      scheme: 'bearer'
    };

    it('should validate valid Bearer token', () => {
      const req = { 
        headers: { 'authorization': 'Bearer valid-token' }, 
        query: {} 
      };
      const securityRequirements = [{ 'bearer_auth': [] }];
      const securitySchemes = { 'bearer_auth': bearerScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(true);
    });

    it('should validate JWT Bearer token', () => {
      const jwtScheme = { ...bearerScheme, bearerFormat: 'JWT' };
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const req = { 
        headers: { 'authorization': `Bearer ${jwtToken}` }, 
        query: {} 
      };
      const securityRequirements = [{ 'bearer_auth': [] }];
      const securitySchemes = { 'bearer_auth': jwtScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(true);
    });

    it('should reject invalid JWT format', () => {
      const jwtScheme = { ...bearerScheme, bearerFormat: 'JWT' };
      const req = { 
        headers: { 'authorization': 'Bearer invalid.jwt' }, 
        query: {} 
      };
      const securityRequirements = [{ 'bearer_auth': [] }];
      const securitySchemes = { 'bearer_auth': jwtScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Invalid JWT token format');
    });

    it('should reject invalid Bearer format', () => {
      const req = { 
        headers: { 'authorization': 'Basic credentials' }, 
        query: {} 
      };
      const securityRequirements = [{ 'bearer_auth': [] }];
      const securitySchemes = { 'bearer_auth': bearerScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Invalid Bearer token format');
    });

    it('should reject missing Bearer token', () => {
      const req = { 
        headers: { 'authorization': 'Bearer ' }, 
        query: {} 
      };
      const securityRequirements = [{ 'bearer_auth': [] }];
      const securitySchemes = { 'bearer_auth': bearerScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Missing Bearer token');
    });
  });

  describe('HTTP Digest Authentication', () => {
    const digestScheme: OpenAPISecurityScheme = {
      type: 'http',
      scheme: 'digest'
    };

    it('should validate valid Digest authentication', () => {
      const digestCredentials = 'username="user", realm="test", nonce="abc123", uri="/api", response="def456"';
      const req = { 
        headers: { 'authorization': `Digest ${digestCredentials}` }, 
        query: {} 
      };
      const securityRequirements = [{ 'digest_auth': [] }];
      const securitySchemes = { 'digest_auth': digestScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(true);
    });

    it('should reject invalid Digest format', () => {
      const req = { 
        headers: { 'authorization': 'Bearer token' }, 
        query: {} 
      };
      const securityRequirements = [{ 'digest_auth': [] }];
      const securitySchemes = { 'digest_auth': digestScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Invalid Digest authentication format');
    });

    it('should reject missing Digest credentials', () => {
      const req = { 
        headers: { 'authorization': 'Digest ' }, 
        query: {} 
      };
      const securityRequirements = [{ 'digest_auth': [] }];
      const securitySchemes = { 'digest_auth': digestScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Missing Digest authentication credentials');
    });

    it('should reject incomplete Digest credentials', () => {
      const incompleteCredentials = 'username="user", realm="test"';
      const req = { 
        headers: { 'authorization': `Digest ${incompleteCredentials}` }, 
        query: {} 
      };
      const securityRequirements = [{ 'digest_auth': [] }];
      const securitySchemes = { 'digest_auth': digestScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Invalid Digest authentication format');
    });
  });

  describe('Custom HTTP Authentication', () => {
    const customScheme: OpenAPISecurityScheme = {
      type: 'http',
      scheme: 'custom'
    };

    it('should validate custom HTTP scheme', () => {
      const req = { 
        headers: { 'authorization': 'Custom credentials' }, 
        query: {} 
      };
      const securityRequirements = [{ 'custom_auth': [] }];
      const securitySchemes = { 'custom_auth': customScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(true);
    });

    it('should reject wrong custom scheme', () => {
      const req = { 
        headers: { 'authorization': 'Bearer token' }, 
        query: {} 
      };
      const securityRequirements = [{ 'custom_auth': [] }];
      const securitySchemes = { 'custom_auth': customScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Invalid authentication scheme. Expected: custom');
    });

    it('should reject missing credentials for custom scheme', () => {
      const req = { 
        headers: { 'authorization': 'Custom ' }, 
        query: {} 
      };
      const securityRequirements = [{ 'custom_auth': [] }];
      const securitySchemes = { 'custom_auth': customScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Missing credentials');
    });

    it('should handle missing HTTP scheme configuration', () => {
      const invalidScheme = { type: 'http' as const };
      const req = { headers: {}, query: {} };
      const securityRequirements = [{ 'http_auth': [] }];
      const securitySchemes = { 'http_auth': invalidScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('Invalid HTTP scheme configuration');
    });
  });

  describe('OAuth2 Authentication', () => {
    const oauth2Scheme: OpenAPISecurityScheme = {
      type: 'oauth2',
      flows: {
        authorizationCode: {
          authorizationUrl: 'https://example.com/oauth/authorize',
          tokenUrl: 'https://example.com/oauth/token',
          scopes: {
            'read': 'Read access',
            'write': 'Write access'
          }
        }
      }
    };

    it('should validate valid OAuth2 Bearer token', () => {
      const req = { 
        headers: { 'authorization': 'Bearer oauth2-access-token' }, 
        query: {} 
      };
      const securityRequirements = [{ 'oauth2_auth': [] }];
      const securitySchemes = { 'oauth2_auth': oauth2Scheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(true);
    });

    it('should reject missing Authorization header for OAuth2', () => {
      const req = { headers: {}, query: {} };
      const securityRequirements = [{ 'oauth2_auth': [] }];
      const securitySchemes = { 'oauth2_auth': oauth2Scheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Missing Authorization header for OAuth2');
    });

    it('should reject non-Bearer token for OAuth2', () => {
      const req = { 
        headers: { 'authorization': 'Basic credentials' }, 
        query: {} 
      };
      const securityRequirements = [{ 'oauth2_auth': [] }];
      const securitySchemes = { 'oauth2_auth': oauth2Scheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('OAuth2 requires Bearer token');
    });

    it('should reject missing OAuth2 access token', () => {
      const req = { 
        headers: { 'authorization': 'Bearer ' }, 
        query: {} 
      };
      const securityRequirements = [{ 'oauth2_auth': [] }];
      const securitySchemes = { 'oauth2_auth': oauth2Scheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Missing OAuth2 access token');
    });
  });

  describe('OpenID Connect Authentication', () => {
    const oidcScheme: OpenAPISecurityScheme = {
      type: 'openIdConnect',
      openIdConnectUrl: 'https://example.com/.well-known/openid_configuration'
    };

    it('should validate valid OpenID Connect JWT token', () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const req = { 
        headers: { 'authorization': `Bearer ${jwtToken}` }, 
        query: {} 
      };
      const securityRequirements = [{ 'oidc_auth': [] }];
      const securitySchemes = { 'oidc_auth': oidcScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(true);
    });

    it('should reject missing Authorization header for OpenID Connect', () => {
      const req = { headers: {}, query: {} };
      const securityRequirements = [{ 'oidc_auth': [] }];
      const securitySchemes = { 'oidc_auth': oidcScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Missing Authorization header for OpenID Connect');
    });

    it('should reject non-Bearer token for OpenID Connect', () => {
      const req = { 
        headers: { 'authorization': 'Basic credentials' }, 
        query: {} 
      };
      const securityRequirements = [{ 'oidc_auth': [] }];
      const securitySchemes = { 'oidc_auth': oidcScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('OpenID Connect requires Bearer token');
    });

    it('should reject missing OpenID Connect ID token', () => {
      const req = { 
        headers: { 'authorization': 'Bearer ' }, 
        query: {} 
      };
      const securityRequirements = [{ 'oidc_auth': [] }];
      const securitySchemes = { 'oidc_auth': oidcScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Missing OpenID Connect ID token');
    });

    it('should reject invalid JWT format for OpenID Connect', () => {
      const req = { 
        headers: { 'authorization': 'Bearer invalid.jwt' }, 
        query: {} 
      };
      const securityRequirements = [{ 'oidc_auth': [] }];
      const securitySchemes = { 'oidc_auth': oidcScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Invalid OpenID Connect ID token format');
    });
  });

  describe('Unsupported Security Schemes', () => {
    it('should reject unsupported security scheme type', () => {
      const unsupportedScheme = { type: 'unsupported' as any };
      const req = { headers: {}, query: {} };
      const securityRequirements = [{ 'unsupported_auth': [] }];
      const securitySchemes = { 'unsupported_auth': unsupportedScheme };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('Unsupported security scheme type: unsupported');
    });
  });

  describe('generateAuthError', () => {
    it('should generate API key error response', () => {
      const scheme = {
        type: 'apiKey' as const,
        name: 'X-API-Key',
        in: 'header' as const
      };
      
      const error = authHandler.generateAuthError(scheme);
      
      expect(error.statusCode).toBe(401);
      expect(error.body.error).toBe('Unauthorized');
      expect(error.body.message).toBe('Missing or invalid API key in header: X-API-Key');
      expect(error.body.code).toBe('INVALID_API_KEY');
    });

    it('should generate Basic auth error response with WWW-Authenticate header', () => {
      const scheme = {
        type: 'http' as const,
        scheme: 'basic'
      };
      
      const error = authHandler.generateAuthError(scheme);
      
      expect(error.statusCode).toBe(401);
      expect(error.body.error).toBe('Unauthorized');
      expect(error.body.code).toBe('INVALID_BASIC_AUTH');
      expect(error.headers?.['WWW-Authenticate']).toBe('Basic realm="Mock API Server"');
    });

    it('should generate Bearer auth error response with WWW-Authenticate header', () => {
      const scheme = {
        type: 'http' as const,
        scheme: 'bearer',
        bearerFormat: 'JWT'
      };
      
      const error = authHandler.generateAuthError(scheme);
      
      expect(error.statusCode).toBe(401);
      expect(error.body.code).toBe('INVALID_BEARER_TOKEN');
      expect(error.headers?.['WWW-Authenticate']).toBe('Bearer realm="Mock API Server", bearer_format="JWT"');
    });

    it('should generate Digest auth error response with WWW-Authenticate header', () => {
      const scheme = {
        type: 'http' as const,
        scheme: 'digest'
      };
      
      const error = authHandler.generateAuthError(scheme);
      
      expect(error.statusCode).toBe(401);
      expect(error.body.code).toBe('INVALID_DIGEST_AUTH');
      expect(error.headers?.['WWW-Authenticate']).toContain('Digest realm="Mock API Server"');
    });

    it('should generate OAuth2 error response', () => {
      const scheme = {
        type: 'oauth2' as const,
        flows: {}
      };
      
      const error = authHandler.generateAuthError(scheme);
      
      expect(error.statusCode).toBe(401);
      expect(error.body.error).toBe('invalid_token');
      expect(error.body.code).toBe('INVALID_OAUTH2_TOKEN');
      expect(error.headers?.['WWW-Authenticate']).toContain('Bearer realm="Mock API Server"');
    });

    it('should generate OpenID Connect error response', () => {
      const scheme = {
        type: 'openIdConnect' as const,
        openIdConnectUrl: 'https://example.com/.well-known/openid_configuration'
      };
      
      const error = authHandler.generateAuthError(scheme);
      
      expect(error.statusCode).toBe(401);
      expect(error.body.error).toBe('invalid_token');
      expect(error.body.code).toBe('INVALID_OIDC_TOKEN');
    });

    it('should generate custom HTTP scheme error response', () => {
      const scheme = {
        type: 'http' as const,
        scheme: 'custom'
      };
      
      const error = authHandler.generateAuthError(scheme);
      
      expect(error.statusCode).toBe(401);
      expect(error.body.code).toBe('INVALID_HTTP_AUTH');
    });

    it('should generate default error response for unknown scheme', () => {
      const scheme = {
        type: 'unknown' as any
      };
      
      const error = authHandler.generateAuthError(scheme);
      
      expect(error.statusCode).toBe(401);
      expect(error.body.error).toBe('Unauthorized');
      expect(error.body.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('generateForbiddenError', () => {
    it('should generate 403 Forbidden response', () => {
      const scheme = {
        type: 'oauth2' as const,
        flows: {}
      };
      const requiredScopes = ['read', 'write'];
      
      const error = authHandler.generateForbiddenError(scheme, requiredScopes);
      
      expect(error.statusCode).toBe(403);
      expect(error.body.error).toBe('Forbidden');
      expect(error.body.message).toBe('Insufficient permissions to access this resource');
      expect(error.body.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(error.body.required_scopes).toEqual(requiredScopes);
    });

    it('should generate 403 response without scopes', () => {
      const scheme = {
        type: 'http' as const,
        scheme: 'bearer'
      };
      
      const error = authHandler.generateForbiddenError(scheme);
      
      expect(error.statusCode).toBe(403);
      expect(error.body.error).toBe('Forbidden');
      expect(error.body.required_scopes).toBeUndefined();
    });
  });

  describe('Header and Query Parameter Handling', () => {
    it('should handle case-insensitive header names', () => {
      const req = { 
        headers: { 'X-API-KEY': 'valid-key' }, 
        query: {} 
      };
      const securityRequirements = [{ 'api_key': [] }];
      const securitySchemes = { 
        'api_key': { type: 'apiKey' as const, name: 'x-api-key', in: 'header' as const }
      };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(true);
    });

    it('should handle array values in headers', () => {
      const req = { 
        headers: { 'x-api-key': ['first-key', 'second-key'] }, 
        query: {} 
      };
      const securityRequirements = [{ 'api_key': [] }];
      const securitySchemes = { 
        'api_key': { type: 'apiKey' as const, name: 'X-API-Key', in: 'header' as const }
      };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(true);
    });

    it('should handle array values in query parameters', () => {
      const req = { 
        headers: {}, 
        query: { 'api_key': ['first-key', 'second-key'] } 
      };
      const securityRequirements = [{ 'api_key': [] }];
      const securitySchemes = { 
        'api_key': { type: 'apiKey' as const, name: 'api_key', in: 'query' as const }
      };
      
      const result = authHandler.validateAuth(req, securityRequirements, securitySchemes);
      
      expect(result.valid).toBe(true);
    });
  });
});