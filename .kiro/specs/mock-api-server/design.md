# Design Document

## Overview

The Mock API Server feature will add a comprehensive mock server capability to the OpenAPI Directory MCP server, allowing users to spin up realistic mock API servers based on any available OpenAPI specification from the three supported sources (APIs.guru, custom specs, and secondary sources). The implementation will follow the existing project architecture patterns, including the tool-based approach, TypeScript-first development, comprehensive testing strategy, and modular design principles.

## Architecture

### High-Level Architecture

The mock server functionality will be implemented as a new tool category within the existing MCP server architecture, following the established patterns:

```
src/tools/mock-server-tools/
├── create-mock-server.ts      # Create and start mock server instances
├── list-mock-servers.ts       # List active mock server instances  
├── stop-mock-server.ts        # Stop specific mock server instances
├── stop-all-mock-servers.ts   # Stop all mock server instances
└── get-mock-server-status.ts  # Get status and health information
```

### Core Components

#### 1. Auto-Loading Tools (`src/tools/mock-server-tools/`)
Following the established drop-in auto-loading pattern, each tool is a self-contained module:

- `create-mock-server.ts` - Create and start mock server instances
- `list-mock-servers.ts` - List active mock server instances  
- `stop-mock-server.ts` - Stop specific mock server instances
- `stop-all-mock-servers.ts` - Stop all mock server instances
- `get-mock-server-status.ts` - Get status and health information

Each tool follows the exact pattern:
```typescript
export const tool: ToolDefinition = {
  name: "tool_name",
  description: "Tool description",
  inputSchema: { /* JSON Schema */ },
  async execute(args: any, context: ToolContext): Promise<any> {
    // Implementation with Zod validation
  }
};
export default tool;
```

#### 2. Auto-Loading Prompts (`src/prompts/mock-server/`)
Following the established drop-in auto-loading pattern, each prompt is a self-contained module:

- `mock-server-setup.ts` - Guide users through mock server creation
- `mock-testing-workflow.ts` - Complete testing workflow with mock servers
- `mock-data-customization.ts` - Customize mock data generation
- `mock-error-simulation.ts` - Set up error simulation scenarios
- `mock-auth-testing.ts` - Test authentication flows with mock servers

Each prompt follows the exact pattern:
```typescript
export const prompt: PromptTemplate = {
  name: "prompt_name",
  description: "Prompt description",
  template: "Template content",
  category: "mock-server",
  arguments: [/* argument definitions */],
  generateMessages: (args) => [/* message generation */]
};
export default prompt;
```

#### 3. Mock Server Manager (`src/mock-server/manager.ts`)
- Manages lifecycle of mock server instances
- Handles port allocation and conflict resolution
- Maintains registry of active servers
- Provides cleanup and resource management

#### 4. Mock Data Generator (`src/mock-server/data-generator.ts`)
- Generates realistic mock data based on OpenAPI schemas
- Supports all OpenAPI data types and formats
- Handles example data prioritization
- Implements varied response generation

#### 5. Mock Server Instance (`src/mock-server/instance.ts`)
- Individual mock server implementation using Express.js
- Handles HTTP request routing and response generation
- Implements authentication validation
- Provides logging and metrics collection

#### 6. Authentication Handler (`src/mock-server/auth-handler.ts`)
- Validates authentication based on OpenAPI security schemes
- Supports all OpenAPI security types (API key, Basic, Bearer, OAuth2, etc.)
- Handles security requirement combinations (AND/OR logic)
- Provides appropriate error responses for auth failures

#### 7. Error Simulator (`src/mock-server/error-simulator.ts`)
- Implements configurable error response simulation
- Supports probability-based error injection
- Handles network-level error simulation (timeouts, connection failures)
- Generates schema-compliant error responses

## Components and Interfaces

### Core Interfaces

```typescript
// Mock Server Configuration
interface MockServerConfig {
  apiId: string;
  port?: number;
  enableLogging?: boolean;
  responseDelay?: number;
  errorSimulation?: ErrorSimulationConfig;
  authValidation?: boolean;
}

// Error Simulation Configuration
interface ErrorSimulationConfig {
  enabled: boolean;
  errorProbability: number; // 0-1
  networkErrors?: boolean;
  specificErrors?: { [endpoint: string]: ErrorOverride };
}

// Mock Server Instance
interface MockServerInstance {
  id: string;
  apiId: string;
  port: number;
  baseUrl: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  config: MockServerConfig;
  startTime: Date;
  requestCount: number;
  errorCount: number;
  server: Express.Application;
}

// Mock Server Registry
interface MockServerRegistry {
  instances: Map<string, MockServerInstance>;
  portAllocator: PortAllocator;
  add(instance: MockServerInstance): void;
  remove(id: string): void;
  get(id: string): MockServerInstance | undefined;
  getAll(): MockServerInstance[];
  getByPort(port: number): MockServerInstance | undefined;
}
```

