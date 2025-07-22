/**
 * Mock server manager for lifecycle management
 * Handles creation, startup, shutdown, and cleanup of mock server instances
 */

import { 
  MockServerManager, 
  MockServerConfig, 
  MockServerInstance, 
  MockServerRegistry
} from './types.js';
import { MockServerRegistryImpl } from './registry.js';
import { MockServerPortAllocator } from './port-allocator.js';
import { 
  MockServerError,
  ServerNotFoundError, 
  ServerShutdownError,
  ResourceLimitError,
  ConfigurationError,
  MockServerErrorFactory
} from './errors.js';
import { randomUUID } from 'crypto';

/**
 * Configuration for the mock server manager
 */
export interface MockServerManagerConfig {
  /** Maximum number of concurrent servers */
  maxInstances?: number;
  /** Port range for allocation */
  portRange?: { start: number; end: number };
  /** Default response delay */
  defaultResponseDelay?: number;
  /** Enable CORS by default */
  defaultEnableCors?: boolean;
}

/**
 * Implementation of mock server manager
 */
export class MockServerManagerImpl implements MockServerManager {
  private readonly registry: MockServerRegistry;
  private readonly config: Required<MockServerManagerConfig>;
  private isShuttingDown = false;

  constructor(config: MockServerManagerConfig = {}) {
    this.config = {
      maxInstances: config.maxInstances || parseInt(process.env.MOCK_SERVER_MAX_INSTANCES || '10', 10),
      portRange: config.portRange || {
        start: parseInt(process.env.MOCK_SERVER_PORT_RANGE_START || '3000', 10),
        end: parseInt(process.env.MOCK_SERVER_PORT_RANGE_END || '4000', 10),
      },
      defaultResponseDelay: config.defaultResponseDelay || parseInt(process.env.MOCK_SERVER_DEFAULT_DELAY || '0', 10),
      defaultEnableCors: config.defaultEnableCors ?? (process.env.MOCK_SERVER_ENABLE_CORS !== 'false'),
    };

    const portAllocator = new MockServerPortAllocator(this.config.portRange);
    this.registry = new MockServerRegistryImpl(portAllocator);
  }

  /**
   * Create and start a new mock server
   */
  async createServer(config: MockServerConfig): Promise<MockServerInstance> {
    if (this.isShuttingDown) {
      throw new MockServerError('Cannot create server during shutdown', 'SHUTDOWN_IN_PROGRESS');
    }

    // Validate configuration
    this.validateConfig(config);

    // Check resource limits
    if (this.registry.count() >= this.config.maxInstances) {
      throw new ResourceLimitError('mock servers', this.config.maxInstances, this.registry.count());
    }

    // Generate unique server ID
    const serverId = `mock-server-${randomUUID()}`;

    try {
      // Allocate port
      const port = await this.registry.portAllocator.allocate(config.port);

      // Create server instance
      const instance: MockServerInstance = {
        id: serverId,
        apiId: config.apiId,
        port,
        baseUrl: `http://localhost:${port}`,
        status: 'starting',
        config: {
          ...config,
          port,
          enableLogging: config.enableLogging ?? true,
          responseDelay: config.responseDelay ?? this.config.defaultResponseDelay,
          authValidation: config.authValidation ?? true,
          enableCors: config.enableCors ?? this.config.defaultEnableCors,
        },
        startTime: new Date(),
        requestCount: 0,
        errorCount: 0,
        server: null, // Will be set when Express server is created
        endpoints: [], // Will be populated from OpenAPI spec
      };

      // Add to registry
      this.registry.add(instance);

      // TODO: In the next task, we'll create the actual Express server
      // For now, we'll simulate the server creation
      instance.status = 'running';
      instance.server = { 
        listening: true,
        close: (callback?: (error?: Error) => void) => {
          if (callback) {
            setImmediate(() => callback());
          }
        },
      }; // Placeholder

      return instance;

    } catch (error) {
      // Clean up on failure
      if (this.registry.has(serverId)) {
        this.registry.remove(serverId);
      }

      if (error instanceof MockServerError) {
        throw error;
      }

      throw MockServerErrorFactory.fromStartupError(serverId, config.port || 0, error);
    }
  }

