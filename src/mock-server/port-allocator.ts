/**
 * Port allocation and management for mock servers
 * Handles automatic port assignment and conflict resolution
 */

import { PortAllocator } from './types.js';
import { PortAllocationError, PortInUseError } from './errors.js';
import { createServer } from 'net';

/**
 * Default port range for mock servers
 */
const DEFAULT_PORT_RANGE = {
  start: parseInt(process.env.MOCK_SERVER_PORT_RANGE_START || '3000', 10),
  end: parseInt(process.env.MOCK_SERVER_PORT_RANGE_END || '4000', 10),
};

/**
 * Implementation of port allocator for mock servers
 */
export class MockServerPortAllocator implements PortAllocator {
  private allocatedPorts = new Set<number>();
  private readonly portRange: { start: number; end: number };

  constructor(portRange = DEFAULT_PORT_RANGE) {
    this.portRange = portRange;
    
    // Validate port range
    if (portRange.start >= portRange.end) {
      throw new Error('Port range start must be less than end');
    }
    
    if (portRange.start < 1024 || portRange.end > 65535) {
      throw new Error('Port range must be between 1024 and 65535');
    }
  }

  /**
   * Allocate an available port
   */
  async allocate(preferredPort?: number): Promise<number> {
    // If a preferred port is specified, try to use it first
    if (preferredPort !== undefined) {
      if (await this.isAvailable(preferredPort)) {
        this.allocatedPorts.add(preferredPort);
        return preferredPort;
      } else {
        throw new PortInUseError(preferredPort);
      }
    }

    // Find an available port in the range
    for (let port = this.portRange.start; port < this.portRange.end; port++) {
      if (!this.allocatedPorts.has(port) && await this.isAvailable(port)) {
        this.allocatedPorts.add(port);
        return port;
      }
    }

    throw new PortAllocationError(
      0, 
      `No available ports in range ${this.portRange.start}-${this.portRange.end}`
    );
  }

  /**
   * Release a port back to the pool
   */
  release(port: number): void {
    this.allocatedPorts.delete(port);
  }

  /**
   * Check if a port is available
   */
  async isAvailable(port: number): Promise<boolean> {
    // If we've already allocated this port, it's not available
    if (this.allocatedPorts.has(port)) {
      return false;
    }

    return new Promise((resolve) => {
      const server = createServer();
      
      server.listen(port, 'localhost', () => {
        server.close(() => {
          resolve(true);
        });
      });

      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Get all allocated ports
   */
  getAllocated(): number[] {
    return Array.from(this.allocatedPorts);
  }

  /**
   * Get port range configuration
   */
  getRange(): { start: number; end: number } {
    return { ...this.portRange };
  }

  /**
   * Clear all allocated ports (for cleanup)
   */
  clear(): void {
    this.allocatedPorts.clear();
  }

  /**
   * Get count of allocated ports
   */
  getCount(): number {
    return this.allocatedPorts.size;
  }

  /**
   * Check if a port is allocated by this allocator
   */
  isAllocated(port: number): boolean {
    return this.allocatedPorts.has(port);
  }
}