### Auto-Loading Architecture Pattern

#### Drop-In Tool Implementation
Each tool is completely self-contained and auto-loaded by the system:

```typescript
// src/tools/mock-server-tools/create-mock-server.ts
import { z } from "zod";
import { ToolDefinition, ToolContext } from "../types.js";

export const tool: ToolDefinition = {
  name: "create_mock_server",
  description: "Create and start a mock API server from an OpenAPI specification",
  inputSchema: {
    type: "object",
    properties: {
      api_id: { type: "string", description: "API identifier" },
      port: { type: "number", description: "Custom port (optional)" },
      enable_logging: { type: "boolean", default: true },
      response_delay: { type: "number", default: 0 },
      error_simulation: { 
        type: "object",
        properties: {
          enabled: { type: "boolean", default: false },
          error_probability: { type: "number", minimum: 0, maximum: 1 }
        }
      }
    },
    required: ["api_id"]
  },
  async execute(args: any, context: ToolContext): Promise<any> {
    const schema = z.object({
      api_id: z.string(),
      port: z.number().optional(),
      enable_logging: z.boolean().optional().default(true),
      response_delay: z.number().optional().default(0),
      error_simulation: z.object({
        enabled: z.boolean().default(false),
        error_probability: z.number().min(0).max(1).default(0.1)
      }).optional()
    });
    
    const params = schema.parse(args);
    return await context.mockServerManager.createServer(params);
  }
};

export default tool;
```

#### Drop-In Prompt Implementation
Each prompt is completely self-contained and auto-loaded by the system:

```typescript
// src/prompts/mock-server/mock-server-setup.ts
import { PromptTemplate } from "../types.js";

export const prompt: PromptTemplate = {
  name: "mock_server_setup",
  description: "Guide users through setting up mock API servers for testing and development",
  template: "Set up mock server for {{api_name}} API",
  category: "mock-server",
  arguments: [
    {
      name: "api_name",
      description: "Name or identifier of the API to mock",
      required: true,
    },
    {
      name: "use_case",
      description: "Testing scenario (development, integration testing, demo)",
      required: false,
    }
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Set up a mock server for the ${args.api_name} API${args.use_case ? ` for ${args.use_case}` : ''}.

**Phase 1: API Discovery and Analysis**
1. Use 'search_apis' to find the ${args.api_name} API
2. Use 'get_api_summary' to understand the API structure and authentication
3. Use 'get_endpoints' to see available endpoints for mocking

**Phase 2: Mock Server Creation**
4. Use 'create_mock_server' tool with appropriate configuration:
   - Choose port (or let system auto-assign)
   - Enable logging for debugging
   - Configure response delays if needed
   - Set up error simulation for testing edge cases

**Phase 3: Testing and Validation**
5. Use 'get_mock_server_status' to verify server is running
6. Test endpoints with sample requests
7. Validate mock responses match expected schemas
8. Configure authentication simulation if needed

**Phase 4: Integration**
9. Update your application configuration to use mock server
10. Run your tests against the mock server
11. Use error simulation to test failure scenarios

Begin by discovering and analyzing the API structure.`
      }
    }
  ]
};

export default prompt;
```

#### Zero-Touch Extensibility
The auto-loading system provides:
- **Automatic Discovery**: Tools and prompts are discovered by scanning directories
- **Zero Configuration**: No manual registration required
- **Hot Loading**: New tools/prompts are available immediately
- **Isolation**: Each tool/prompt is completely independent
- **Testing**: Each component can be tested in isolation

### Plugin Architecture Integration
Following the established dual plugin system:
- **Tools**: 5 new mock server tools in `mock-server-tools/` category
- **Prompts**: 6 new mock server prompts in `mock-server/` category
- **Auto-Discovery**: Folder-based discovery with zero manual registration
- **Claude Code Integration**: All prompts automatically become slash commands
- **Categories**: Proper categorization for organization and discoverability

## Data Models

### Mock Data Generation Strategy

The data generator will implement a sophisticated schema-to-data mapping system:

```typescript
interface DataGenerationStrategy {
  // String generation with format awareness
  generateString(schema: OpenAPISchema): string;
  
