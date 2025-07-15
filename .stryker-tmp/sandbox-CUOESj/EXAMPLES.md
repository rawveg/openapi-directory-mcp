# Usage Examples

This guide provides comprehensive examples of how to use the OpenAPI Directory MCP Server in real-world scenarios.

## 📊 Basic Operations

### List All Providers

**Command:**
```
"List all API providers in the directory"
```

**Expected Response:**
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

### Get Directory Statistics

**Command:**
```
"Show me the current API directory statistics"
```

**Expected Response:**
```json
{
  "numAPIs": 2501,
  "numEndpoints": 106448,
  "numSpecs": 3329,
  "numProviders": 659,
  "thisWeek": {
    "added": 45,
    "updated": 171
  }
}
```

## 🔍 Provider-Specific Operations

### Explore Google APIs

**Command:**
```
"What APIs does Google offer?"
```

**Example Response:**
```json
{
  "googleapis.com:admin": {
    "added": "2015-12-12T00:25:13.000Z",
    "preferred": "directory_v1",
    "versions": {
      "directory_v1": {
        "info": {
          "title": "Admin SDK",
          "version": "directory_v1",
          "description": "Manage users and groups in your domain."
        }
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

### List Stripe Services

**Command:**
```
"What services does Stripe provide?"
```

**Example Response:**
```json
{
  "data": [
    "payments",
    "billing",
    "connect",
    "issuing",
    "terminal"
  ]
}
```

## 📋 API Specification Retrieval

### Get Complete API Specification

**Command:**
```
"Get the OpenAPI specification for Stripe's payments API"
```

**Parameters Used:**
- Provider: `stripe.com`
- Service: `payments`
- API: `v1`

**Example Response:**
```json
{
  "added": "2020-01-15T10:30:00.000Z",
  "updated": "2024-01-15T14:20:00.000Z",
  "swaggerUrl": "https://api.apis.guru/v2/specs/stripe.com/payments/v1/swagger.json",
  "swaggerYamlUrl": "https://api.apis.guru/v2/specs/stripe.com/payments/v1/swagger.yaml",
  "info": {
    "title": "Stripe API",
    "version": "v1",
    "description": "The Stripe REST API",
    "contact": {
      "email": "dev-platform@stripe.com",
      "name": "Stripe Dev Platform Team",
      "url": "https://stripe.com/support"
    }
  },
  "openapiVer": "3.0.0"
}
```

### Get Simple API Without Service

**Command:**
```
"Get the OpenAPI spec for the JSONPlaceholder API"
```

**Parameters Used:**
- Provider: `jsonplaceholder.typicode.com`
- API: `1.0.0`

## 🎯 Advanced Search Scenarios

### Find Payment Processing APIs

**Command:**
```
"Find all APIs related to payment processing"
```

**Approach:**
1. List all APIs: `list_all_apis`
2. Filter by keywords in titles/descriptions
3. Return relevant results

**Example Results:**
- Stripe API
- PayPal API
- Adyen API
- Square API
- Klarna API

### Discover Machine Learning APIs

**Command:**
```
"Show me APIs for machine learning and AI"
```

**Example Providers:**
- Google Cloud AI Platform
- Azure Cognitive Services
- Amazon SageMaker
- IBM Watson
- OpenAI API

### Find APIs by Functionality

**Command:**
```
"What APIs are available for sending emails?"
```

**Example Results:**
- SendGrid API
- Mailgun API
- Amazon SES
- Twilio SendGrid
- Mandrill API

## 🔧 Development Workflows

### API Integration Planning

**Scenario:** Planning integration with a CRM system

**Commands:**
```
1. "List all CRM-related APIs"
2. "Get the Salesforce API specification"
3. "What's the latest version of the HubSpot API?"
4. "Show me the documentation for Microsoft Dynamics API"
```

### API Comparison Analysis

**Scenario:** Comparing video streaming APIs

**Commands:**
```
1. "Get the YouTube API specification"
2. "Get the Vimeo API specification"
3. "What video APIs are available from Amazon?"
4. "Show me the Twitch API documentation"
```

### Version Migration Research

**Scenario:** Upgrading from an older API version

**Commands:**
```
1. "Show me all versions of the Twitter API"
2. "What's the preferred version of the Instagram API?"
3. "Get the changelog for GitHub API versions"
4. "Compare v1 and v2 of the Slack API"
```

## 📱 Mobile Development Examples

### Social Media Integration

**Command:**
```
"I'm building a mobile app that needs social media integration. What APIs are available?"
```

**Expected APIs:**
- Facebook Graph API
- Twitter API
- Instagram API
- LinkedIn API
- TikTok API
- Pinterest API

### Location Services

**Command:**
```
"Find APIs for location services and mapping"
```

**Expected APIs:**
- Google Maps API
- Mapbox API
- OpenStreetMap API
- HERE API
- Apple MapKit

## 🌐 Web Development Examples

### E-commerce Integration

**Command:**
```
"I need APIs for building an e-commerce platform"
```

**Expected Categories:**
- Payment Processing (Stripe, PayPal)
- Shipping (UPS, FedEx, DHL)
- Inventory Management
- Product Catalogs
- Customer Reviews

### Authentication Services

**Command:**
```
"What authentication APIs are available?"
```

**Expected APIs:**
- Auth0 API
- Firebase Auth
- Okta API
- AWS Cognito
- Azure AD

## 📊 Data Integration Examples

### Financial Data

**Command:**
```
"Find APIs for financial data and trading"
```

**Expected APIs:**
- Alpha Vantage
- Yahoo Finance
- Quandl
- IEX Cloud
- Bloomberg API

### Weather Data

**Command:**
```
"What weather APIs are available?"
```

**Expected APIs:**
- OpenWeatherMap
- WeatherAPI
- AccuWeather
- Dark Sky API
- NOAA API

## 🎪 Entertainment APIs

### Gaming Integration

**Command:**
```
"Show me gaming-related APIs"
```

**Expected APIs:**
- Steam API
- Twitch API
- Discord API
- Xbox Live API
- PlayStation API

### Media Services

**Command:**
```
"Find APIs for media streaming and content"
```

**Expected APIs:**
- Spotify API
- Netflix API
- YouTube API
- Soundcloud API
- Pandora API

## 🔐 Error Handling Examples

### Invalid Provider

**Command:**
```
"Get APIs from nonexistent.com"
```

**Expected Response:**
```json
{
  "error": "Provider not found",
  "message": "The provider 'nonexistent.com' does not exist in the directory"
}
```

### Invalid API Version

**Command:**
```
"Get the v99 version of the GitHub API"
```

**Expected Response:**
```json
{
  "error": "API version not found",
  "message": "Version 'v99' not found for github.com API"
}
```

## 🚀 Performance Tips

### Efficient API Discovery

1. **Use specific provider names** for faster results
2. **Cache frequently accessed specifications** locally
3. **Batch related requests** when possible
4. **Use preferred versions** unless specific version needed

### Best Practices

1. **Always check API status** before integration
2. **Review API documentation** links provided
3. **Validate OpenAPI specs** before use
4. **Monitor API updates** regularly

## 📚 Learning Resources

### Getting Started with APIs

**Command:**
```
"I'm new to APIs. Show me some beginner-friendly APIs to practice with"
```

**Recommended APIs:**
- JSONPlaceholder (fake REST API)
- httpbin.org (HTTP testing)
- Dog CEO API (simple image API)
- Chuck Norris API (joke API)

### Advanced API Concepts

**Command:**
```
"Show me examples of GraphQL APIs"
```

**Command:**
```
"Find APIs that use OAuth 2.0 authentication"
```

This comprehensive set of examples should help you understand how to effectively use the OpenAPI Directory MCP Server in various scenarios and workflows.