  /**
   * Stop a specific mock server
   */
  async stopServer(serverId: string): Promise<void> {
    const instance = this.registry.get(serverId);
    if (!instance) {
      throw new ServerNotFoundError(serverId);
    }

    if (instance.status === 'stopped') {
      return; // Already stopped
    }

    try {
      // Update status to stopping
      this.registry.updateServerStatus(serverId, 'stopping');

      // TODO: In the next task, we'll properly close the Express server
      // For now, we'll simulate the shutdown
      if (instance.server && typeof instance.server.close === 'function') {
        await new Promise<void>((resolve, reject) => {
          instance.server.close((error: any) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }

      // Update status to stopped
      this.registry.updateServerStatus(serverId, 'stopped');

    } catch (error) {
      // Mark as error state
      this.registry.updateServerStatus(serverId, 'error');
      
      if (error instanceof MockServerError) {
        throw error;
      }

      throw new ServerShutdownError(serverId, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Stop all mock servers
   */
  async stopAllServers(): Promise<void> {
    const instances = this.registry.getAll();
    const stopPromises = instances
      .filter(instance => instance.status !== 'stopped')
      .map(instance => this.stopServer(instance.id));

    // Wait for all servers to stop, but don't fail if some fail
    const results = await Promise.allSettled(stopPromises);
    
    // Log any failures but don't throw
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      // Use proper logging instead of console
      // TODO: Replace with proper logger when available
      // console.warn(`Failed to stop ${failures.length} mock servers during shutdown`);
    }
  }

  /**
   * Get server status
   */
  getServerStatus(serverId: string): MockServerInstance | undefined {
    return this.registry.get(serverId);
  }

  /**
   * List all active servers
   */
  listServers(): MockServerInstance[] {
    return this.registry.getAll();
  }

  /**
   * Get server by port
   */
  getServerByPort(port: number): MockServerInstance | undefined {
    return this.registry.getByPort(port);
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    this.isShuttingDown = true;

    try {
      // Stop all servers
      await this.stopAllServers();

      // Clear registry
      this.registry.clear();

    } finally {
      this.isShuttingDown = false;
    }
  }

  /**
   * Get manager statistics
   */
  getStatistics() {
    return {
      ...this.registry.getStatistics(),
      maxInstances: this.config.maxInstances,
      portRange: this.config.portRange,
      allocatedPorts: this.registry.portAllocator.getAllocated(),
    };
  }

  /**
   * Get servers by API ID
   */
  getServersByApiId(apiId: string): MockServerInstance[] {
    return this.registry.getByApiId(apiId);
  }

  /**
   * Check if manager is healthy
   */
  isHealthy(): boolean {
    return !this.isShuttingDown && this.registry.count() < this.config.maxInstances;
  }

  /**
   * Validate server configuration
   */
  private validateConfig(config: MockServerConfig): void {
    if (!config.apiId || typeof config.apiId !== 'string') {
      throw new ConfigurationError('apiId', config.apiId, 'API ID must be a non-empty string');
    }

    if (config.port !== undefined) {
      if (!Number.isInteger(config.port) || config.port < 1024 || config.port > 65535) {
        throw new ConfigurationError('port', config.port, 'Port must be an integer between 1024 and 65535');
      }
    }

    if (config.responseDelay !== undefined) {
      if (!Number.isInteger(config.responseDelay) || config.responseDelay < 0) {
        throw new ConfigurationError('responseDelay', config.responseDelay, 'Response delay must be a non-negative integer');
      }
    }

    if (config.errorSimulation?.errorProbability !== undefined) {
      const prob = config.errorSimulation.errorProbability;
      if (typeof prob !== 'number' || prob < 0 || prob > 1) {
        throw new ConfigurationError('errorSimulation.errorProbability', prob, 'Error probability must be a number between 0 and 1');
      }
    }
  }

  /**
   * Perform cleanup of stopped/error servers
   */
  async performMaintenance(): Promise<void> {
    const serversNeedingCleanup = this.registry.getServersNeedingCleanup();
    
    for (const server of serversNeedingCleanup) {
      try {
        // Remove from registry (this also releases the port)
        this.registry.remove(server.id);
      } catch (error) {
        // Use proper logging instead of console
        // TODO: Replace with proper logger when available
        // console.warn(`Failed to cleanup server ${server.id}:`, error);
      }
    }
  }

  /**
   * Get registry instance (for testing)
   */
  getRegistry(): MockServerRegistry {
    return this.registry;
  }
}