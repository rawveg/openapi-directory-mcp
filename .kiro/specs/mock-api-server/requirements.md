# Requirements Document

## Introduction

This feature will add a Mock API Server tool to the OpenAPI Directory MCP server that allows users to spin up mock API servers based on any available OpenAPI specification from the three supported sources (APIs.guru, custom specs, and secondary sources). The mock server will generate realistic mock data and provide accessible endpoints that developers can use for testing, development, and prototyping without needing access to the actual API services.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to create a mock API server from any OpenAPI spec available in the system, so that I can test my applications against realistic API endpoints without depending on external services.

#### Acceptance Criteria

1. WHEN a user calls the mock server tool with a valid API identifier THEN the system SHALL create a mock server instance with all endpoints defined in the OpenAPI specification
2. WHEN the mock server is created THEN the system SHALL return the base URL and port where the mock server is accessible
3. WHEN the mock server receives requests to defined endpoints THEN it SHALL respond with mock data that conforms to the OpenAPI schema definitions
4. IF the OpenAPI spec contains example data THEN the mock server SHALL prioritize using those examples in responses
5. WHEN the mock server receives requests to undefined endpoints THEN it SHALL return appropriate 404 responses

### Requirement 2

**User Story:** As a developer, I want to configure mock server behavior and data generation options, so that I can customize the mock responses to match my testing needs.

#### Acceptance Criteria

1. WHEN creating a mock server THEN the user SHALL be able to specify a custom port number
2. WHEN creating a mock server THEN the user SHALL be able to enable/disable request logging
3. WHEN creating a mock server THEN the user SHALL be able to set response delay simulation
4. IF no port is specified THEN the system SHALL automatically assign an available port
5. WHEN the mock server is configured with logging enabled THEN it SHALL log all incoming requests and responses

### Requirement 3

**User Story:** As a developer, I want to manage multiple mock server instances, so that I can test different APIs simultaneously or different versions of the same API.

#### Acceptance Criteria

1. WHEN multiple mock servers are created THEN each SHALL run on a different port
2. WHEN a user requests to list active mock servers THEN the system SHALL return all running instances with their details
3. WHEN a user requests to stop a specific mock server THEN the system SHALL terminate that instance and free its resources
4. WHEN a user requests to stop all mock servers THEN the system SHALL terminate all instances
5. WHEN the MCP server shuts down THEN all mock server instances SHALL be automatically terminated

### Requirement 4

**User Story:** As a developer, I want the mock server to generate realistic and varied mock data, so that my tests can cover different scenarios and edge cases.

#### Acceptance Criteria

1. WHEN generating mock data for string fields THEN the system SHALL create realistic values based on field names and formats
2. WHEN generating mock data for numeric fields THEN the system SHALL respect minimum, maximum, and format constraints
3. WHEN generating mock data for array fields THEN the system SHALL create arrays with varied lengths within specified constraints
4. WHEN generating mock data for object fields THEN the system SHALL create nested objects that conform to the schema
5. WHEN the same endpoint is called multiple times THEN the system SHALL generate varied responses while maintaining schema compliance

### Requirement 5

**User Story:** As a developer, I want the mock server to handle all authentication and security schemes defined in the OpenAPI spec, so that I can test various authentication flows and security patterns.

#### Acceptance Criteria

1. WHEN the OpenAPI spec defines security schemes THEN the mock server SHALL validate authentication headers/parameters according to the scheme type
2. WHEN a request lacks required authentication THEN the mock server SHALL return appropriate 401/403 responses
3. WHEN a request includes valid authentication THEN the mock server SHALL process the request normally
4. IF the OpenAPI spec defines API key authentication THEN the mock server SHALL accept any non-empty API key value in the specified location (header, query, or cookie)
5. IF the OpenAPI spec defines HTTP basic authentication THEN the mock server SHALL accept any properly formatted username/password combination
6. IF the OpenAPI spec defines bearer token authentication THEN the mock server SHALL accept any properly formatted bearer token
7. IF the OpenAPI spec defines OAuth2 flows THEN the mock server SHALL simulate OAuth2 endpoints and accept any valid token format
8. IF the OpenAPI spec defines OpenID Connect THEN the mock server SHALL simulate OIDC endpoints and accept JWT tokens
9. IF the OpenAPI spec defines custom security schemes THEN the mock server SHALL validate based on the scheme definition
10. WHEN multiple security schemes are defined as alternatives THEN the mock server SHALL accept any one of the valid schemes
11. WHEN security schemes are combined (AND logic) THEN the mock server SHALL require all specified authentication methods

### Requirement 6

**User Story:** As a developer, I want to access mock server status and health information with connection details, so that I can monitor, troubleshoot, and manually configure connections to mock server instances.

#### Acceptance Criteria

1. WHEN a mock server is running THEN it SHALL provide a health check endpoint
2. WHEN querying mock server status THEN the system SHALL return uptime, request count, configuration details, base URL, port, and available endpoints
3. WHEN querying mock server status THEN the system SHALL include connection information such as full endpoint URLs and required headers
4. WHEN a mock server encounters errors THEN it SHALL log error details and continue serving other endpoints
5. WHEN the system resources are low THEN it SHALL prevent creation of new mock server instances
6. WHEN a mock server becomes unresponsive THEN the system SHALL detect and report the failure

### Requirement 7

**User Story:** As a developer, I want to trigger negative responses and error scenarios from the mock server, so that I can test error handling and edge cases in my applications beyond happy path scenarios.

#### Acceptance Criteria

1. WHEN creating a mock server THEN the user SHALL be able to configure error simulation modes
2. WHEN error simulation is enabled THEN the mock server SHALL randomly return error responses (4xx, 5xx) based on configured probability
3. WHEN a specific error trigger is configured THEN the mock server SHALL return that error for matching requests
4. WHEN the OpenAPI spec defines error response schemas THEN the mock server SHALL generate mock error responses that conform to those schemas
5. WHEN no error response schema is defined THEN the mock server SHALL return standard HTTP error responses
6. WHEN a user configures specific endpoint error overrides THEN those SHALL take precedence over global error simulation
7. WHEN error simulation includes network-level errors THEN the mock server SHALL simulate timeouts and connection failures
8. WHEN querying mock server status THEN it SHALL include current error simulation configuration and statistics