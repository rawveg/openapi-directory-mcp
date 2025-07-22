/**
 * Core TypeScript interfaces for mock server functionality
 * Defines configuration, instances, and registry types
 */

/**
 * Mock server configuration options
 */
export interface MockServerConfig {
  /** API identifier from the OpenAPI directory */
  apiId: string;
  /** Custom port number (optional, auto-assigned if not provided) */
  port?: number;
  /** Enable request/response logging */
  enableLogging?: boolean;
  /** Response delay simulation in milliseconds */
  responseDelay?: number;
  /** Error simulation configuration */
  errorSimulation?: ErrorSimulationConfig;
  /** Enable authentication validation */
  authValidation?: boolean;
  /** Enable CORS support */
  enableCors?: boolean;
}

/**
 * Error simulation configuration
 */
export interface ErrorSimulationConfig {
  /** Enable error simulation */
  enabled: boolean;
  /** Probability of error responses (0-1) */
  errorProbability: number;
  /** Enable network-level error simulation */
  networkErrors?: boolean;
  /** Specific error overrides for endpoints */
  specificErrors?: Record<string, ErrorOverride>;
}

/**
 * Specific error override for an endpoint
 */
export interface ErrorOverride {
  /** HTTP status code to return */
  statusCode: number;
  /** Error response body */
  response?: any;
  /** Probability of this error (0-1) */
  probability?: number;
}

/**
 * Mock server instance status
 */
export type MockServerStatus = 
  | 'starting' 
  | 'running' 
  | 'stopping' 
  | 'stopped' 
  | 'error';

/**
 * Mock server instance representation
 */
export interface MockServerInstance {
  /** Unique server instance ID */
  id: string;
  /** API identifier this server is mocking */
  apiId: string;
  /** Port the server is running on */
  port: number;
  /** Base URL for accessing the mock server */
  baseUrl: string;
  /** Current server status */
  status: MockServerStatus;
  /** Server configuration */
  config: MockServerConfig;
  /** Server start time */
  startTime: Date;
  /** Total number of requests handled */
  requestCount: number;
  /** Total number of errors encountered */
  errorCount: number;
  /** Express application instance */
  server: any; // Express application - will be typed properly when express is added
  /** Available endpoints from the OpenAPI spec */
  endpoints?: EndpointInfo[];
}

/**
 * Information about an available endpoint
 */
export interface EndpointInfo {
  /** HTTP method */
  method: string;
  /** Endpoint path */
  path: string;
  /** Operation summary */
  summary?: string;
  /** Required authentication */
  requiresAuth?: boolean;
  /** Available response codes */
  responseCodes: number[];
}

/**
 * Mock server registry interface
 */
export interface MockServerRegistry {
  /** Map of server instances by ID */
  instances: Map<string, MockServerInstance>;
  /** Port allocator for managing port assignments */
  portAllocator: PortAllocator;
  
  /** Add a server instance to the registry */
  add(instance: MockServerInstance): void;
  
  /** Remove a server instance from the registry */
  remove(id: string): void;
  
  /** Get a server instance by ID */
  get(id: string): MockServerInstance | undefined;
  
  /** Get all server instances */
  getAll(): MockServerInstance[];
  
  /** Get server instance by port */
  getByPort(port: number): MockServerInstance | undefined;
  
  /** Get server instances by API ID */
  getByApiId(apiId: string): MockServerInstance[];
  
  /** Check if a server ID exists */
  has(id: string): boolean;
  
  /** Get count of active servers */
  count(): number;
  
  /** Clear all servers */
  clear(): void;
  
  /** Update server status */
  updateServerStatus(id: string, status: MockServerStatus): void;
  
  /** Get registry statistics */
  getStatistics(): {
    totalServers: number;
    runningServers: number;
    stoppedServers: number;
    errorServers: number;
    totalRequests: number;
    totalErrors: number;
  };
  
  /** Get servers needing cleanup */
  getServersNeedingCleanup(): MockServerInstance[];
}

