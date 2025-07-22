/**
 * Mock server registry for managing server instances
 * Provides centralized storage and lookup for active mock servers
 */

import { MockServerRegistry, MockServerInstance, PortAllocator } from './types.js';

/**
 * Implementation of mock server registry
 */
export class MockServerRegistryImpl implements MockServerRegistry {
  public readonly instances = new Map<string, MockServerInstance>();
  public readonly portAllocator: PortAllocator;

  constructor(portAllocator: PortAllocator) {
    this.portAllocator = portAllocator;
  }

  /**
   * Add a server instance to the registry
   */
  add(instance: MockServerInstance): void {
    this.instances.set(instance.id, instance);
  }

  /**
   * Remove a server instance from the registry
   */
  remove(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      // Release the port back to the allocator
      this.portAllocator.release(instance.port);
      this.instances.delete(id);
    }
  }

  /**
   * Get a server instance by ID
   */
  get(id: string): MockServerInstance | undefined {
    return this.instances.get(id);
  }

  /**
   * Get all server instances
   */
  getAll(): MockServerInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Get server instance by port
   */
  getByPort(port: number): MockServerInstance | undefined {
    for (const instance of this.instances.values()) {
      if (instance.port === port) {
        return instance;
      }
    }
    return undefined;
  }

  /**
   * Get server instances by API ID
   */
  getByApiId(apiId: string): MockServerInstance[] {
    const results: MockServerInstance[] = [];
    for (const instance of this.instances.values()) {
      if (instance.apiId === apiId) {
        results.push(instance);
      }
    }
    return results;
  }

  /**
   * Check if a server ID exists
   */
  has(id: string): boolean {
    return this.instances.has(id);
  }

  /**
   * Get count of active servers
   */
  count(): number {
    return this.instances.size;
  }

  /**
   * Clear all servers
   */
  clear(): void {
    // Release all allocated ports
    for (const instance of this.instances.values()) {
      this.portAllocator.release(instance.port);
    }
    this.instances.clear();
  }

  /**
   * Get servers by status
   */
  getByStatus(status: MockServerInstance['status']): MockServerInstance[] {
    const results: MockServerInstance[] = [];
    for (const instance of this.instances.values()) {
      if (instance.status === status) {
        results.push(instance);
      }
    }
    return results;
  }

  /**
   * Get running servers count
   */
  getRunningCount(): number {
    return this.getByStatus('running').length;
  }

  /**
   * Get server statistics
   */
  getStatistics(): {
    totalServers: number;
    runningServers: number;
    stoppedServers: number;
    errorServers: number;
    totalRequests: number;
    totalErrors: number;
  } {
    const instances = this.getAll();
    
    return {
      totalServers: instances.length,
      runningServers: this.getByStatus('running').length,
      stoppedServers: this.getByStatus('stopped').length,
      errorServers: this.getByStatus('error').length,
      totalRequests: instances.reduce((sum, instance) => sum + instance.requestCount, 0),
      totalErrors: instances.reduce((sum, instance) => sum + instance.errorCount, 0),
    };
  }

  /**
   * Find servers that need cleanup (stopped or error status)
   */
  getServersNeedingCleanup(): MockServerInstance[] {
    return this.getAll().filter(instance => 
      instance.status === 'stopped' || instance.status === 'error'
    );
  }

  /**
   * Update server status
   */
  updateServerStatus(id: string, status: MockServerInstance['status']): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.status = status;
    }
  }

  /**
   * Increment request count for a server
   */
  incrementRequestCount(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.requestCount++;
    }
  }

  /**
   * Increment error count for a server
   */
  incrementErrorCount(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.errorCount++;
    }
  }
}