  // Numeric generation with constraints
  generateNumber(schema: OpenAPISchema): number;
  
  // Array generation with length constraints
  generateArray(schema: OpenAPISchema): any[];
  
  // Object generation with nested properties
  generateObject(schema: OpenAPISchema): Record<string, any>;
  
  // Example data prioritization
  useExampleData(schema: OpenAPISchema): any | null;
}
```

### Data Generation Rules

1. **Example Priority**: Use OpenAPI examples when available
2. **Format-Aware Generation**: Generate realistic data based on string formats (email, date, uuid, etc.)
3. **Constraint Compliance**: Respect min/max values, string lengths, array sizes
4. **Realistic Patterns**: Use faker.js-style generation for common field names
5. **Variation**: Generate different data on subsequent calls while maintaining schema compliance

## Error Handling

### Comprehensive Error Management

Following the project's error handling patterns with custom error types:

```typescript
// Mock Server Errors
export class MockServerError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'MockServerError';
  }
}

export class PortAllocationError extends MockServerError {
  constructor(port: number) {
    super(`Port ${port} is already in use`, 'PORT_IN_USE');
  }
}

export class InvalidAPISpecError extends MockServerError {
  constructor(apiId: string, reason: string) {
    super(`Invalid API specification for ${apiId}: ${reason}`, 'INVALID_SPEC');
  }
}
```

### Error Response Generation

The mock server will generate appropriate error responses:

1. **Schema-Compliant Errors**: Use error response schemas from OpenAPI spec
2. **Standard HTTP Errors**: Fallback to standard HTTP error responses
3. **Authentication Errors**: Proper 401/403 responses for auth failures
4. **Validation Errors**: 400 responses for invalid request data
5. **Server Errors**: 500 responses for internal mock server issues

## Testing Strategy

### Multi-Layer Testing Approach

Following the project's comprehensive testing strategy with auto-loading pattern support:

#### Unit Tests (`tests/unit/mock-server/`)
- **Coverage Target**: 90% (matching project standards)
- **Core Components**:
  - `manager.test.ts` - Mock server lifecycle management
  - `data-generator.test.ts` - Mock data generation logic
  - `auth-handler.test.ts` - Authentication validation
  - `error-simulator.test.ts` - Error simulation functionality
  - `instance.test.ts` - Individual server instance behavior

#### Unit Tests for Auto-Loading Components (`tests/unit/`)
- **Tools Testing** (`tests/unit/mock-server-tools/`):
  - `create-mock-server.test.ts` - Tool validation and execution
  - `list-mock-servers.test.ts` - Server listing functionality
  - `stop-mock-server.test.ts` - Server stopping functionality
  - `get-mock-server-status.test.ts` - Status reporting
- **Prompts Testing** (`tests/unit/prompts/mock-server/`):
  - Test prompt argument validation
  - Test message generation
  - Test template rendering

#### Feature Tests (`tests/feature/mock-server/`)
- **Coverage Target**: 85% (matching project standards)
- **Auto-Loading Integration**: Testing tool and prompt discovery
- **End-to-End Workflows**: Complete mock server creation and usage
- **Tool Chain Testing**: Testing all mock server tools together
- **Prompt Integration**: Testing prompts with actual tool execution

#### Integration Tests (`tests/integration/mock-server/`)
- **Full Pipeline**: Complete workflow from API spec to running mock server
- **Multi-Server**: Testing multiple concurrent mock servers
- **Resource Management**: Memory and port cleanup testing
- **Error Scenarios**: Network failures, invalid specs, resource exhaustion
- **Auto-Loading**: Testing tool and prompt discovery in production-like environment

#### Smoke Tests (`tests/smoke/mock-server/`)
- **Basic Functionality**: Quick validation of core features
- **Performance**: Response time and resource usage validation
- **Auto-Loading**: Verify tools and prompts are discovered correctly

### Test Data and Fixtures

```
tests/fixtures/mock-server/
├── sample-specs/           # OpenAPI specs for testing
├── expected-responses/     # Expected mock responses
├── auth-scenarios/         # Authentication test cases
├── error-scenarios/        # Error simulation test cases
├── tool-inputs/           # Sample tool input data
└── prompt-scenarios/      # Prompt testing scenarios
```

### Auto-Loading Test Patterns

Each tool and prompt includes comprehensive tests following STRICT reliability standards:

```typescript
// tests/unit/mock-server-tools/create-mock-server.test.ts
import { tool } from '../../../src/tools/mock-server-tools/create-mock-server.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('create-mock-server tool', () => {
  it('should be auto-discoverable', () => {
    expect(tool.name).toBe('create_mock_server');
    expect(tool.execute).toBeInstanceOf(Function);
  });

  it('should validate input schema', async () => {
    // Test Zod validation - deterministic, no timing
    const validInput = { api_id: 'test-api' };
    const invalidInput = { invalid: 'data' };
    
    // Test valid input passes
    expect(() => schema.parse(validInput)).not.toThrow();
    
    // Test invalid input fails predictably
    expect(() => schema.parse(invalidInput)).toThrow();
  });

  it('should execute successfully', async () => {
    // Test tool execution - functional, not timing-based
    const mockContext = createMockContext();
    const result = await tool.execute({ api_id: 'test-api' }, mockContext);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.serverId).toMatch(/^mock-server-/);
  });
});
```

### Test Reliability Standards (ABSOLUTELY NO FLAKY TESTS)

**FORBIDDEN Test Patterns:**
```typescript
// NEVER - Timing-based assertions are FORBIDDEN
expect(endTime - startTime).toBeLessThan(100);
expect(duration).toBeGreaterThan(50);
expect(performance.now() - start).toBeLessThanOrEqual(1000);
```

**REQUIRED Test Patterns:**
```typescript
// GOOD - Test functionality, not arbitrary timing
const servers = await createMultipleMockServers(10);
expect(servers).toHaveLength(10);
expect(servers.every(s => s.status === 'running')).toBe(true);

