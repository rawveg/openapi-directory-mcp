/**
 * Mock server specific error classes following project patterns
 * Extends the base OpenAPIDirectoryError with mock server specific context
 */

import { OpenAPIDirectoryError, ErrorContext } from "../utils/errors.js";

/**
 * Mock server specific error context
 */
export interface MockServerErrorContext extends ErrorContext {
  /** Mock server instance ID */
  serverId?: string;
  /** Port number involved in the error */
  port?: number;
  /** API ID being mocked */
  apiId?: string;
  /** HTTP method if request-related */
  method?: string;
  /** Request path if request-related */
  path?: string;
  /** Server status at time of error */
  serverStatus?: string;
}

/**
 * Base mock server error class
 */
export class MockServerError extends OpenAPIDirectoryError {
  constructor(
    message: string,
    code: string,
    context: MockServerErrorContext = {},
    userMessage?: string,
  ) {
    super(message, code, context, userMessage);
    this.name = 'MockServerError';
  }
}

/**
 * Port allocation and management errors
 */
export class PortAllocationError extends MockServerError {
  constructor(port: number, reason?: string) {
    const message = `Port ${port} allocation failed${reason ? `: ${reason}` : ''}`;
    const userMessage = `Unable to use port ${port}. The port may already be in use or unavailable.`;
    
    super(message, 'PORT_ALLOCATION_ERROR', { port }, userMessage);
    this.name = 'PortAllocationError';
  }
}

/**
 * Port already in use errors
 */
export class PortInUseError extends PortAllocationError {
  constructor(port: number) {
    super(port, 'port already in use');
    this.name = 'PortInUseError';
  }
}

/**
 * Invalid API specification errors for mock server
 */
export class InvalidAPISpecError extends MockServerError {
  constructor(apiId: string, reason: string) {
    const message = `Invalid API specification for ${apiId}: ${reason}`;
    const userMessage = `The API specification for "${apiId}" cannot be used for mocking. ${reason}`;
    
    super(message, 'INVALID_API_SPEC', { apiId }, userMessage);
    this.name = 'InvalidAPISpecError';
  }
}

/**
 * Mock server instance not found errors
 */
export class ServerNotFoundError extends MockServerError {
  constructor(serverId: string) {
    const message = `Mock server instance ${serverId} not found`;
    const userMessage = `The mock server "${serverId}" was not found. It may have been stopped or never existed.`;
    
    super(message, 'SERVER_NOT_FOUND', { serverId }, userMessage);
    this.name = 'ServerNotFoundError';
  }
}

/**
 * Mock server startup errors
 */
export class ServerStartupError extends MockServerError {
  constructor(serverId: string, port: number, reason: string) {
    const message = `Failed to start mock server ${serverId} on port ${port}: ${reason}`;
    const userMessage = `Unable to start the mock server on port ${port}. ${reason}`;
    
    super(message, 'SERVER_STARTUP_ERROR', { serverId, port }, userMessage);
    this.name = 'ServerStartupError';
  }
}

/**
 * Mock server shutdown errors
 */
export class ServerShutdownError extends MockServerError {
  constructor(serverId: string, reason: string) {
    const message = `Failed to shutdown mock server ${serverId}: ${reason}`;
    const userMessage = `Unable to stop the mock server "${serverId}". ${reason}`;
    
    super(message, 'SERVER_SHUTDOWN_ERROR', { serverId }, userMessage);
    this.name = 'ServerShutdownError';
  }
}

/**
 * Mock data generation errors
 */
export class DataGenerationError extends MockServerError {
  constructor(apiId: string, path: string, reason: string) {
    const message = `Failed to generate mock data for ${apiId} ${path}: ${reason}`;
    const userMessage = `Unable to generate mock response data. The API specification may be incomplete or invalid.`;
    
    super(message, 'DATA_GENERATION_ERROR', { apiId, path }, userMessage);
    this.name = 'DataGenerationError';
  }
}

/**
 * Authentication simulation errors
 */
export class AuthSimulationError extends MockServerError {
  constructor(apiId: string, scheme: string, reason: string) {
    const message = `Authentication simulation failed for ${apiId} with scheme ${scheme}: ${reason}`;
    const userMessage = `Unable to simulate authentication for the API. The security scheme may not be supported.`;
    
    super(message, 'AUTH_SIMULATION_ERROR', { apiId }, userMessage);
    this.name = 'AuthSimulationError';
  }
}