/**
 * Port allocator interface for managing port assignments
 */
export interface PortAllocator {
  /** Allocate an available port */
  allocate(preferredPort?: number): Promise<number>;
  
  /** Release a port back to the pool */
  release(port: number): void;
  
  /** Check if a port is available */
  isAvailable(port: number): Promise<boolean>;
  
  /** Get all allocated ports */
  getAllocated(): number[];
  
  /** Get port range configuration */
  getRange(): { start: number; end: number };
}

/**
 * Mock data generation strategy interface
 */
export interface DataGenerationStrategy {
  /** Generate mock data for a string field */
  generateString(schema: any, fieldName?: string): string;
  
  /** Generate mock data for a numeric field */
  generateNumber(schema: any): number;
  
  /** Generate mock data for an array field */
  generateArray(schema: any): any[];
  
  /** Generate mock data for an object field */
  generateObject(schema: any): Record<string, any>;
  
  /** Use example data from OpenAPI spec if available */
  useExampleData(schema: any): any | null;
  
  /** Generate varied data for the same schema */
  generateVariedData(schema: any, fieldName?: string): any;
}

/**
 * Authentication handler interface
 */
export interface AuthenticationHandler {
  /** Validate authentication for a request */
  validateAuth(
    req: any, 
    securityRequirements: any[], 
    securitySchemes: Record<string, any>
  ): AuthValidationResult;
  
  /** Generate appropriate auth error response */
  generateAuthError(scheme: any): { statusCode: number; body: any };
  
  /** Generate 403 Forbidden response for insufficient permissions */
  generateForbiddenError(scheme: any, requiredScopes?: string[]): { statusCode: number; body: any };
}

/**
 * Authentication validation result
 */
export interface AuthValidationResult {
  /** Whether authentication is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** HTTP status code for error response */
  statusCode?: number;
  /** Validated scheme information */
  scheme?: any;
}

/**
 * Error simulator interface
 */
export interface ErrorSimulator {
  /** Check if an error should be simulated for this request */
  shouldSimulateError(req: any, config: ErrorSimulationConfig): boolean;
  
  /** Generate an error response */
  generateErrorResponse(req: any, config: ErrorSimulationConfig): ErrorResponse;
  
  /** Simulate network-level errors */
  simulateNetworkError(req: any): Promise<void>;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  /** HTTP status code */
  statusCode: number;
  /** Response body */
  body: any;
  /** Response headers */
  headers?: Record<string, string>;
}

/**
 * Mock server manager interface
 */
export interface MockServerManager {
  /** Create and start a new mock server */
  createServer(config: MockServerConfig): Promise<MockServerInstance>;
  
  /** Stop a specific mock server */
  stopServer(serverId: string): Promise<void>;
  
  /** Stop all mock servers */
  stopAllServers(): Promise<void>;
  
  /** Get server status */
  getServerStatus(serverId: string): MockServerInstance | undefined;
  
  /** List all active servers */
  listServers(): MockServerInstance[];
  
  /** Get server by port */
  getServerByPort(port: number): MockServerInstance | undefined;
  
  /** Cleanup all resources */
  cleanup(): Promise<void>;
}

/**
 * Mock server creation result
 */
export interface MockServerCreationResult {
  /** Success status */
  success: boolean;
  /** Server instance if successful */
  server?: MockServerInstance;
  /** Error message if failed */
  error?: string;
  /** Server ID for reference */
  serverId?: string;
}

/**
 * Mock server status response
 */
export interface MockServerStatusResponse {
  /** Server instance details */
  server: MockServerInstance;
  /** Health check status */
  health: {
    status: 'healthy' | 'unhealthy';
    uptime: number;
    memoryUsage?: any; // NodeJS.MemoryUsage - will be typed properly when @types/node is available
  };
  /** Connection information */
  connection: {
    baseUrl: string;
    port: number;
    endpoints: string[];
  };
}