// GOOD - Test scalability without timing
for (let i = 0; i < 100; i++) {
  await mockServer.handleRequest(createTestRequest());
}
expect(mockServer.getRequestCount()).toBe(100);
expect(() => mockServer.getStatus()).not.toThrow();
```

**Deterministic Testing Requirements:**
- ALL tests must be deterministic - same input ALWAYS produces same output
- NO tests that can fail due to external factors (network, timing, load)
- NO random failures - if a test fails intermittently, it's WRONG
- Tests must validate functionality and correctness, not performance metrics

## Prompt System Integration

### Mock Server Prompts (`src/prompts/mock-server/`)

Following the auto-loading pattern, each prompt becomes a slash command in Claude Code:

#### Core Mock Server Prompts

1. **`mock-server-setup.ts`** → `/openapi-directory:mock_server_setup`
   - Guide users through complete mock server setup
   - API discovery, configuration, and testing workflow

2. **`mock-testing-workflow.ts`** → `/openapi-directory:mock_testing_workflow`
   - Complete testing workflow using mock servers
   - Integration testing, error simulation, validation

3. **`mock-data-customization.ts`** → `/openapi-directory:mock_data_customization`
   - Customize mock data generation patterns
   - Schema-based data generation, realistic examples

4. **`mock-error-simulation.ts`** → `/openapi-directory:mock_error_simulation`
   - Set up comprehensive error simulation scenarios
   - Network errors, authentication failures, rate limiting

5. **`mock-auth-testing.ts`** → `/openapi-directory:mock_auth_testing`
   - Test authentication flows with mock servers
   - OAuth2, API keys, bearer tokens, custom schemes

6. **`mock-performance-testing.ts`** → `/openapi-directory:mock_performance_testing`
   - Performance testing with mock servers
   - Load testing, response time simulation, concurrency

### Prompt Categories and Integration

All prompts will be categorized under `"mock-server"` and automatically:
- Appear as slash commands in Claude Code
- Be discoverable through the prompts/list endpoint
- Integrate seamlessly with existing tool ecosystem
- Follow progressive discovery patterns

## Implementation Plan Integration

### Consistency with Existing Patterns

1. **Auto-Loading Architecture**: Follow exact drop-in pattern for tools and prompts
2. **Tool Structure**: Each tool is self-contained in categorized directories
3. **Prompt Structure**: Each prompt is self-contained with proper category assignment
4. **TypeScript Standards**: Strict TypeScript with comprehensive type definitions
5. **Validation**: Zod schema validation for all tool inputs
6. **Error Handling**: Custom error classes with proper error codes
7. **Caching**: Leverage existing cache manager for OpenAPI spec caching
8. **Logging**: Use existing MCP-compliant logging patterns

### Code Quality Standards (MANDATORY COMPLIANCE)

Following the project's ZERO TOLERANCE POLICY for code quality:

- **3-Stage Code Review**: All code subject to independent quorum review process
- **Pre-Commit Validation**: ALL tests, linting, type-checking must pass before any commits
- **ESLint Configuration**: Follow existing `.eslintrc.json` rules with zero violations
- **Prettier Formatting**: Consistent with project formatting standards
- **Type Safety**: Strict TypeScript with no `any` types except for validated inputs
- **Documentation**: Comprehensive JSDoc comments for all public interfaces
- **Testing**: Maintain project's high test coverage standards (90% unit, 85% feature)
- **NO Shortcuts**: No hacky fixes, workarounds, or bypassing CI/CD stages
- **Professional Standards**: Code quality and security are PARAMOUNT

### Performance Considerations

1. **Memory Management**: Proper cleanup of server instances and resources
2. **Port Management**: Efficient port allocation and deallocation
3. **Response Caching**: Cache generated mock data for repeated requests
4. **Concurrent Servers**: Support for multiple simultaneous mock servers
5. **Resource Limits**: Configurable limits on number of active servers

### Security Considerations

1. **Port Binding**: Only bind to localhost to prevent external access
2. **Input Validation**: Strict validation of all configuration inputs
3. **Resource Limits**: Prevent resource exhaustion attacks
4. **Authentication Simulation**: Secure handling of auth tokens and keys
5. **Error Information**: Avoid leaking sensitive information in error messages

## Dependencies

### New Dependencies

```json
{
  "express": "^4.18.0",
  "cors": "^2.8.5",
  "@faker-js/faker": "^8.0.0",
  "get-port": "^7.0.0"
}
```

### Development Dependencies

```json
{
  "@types/express": "^4.17.0",
  "@types/cors": "^2.8.0",
  "supertest": "^6.3.0"
}
```

All dependencies align with the project's Node.js >=18.0.0 requirement and ES module usage.

## Deployment Considerations

### NPX Compatibility

The mock server functionality will be fully compatible with the existing NPX deployment:

1. **Zero Configuration**: Works out of the box with default settings
2. **Resource Cleanup**: Automatic cleanup on MCP server shutdown
3. **Port Management**: Automatic port allocation to avoid conflicts
4. **Cross-Platform**: Compatible with macOS, Linux, and Windows

### Configuration Options

Environment variables for customization:

```bash
MOCK_SERVER_PORT_RANGE_START=3000    # Starting port for allocation
MOCK_SERVER_PORT_RANGE_END=4000      # Ending port for allocation  
MOCK_SERVER_MAX_INSTANCES=10         # Maximum concurrent servers
MOCK_SERVER_DEFAULT_DELAY=0          # Default response delay (ms)
MOCK_SERVER_ENABLE_CORS=true         # Enable CORS by default
```

## Critical Implementation Guidelines

### Mandatory Compliance Standards

**ZERO TOLERANCE POLICY:**
- NO shortcuts of any kind
- NO hacky fixes or workarounds  
- NO commenting out tests
- NO removing test suites
- NO bypassing CI/CD stages
- NO avoiding problems instead of fixing them

**Pre-Commit Validation Requirements:**
- ALL tests must pass: `npm test`, `npm run test:ci`, `npm run test:regression`
- ALL CI stages must pass: `npm run lint`, `npm run type-check`, `npm run build`
- ALL validation must complete: `npm run validate`
- If ANY stage fails, implementation is FORBIDDEN until fixed

**Professional Standards:**
- Code quality is PARAMOUNT
- Security is PARAMOUNT
- No exceptions will be tolerated
- All work subject to 3-stage independent quorum code review

### Development Workflow

**Correct Implementation Process:**
1. Implement changes following all established patterns
2. Run full validation suite: `npm run validate`
3. Ensure ALL tests pass with zero flaky tests
4. Report what was implemented
5. User decides on git operations (staging, commits)

**Git Policy:**
- NEVER perform git operations without explicit user instruction
- Make file changes, but let user handle all git operations
- User controls staging, commits, and deployment decisions

This design ensures the mock server feature integrates seamlessly with the existing OpenAPI Directory MCP server while maintaining all established patterns, quality standards, and architectural principles under the project's ZERO TOLERANCE quality policy.