/**
 * Mock server configuration errors
 */
export class ConfigurationError extends MockServerError {
  constructor(field: string, value: any, reason: string) {
    const message = `Invalid configuration for ${field} = ${value}: ${reason}`;
    const userMessage = `The mock server configuration is invalid. Please check the ${field} setting.`;
    
    super(message, 'CONFIGURATION_ERROR', { details: { field, value } }, userMessage);
    this.name = 'ConfigurationError';
  }
}

/**
 * Resource limit errors
 */
export class ResourceLimitError extends MockServerError {
  constructor(resource: string, limit: number, current: number) {
    const message = `Resource limit exceeded for ${resource}: ${current}/${limit}`;
    const userMessage = `Cannot create more mock servers. The maximum limit of ${limit} ${resource} has been reached.`;
    
    super(message, 'RESOURCE_LIMIT_ERROR', { details: { resource, limit, current } }, userMessage);
    this.name = 'ResourceLimitError';
  }
}

/**
 * Mock server request handling errors
 */
export class RequestHandlingError extends MockServerError {
  constructor(serverId: string, method: string, path: string, reason: string) {
    const message = `Request handling failed for ${serverId} ${method} ${path}: ${reason}`;
    const userMessage = `The mock server encountered an error processing your request.`;
    
    super(message, 'REQUEST_HANDLING_ERROR', { serverId, method, path }, userMessage);
    this.name = 'RequestHandlingError';
  }
}

/**
 * Error factory for creating mock server specific errors
 */
export class MockServerErrorFactory {
  /**
   * Create error from port allocation failure
   */
  static fromPortError(port: number, error: any): PortAllocationError {
    if (error.code === 'EADDRINUSE') {
      return new PortInUseError(port);
    }
    return new PortAllocationError(port, error.message || 'Unknown port error');
  }

  /**
   * Create error from server startup failure
   */
  static fromStartupError(serverId: string, port: number, error: any): ServerStartupError {
    const reason = error.message || 'Unknown startup error';
    return new ServerStartupError(serverId, port, reason);
  }

  /**
   * Create error from API spec validation failure
   */
  static fromSpecValidationError(apiId: string, error: any): InvalidAPISpecError {
    const reason = error.message || 'Specification validation failed';
    return new InvalidAPISpecError(apiId, reason);
  }

  /**
   * Create error from configuration validation failure
   */
  static fromConfigError(field: string, value: any, error: any): ConfigurationError {
    const reason = error.message || 'Invalid configuration value';
    return new ConfigurationError(field, value, reason);
  }

  /**
   * Create error from data generation failure
   */
  static fromDataGenerationError(apiId: string, path: string, error: any): DataGenerationError {
    const reason = error.message || 'Data generation failed';
    return new DataGenerationError(apiId, path, reason);
  }

  /**
   * Create error from authentication simulation failure
   */
  static fromAuthError(apiId: string, scheme: string, error: any): AuthSimulationError {
    const reason = error.message || 'Authentication simulation failed';
    return new AuthSimulationError(apiId, scheme, reason);
  }

  /**
   * Create error from request handling failure
   */
  static fromRequestError(
    serverId: string, 
    method: string, 
    path: string, 
    error: any
  ): RequestHandlingError {
    const reason = error.message || 'Request handling failed';
    return new RequestHandlingError(serverId, method, path, reason);
  }
}

/**
 * Mock server error codes for consistent error handling
 */
export const MOCK_SERVER_ERROR_CODES = {
  PORT_ALLOCATION_ERROR: 'PORT_ALLOCATION_ERROR',
  PORT_IN_USE: 'PORT_IN_USE',
  INVALID_API_SPEC: 'INVALID_API_SPEC',
  SERVER_NOT_FOUND: 'SERVER_NOT_FOUND',
  SERVER_STARTUP_ERROR: 'SERVER_STARTUP_ERROR',
  SERVER_SHUTDOWN_ERROR: 'SERVER_SHUTDOWN_ERROR',
  DATA_GENERATION_ERROR: 'DATA_GENERATION_ERROR',
  AUTH_SIMULATION_ERROR: 'AUTH_SIMULATION_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  RESOURCE_LIMIT_ERROR: 'RESOURCE_LIMIT_ERROR',
  REQUEST_HANDLING_ERROR: 'REQUEST_HANDLING_ERROR',
} as const;