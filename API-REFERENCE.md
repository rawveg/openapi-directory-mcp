# API Reference

Complete reference documentation for all tools provided by the OpenAPI Directory MCP Server.

## 📋 Table of Contents

- [Tool Overview](#tool-overview)
- [list_providers](#list_providers)
- [get_provider_apis](#get_provider_apis)
- [get_provider_services](#get_provider_services)
- [get_api_spec](#get_api_spec)
- [list_all_apis](#list_all_apis)
- [get_metrics](#get_metrics)
- [Data Types](#data-types)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## 🛠️ Tool Overview

The OpenAPI Directory MCP Server provides 6 main tools that correspond to the APIs.guru REST API endpoints:

| Tool | Purpose | Parameters | Returns |
|------|---------|------------|---------|
| `list_providers` | List all API providers | None | Array of provider names |
| `get_provider_apis` | Get all APIs for a provider | provider | Provider API details |
| `get_provider_services` | Get services for a provider | provider | Array of service names |
| `get_api_spec` | Get specific API specification | provider, api, service? | API specification |
| `list_all_apis` | List all APIs with metadata | None | Complete API directory |
| `get_metrics` | Get directory statistics | None | Metrics object |

---

## 🏢 list_providers

Returns a list of all API providers in the directory.

### Parameters

None

### Returns

```typescript
{
  data: string[]
}
```

### Example Usage

**Human:** "List all API providers"

**Response:**
```json
{
  "data": [
    "1forge.com",
    "adyen.com",
    "amazonaws.com",
    "apple.com",
    "github.com",
    "googleapis.com",
    "microsoft.com",
    "stripe.com",
    "twilio.com"
  ]
}
```

### Implementation Details

- **Endpoint**: `GET /providers.json`
- **Cache**: Results cached for 1 hour
- **Expected Response Time**: < 1 second
- **Typical Result Count**: 650+ providers

---

## 🔍 get_provider_apis

Retrieves all APIs available from a specific provider.

### Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `provider` | string | ✅ | Provider domain name | "googleapis.com" |

### Returns

```typescript
{
  [apiId: string]: {
    added: string;           // ISO date string
    preferred: string;       // Preferred version
    versions: {
      [version: string]: ApiVersion
    }
  }
}
```

### Example Usage

**Human:** "Get all APIs from Stripe"

**Tool Call:**
```json
{
  "provider": "stripe.com"
}
```

**Response:**
```json
{
  "stripe.com": {
    "added": "2020-01-15T10:30:00.000Z",
    "preferred": "2020-08-27",
    "versions": {
      "2020-08-27": {
        "added": "2020-08-27T12:00:00.000Z",
        "updated": "2024-01-15T14:20:00.000Z",
        "swaggerUrl": "https://api.apis.guru/v2/specs/stripe.com/2020-08-27/swagger.json",
        "swaggerYamlUrl": "https://api.apis.guru/v2/specs/stripe.com/2020-08-27/swagger.yaml",
        "info": {
          "title": "Stripe API",
          "version": "2020-08-27",
          "description": "The Stripe REST API"
        },
        "openapiVer": "3.0.0"
      }
    }
  }
}
```

### Implementation Details

- **Endpoint**: `GET /{provider}.json`
- **Cache**: Results cached for 30 minutes
- **Expected Response Time**: < 2 seconds
- **Error Handling**: Returns 404 if provider not found

### Common Providers

- `googleapis.com` - Google APIs (200+ APIs)
- `amazonaws.com` - AWS APIs (50+ APIs)
- `microsoft.com` - Microsoft APIs (100+ APIs)
- `stripe.com` - Stripe Payment APIs
- `twilio.com` - Twilio Communication APIs

---

## 🏗️ get_provider_services

Lists all service names for a specific provider.

### Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `provider` | string | ✅ | Provider domain name | "googleapis.com" |

### Returns

```typescript
{
  data: string[]
}
```

### Example Usage

**Human:** "What services does Google provide?"

**Tool Call:**
```json
{
  "provider": "googleapis.com"
}
```

**Response:**
```json
{
  "data": [
    "admin",
    "analytics",
    "calendar",
    "drive",
    "gmail",
    "maps",
    "translate",
    "youtube"
  ]
}
```

### Implementation Details

- **Endpoint**: `GET /{provider}/services.json`
- **Cache**: Results cached for 1 hour
- **Expected Response Time**: < 1 second
- **Note**: Only providers with services return data

### Service Examples

**Google Services:**
- `admin` - Admin SDK
- `drive` - Google Drive API
- `calendar` - Google Calendar API
- `gmail` - Gmail API

**Microsoft Services:**
- `graph` - Microsoft Graph API
- `azure` - Azure Management APIs
- `office365` - Office 365 APIs

---

## 📄 get_api_spec

Retrieves the complete OpenAPI specification for a specific API version.

### Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `provider` | string | ✅ | Provider domain name | "stripe.com" |
| `api` | string | ✅ | API version identifier | "2020-08-27" |
| `service` | string | ❌ | Service name (if applicable) | "drive" |

### Returns

```typescript
{
  added: string;           // ISO date string
  updated: string;         // ISO date string
  swaggerUrl: string;      // JSON format URL
  swaggerYamlUrl: string;  // YAML format URL
  info: {
    title: string;
    version: string;
    description: string;
    contact?: ContactInfo;
    license?: LicenseInfo;
  };
  externalDocs?: ExternalDocs;
  openapiVer: string;
}
```

### Example Usage

#### Simple API (without service)

**Human:** "Get the OpenAPI spec for Stripe API version 2020-08-27"

**Tool Call:**
```json
{
  "provider": "stripe.com",
  "api": "2020-08-27"
}
```

#### API with Service

**Human:** "Get the Google Drive API v3 specification"

**Tool Call:**
```json
{
  "provider": "googleapis.com",
  "service": "drive",
  "api": "v3"
}
```

**Response:**
```json
{
  "added": "2015-12-12T00:25:13.000Z",
  "updated": "2024-01-15T14:20:00.000Z",
  "swaggerUrl": "https://api.apis.guru/v2/specs/googleapis.com/drive/v3/swagger.json",
  "swaggerYamlUrl": "https://api.apis.guru/v2/specs/googleapis.com/drive/v3/swagger.yaml",
  "info": {
    "title": "Google Drive API",
    "version": "v3",
    "description": "The Google Drive API allows clients to access resources from Google Drive.",
    "contact": {
      "name": "Google",
      "url": "https://google.com"
    },
    "license": {
      "name": "Creative Commons Attribution 3.0",
      "url": "http://creativecommons.org/licenses/by/3.0/"
    }
  },
  "externalDocs": {
    "url": "https://developers.google.com/drive/"
  },
  "openapiVer": "3.0.0"
}
```

### Implementation Details

- **Endpoint**: `GET /specs/{provider}/{api}.json` or `GET /specs/{provider}/{service}/{api}.json`
- **Cache**: Results cached for 2 hours
- **Expected Response Time**: < 3 seconds
- **Error Handling**: Returns 404 if API not found

### URL Patterns

- **Simple API**: `/specs/stripe.com/2020-08-27.json`
- **Service API**: `/specs/googleapis.com/drive/v3.json`

---

## 📚 list_all_apis

Returns the complete directory of all APIs with cached metadata.

### Parameters

None

### Returns

```typescript
{
  [apiId: string]: {
    added: string;           // ISO date string
    preferred: string;       // Preferred version
    versions: {
      [version: string]: ApiVersion
    }
  }
}
```

### Example Usage

**Human:** "List all APIs in the directory"

**Response:**
```json
{
  "1forge.com": {
    "added": "2017-02-27T02:15:50.000Z",
    "preferred": "0.0.1",
    "versions": {
      "0.0.1": {
        "added": "2017-02-27T02:15:50.000Z",
        "updated": "2017-02-27T02:15:50.000Z",
        "swaggerUrl": "https://api.apis.guru/v2/specs/1forge.com/0.0.1/swagger.json",
        "info": {
          "title": "1Forge Finance APIs",
          "version": "0.0.1"
        },
        "openapiVer": "2.0"
      }
    }
  },
  "googleapis.com:drive": {
    "added": "2015-02-22T20:00:45.000Z",
    "preferred": "v3",
    "versions": {
      "v2": { /* ... */ },
      "v3": { /* ... */ }
    }
  }
}
```

### Implementation Details

- **Endpoint**: `GET /list.json`
- **Cache**: Results cached for 15 minutes
- **Expected Response Time**: < 5 seconds
- **Data Size**: ~10MB response
- **Total APIs**: 2500+ APIs

### Usage Patterns

1. **API Discovery**: Search through all APIs
2. **Version Comparison**: Compare available versions
3. **Metadata Analysis**: Analyze API trends
4. **Bulk Operations**: Process multiple APIs

---

## 📊 get_metrics

Returns statistics and metrics about the API directory.

### Parameters

None

### Returns

```typescript
{
  numSpecs: number;        // Total API specifications
  numAPIs: number;         // Unique APIs
  numEndpoints: number;    // Total endpoints
  numProviders: number;    // Total providers
  unreachable: number;     // Unreachable APIs
  invalid: number;         // Invalid APIs
  unofficial: number;      // Unofficial APIs
  fixes: number;           // Total fixes applied
  fixedPct: number;        // Percentage of fixed APIs
  datasets: any[];         // Chart data
  stars: number;           // GitHub stars
  issues: number;          // GitHub issues
  thisWeek: {
    added: number;         // APIs added this week
    updated: number;       // APIs updated this week
  };
  numDrivers: number;      // API retrieval methods
}
```

### Example Usage

**Human:** "Show me the API directory statistics"

**Response:**
```json
{
  "numSpecs": 3329,
  "numAPIs": 2501,
  "numEndpoints": 106448,
  "numProviders": 659,
  "unreachable": 123,
  "invalid": 598,
  "unofficial": 25,
  "fixes": 81119,
  "fixedPct": 22,
  "datasets": [],
  "stars": 2429,
  "issues": 28,
  "thisWeek": {
    "added": 45,
    "updated": 171
  },
  "numDrivers": 10
}
```

### Implementation Details

- **Endpoint**: `GET /metrics.json`
- **Cache**: Results cached for 5 minutes
- **Expected Response Time**: < 1 second
- **Update Frequency**: Real-time

### Metric Definitions

- **numSpecs**: Total API specifications including all versions
- **numAPIs**: Unique APIs (different versions counted as one)
- **numEndpoints**: Sum of all endpoints across all APIs
- **numProviders**: Unique provider domains
- **unreachable**: APIs returning 4XX/5XX status codes
- **invalid**: APIs failing OpenAPI validation
- **unofficial**: Community-contributed APIs
- **fixes**: Total automatic fixes applied
- **fixedPct**: Percentage of APIs with fixes applied

---

## 🏗️ Data Types

### ApiVersion

```typescript
interface ApiVersion {
  added: string;           // ISO date string
  updated: string;         // ISO date string
  swaggerUrl: string;      // JSON format URL
  swaggerYamlUrl: string;  // YAML format URL
  link?: string;           // Direct API link
  info: OpenAPIInfo;       // OpenAPI info object
  externalDocs?: ExternalDocs;
  openapiVer: string;      // OpenAPI version
}
```

### OpenAPIInfo

```typescript
interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
  contact?: ContactInfo;
  license?: LicenseInfo;
  termsOfService?: string;
  [key: string]: any;      // Additional OpenAPI fields
}
```

### ContactInfo

```typescript
interface ContactInfo {
  name?: string;
  email?: string;
  url?: string;
}
```

### LicenseInfo

```typescript
interface LicenseInfo {
  name: string;
  url?: string;
}
```

### ExternalDocs

```typescript
interface ExternalDocs {
  description?: string;
  url: string;
}
```

---

## ⚠️ Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;           // Error type
  message: string;         // Human-readable message
  details?: any;           // Additional error details
  code?: number;           // HTTP status code
}
```

### Common Errors

#### Provider Not Found

```json
{
  "error": "ProviderNotFound",
  "message": "Provider 'invalid.com' not found in directory",
  "code": 404
}
```

#### API Not Found

```json
{
  "error": "APINotFound",
  "message": "API version 'v99' not found for provider 'github.com'",
  "code": 404
}
```

#### Service Not Found

```json
{
  "error": "ServiceNotFound",
  "message": "Service 'invalid' not found for provider 'googleapis.com'",
  "code": 404
}
```

#### Network Error

```json
{
  "error": "NetworkError",
  "message": "Failed to fetch data from APIs.guru",
  "details": {
    "timeout": 30000,
    "retries": 3
  },
  "code": 503
}
```

#### Rate Limit Exceeded

```json
{
  "error": "RateLimitExceeded",
  "message": "Too many requests. Please try again later.",
  "details": {
    "retryAfter": 60
  },
  "code": 429
}
```

### Error Handling Best Practices

1. **Check error field** in responses
2. **Implement retry logic** for network errors
3. **Handle rate limits** gracefully
4. **Validate parameters** before making requests
5. **Log errors** for debugging

---

## 🚦 Rate Limiting

### Limits

- **Per Tool**: 100 requests per minute
- **Per Client**: 1000 requests per hour
- **Concurrent**: 10 simultaneous requests

### Headers

Response headers include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Handling Rate Limits

1. **Monitor headers** in responses
2. **Implement backoff** when limits approached
3. **Cache results** to reduce requests
4. **Batch operations** when possible

---

## 🔧 Advanced Usage

### Caching Strategies

```typescript
// Cache frequently accessed data
const cache = new Map();

function getCachedResult(key: string, fetchFn: () => Promise<any>) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const result = fetchFn();
  cache.set(key, result);
  return result;
}
```

### Batch Operations

```typescript
// Process multiple providers
const providers = ['stripe.com', 'github.com', 'googleapis.com'];
const results = await Promise.all(
  providers.map(provider => getProviderAPIs(provider))
);
```

### Error Recovery

```typescript
// Retry with exponential backoff
async function retryOperation(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

---

## 📚 Additional Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [APIs.guru Documentation](https://github.com/APIs-guru/openapi-directory)
- [Model Context Protocol](https://github.com/anthropics/model-context-protocol)
- [JSON Schema](https://json-schema.org/)

For more examples and use cases, see the [Examples Guide](./EXAMPLES.md).