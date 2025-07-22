/**
 * Unit tests for MockServerManagerImpl
 * Tests server lifecycle management, configuration validation, and resource management
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MockServerManagerImpl } from '../../../src/mock-server/manager.js';
import { 
  MockServerConfig, 
  MockServerInstance 
} from '../../../src/mock-server/types.js';
import { 
  ServerNotFoundError,
  ConfigurationError,
  ResourceLimitError,
  MockServerError
} from '../../../src/mock-server/errors.js';

describe('MockServerManagerImpl', () => {
  let manager: MockServerManagerImpl;

  const createValidConfig = (overrides: Partial<MockServerConfig> = {}): MockServerConfig => ({
    apiId: 'test-api',
    enableLogging: true,
    responseDelay: 0,
    authValidation: true,
    enableCors: true,
    ...overrides,
  });

  beforeEach(() => {
    manager = new MockServerManagerImpl({
      maxInstances: 3,
      portRange: { start: 9000, end: 9010 },
      defaultResponseDelay: 0,
      defaultEnableCors: true,
    });
  });

  afterEach(async () => {
    await manager.cleanup();
  });

  describe('constructor', () => {
    it('should create manager with default configuration', () => {
      const defaultManager = new MockServerManagerImpl();
      const stats = defaultManager.getStatistics();
      
      expect(stats.maxInstances).toBeGreaterThan(0);
      expect(stats.portRange.start).toBeGreaterThan(0);
      expect(stats.portRange.end).toBeGreaterThan(stats.portRange.start);
    });

    it('should create manager with custom configuration', () => {
      const stats = manager.getStatistics();
      
      expect(stats.maxInstances).toBe(3);
      expect(stats.portRange.start).toBe(9000);
      expect(stats.portRange.end).toBe(9010);
    });

    it('should respect environment variables', () => {
      const originalEnv = process.env;
      process.env.MOCK_SERVER_MAX_INSTANCES = '5';
      process.env.MOCK_SERVER_PORT_RANGE_START = '8000';
      process.env.MOCK_SERVER_PORT_RANGE_END = '8100';
      
      const envManager = new MockServerManagerImpl();
      const stats = envManager.getStatistics();
      
      expect(stats.maxInstances).toBe(5);
      expect(stats.portRange.start).toBe(8000);
      expect(stats.portRange.end).toBe(8100);
      
      process.env = originalEnv;
    });
  });

  describe('createServer', () => {
    it('should create server with valid configuration', async () => {
      const config = createValidConfig();
      
      const instance = await manager.createServer(config);
      
      expect(instance).toBeDefined();
      expect(instance.id).toMatch(/^mock-server-/);
      expect(instance.apiId).toBe(config.apiId);
      expect(instance.status).toBe('running');
      expect(instance.port).toBeGreaterThanOrEqual(9000);
      expect(instance.port).toBeLessThan(9010);
      expect(instance.baseUrl).toBe(`http://localhost:${instance.port}`);
      expect(instance.startTime).toBeInstanceOf(Date);
      expect(instance.requestCount).toBe(0);
      expect(instance.errorCount).toBe(0);
    });

    it('should create server with preferred port', async () => {
      const config = createValidConfig({ port: 9005 });
      
      const instance = await manager.createServer(config);
      
      expect(instance.port).toBe(9005);
    });

    it('should create server with default configuration values', async () => {
      const config = createValidConfig({
        enableLogging: undefined,
        responseDelay: undefined,
        authValidation: undefined,
        enableCors: undefined,
      });
      
      const instance = await manager.createServer(config);
      
      expect(instance.config.enableLogging).toBe(true);
      expect(instance.config.responseDelay).toBe(0);
      expect(instance.config.authValidation).toBe(true);
      expect(instance.config.enableCors).toBe(true);
    });

    it('should add server to registry', async () => {
      const config = createValidConfig();
      
      const instance = await manager.createServer(config);
      
      const retrieved = manager.getServerStatus(instance.id);
      expect(retrieved).toBe(instance);
    });

    it('should create multiple servers with different ports', async () => {
      const config1 = createValidConfig({ apiId: 'api-1' });
      const config2 = createValidConfig({ apiId: 'api-2' });
      
      const instance1 = await manager.createServer(config1);
      const instance2 = await manager.createServer(config2);
      
      expect(instance1.port).not.toBe(instance2.port);
      expect(instance1.id).not.toBe(instance2.id);
    });

    it('should throw ResourceLimitError when max instances reached', async () => {
      const config = createValidConfig();
      
      // Create maximum number of instances
      await manager.createServer(createValidConfig({ apiId: 'api-1' }));
      await manager.createServer(createValidConfig({ apiId: 'api-2' }));
      await manager.createServer(createValidConfig({ apiId: 'api-3' }));
      
      // Fourth instance should fail
      await expect(manager.createServer(config)).rejects.toThrow(ResourceLimitError);
    });

    it('should throw ConfigurationError for invalid API ID', async () => {
      const config = createValidConfig({ apiId: '' });
      
      await expect(manager.createServer(config)).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for invalid port', async () => {
      const config = createValidConfig({ port: 999 });
      
      await expect(manager.createServer(config)).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for invalid response delay', async () => {
      const config = createValidConfig({ responseDelay: -1 });
      
      await expect(manager.createServer(config)).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for invalid error probability', async () => {
      const config = createValidConfig({ 
        errorSimulation: { 
          enabled: true, 
          errorProbability: 1.5 
        } 
      });
      
      await expect(manager.createServer(config)).rejects.toThrow(ConfigurationError);
    });

    it('should throw MockServerError during shutdown', async () => {
      // Start shutdown process
      const cleanupPromise = manager.cleanup();
      
      // Try to create server during shutdown
      const config = createValidConfig();
      await expect(manager.createServer(config)).rejects.toThrow(MockServerError);
      
      await cleanupPromise;
    });
  });

  describe('stopServer', () => {
    it('should stop running server', async () => {
      const config = createValidConfig();
      const instance = await manager.createServer(config);
      
      await manager.stopServer(instance.id);
      
      const updated = manager.getServerStatus(instance.id);
      expect(updated?.status).toBe('stopped');
    });

    it('should handle stopping already stopped server', async () => {
      const config = createValidConfig();
      const instance = await manager.createServer(config);
      
      await manager.stopServer(instance.id);
      
      // Should not throw when stopping again
      await expect(manager.stopServer(instance.id)).resolves.not.toThrow();
    });

    it('should throw ServerNotFoundError for non-existent server', async () => {
      await expect(manager.stopServer('non-existent')).rejects.toThrow(ServerNotFoundError);
    });

    it('should update server status during stop process', async () => {
      const config = createValidConfig();
      const instance = await manager.createServer(config);
      
      const stopPromise = manager.stopServer(instance.id);
      
      // Status should be updated to stopping during the process
      const stopping = manager.getServerStatus(instance.id);
      expect(stopping?.status).toBe('stopping');
      
      await stopPromise;
      
      const stopped = manager.getServerStatus(instance.id);
      expect(stopped?.status).toBe('stopped');
    });
  });

  describe('stopAllServers', () => {
    it('should stop all running servers', async () => {
      const config1 = createValidConfig({ apiId: 'api-1' });
      const config2 = createValidConfig({ apiId: 'api-2' });
      
      const instance1 = await manager.createServer(config1);
      const instance2 = await manager.createServer(config2);
      
      await manager.stopAllServers();
      
      const updated1 = manager.getServerStatus(instance1.id);
      const updated2 = manager.getServerStatus(instance2.id);
      
      expect(updated1?.status).toBe('stopped');
      expect(updated2?.status).toBe('stopped');
    });

    it('should handle empty server list', async () => {
      await expect(manager.stopAllServers()).resolves.not.toThrow();
    });

    it('should not fail if some servers fail to stop', async () => {
      const config = createValidConfig();
      const instance = await manager.createServer(config);
      
      // Manually set server to error state to simulate stop failure
      const registry = manager.getRegistry();
      registry.updateServerStatus(instance.id, 'error');
      
      // Should not throw even if some servers fail to stop
      await expect(manager.stopAllServers()).resolves.not.toThrow();
    });
  });

  describe('getServerStatus', () => {
    it('should return server instance for existing server', async () => {
      const config = createValidConfig();
      const instance = await manager.createServer(config);
      
      const status = manager.getServerStatus(instance.id);
      
      expect(status).toBe(instance);
    });

    it('should return undefined for non-existent server', () => {
      const status = manager.getServerStatus('non-existent');
      
      expect(status).toBeUndefined();
    });
  });

  describe('listServers', () => {
    it('should return empty array when no servers', () => {
      const servers = manager.listServers();
      
      expect(servers).toEqual([]);
    });

    it('should return all server instances', async () => {
      const config1 = createValidConfig({ apiId: 'api-1' });
      const config2 = createValidConfig({ apiId: 'api-2' });
      
      const instance1 = await manager.createServer(config1);
      const instance2 = await manager.createServer(config2);
      
      const servers = manager.listServers();
      
      expect(servers).toHaveLength(2);
      expect(servers).toContain(instance1);
      expect(servers).toContain(instance2);
    });
  });

  describe('getServerByPort', () => {
    it('should return server instance by port', async () => {
      const config = createValidConfig({ port: 9005 });
      const instance = await manager.createServer(config);
      
      const found = manager.getServerByPort(9005);
      
      expect(found).toBe(instance);
    });

    it('should return undefined for non-existent port', () => {
      const found = manager.getServerByPort(9999);
      
      expect(found).toBeUndefined();
    });
  });

  describe('cleanup', () => {
    it('should stop all servers and clear registry', async () => {
      const config1 = createValidConfig({ apiId: 'api-1' });
      const config2 = createValidConfig({ apiId: 'api-2' });
      
      await manager.createServer(config1);
      await manager.createServer(config2);
      
      expect(manager.listServers()).toHaveLength(2);
      
      await manager.cleanup();
      
      expect(manager.listServers()).toHaveLength(0);
    });

    it('should prevent new server creation during cleanup', async () => {
      const config = createValidConfig();
      
      const cleanupPromise = manager.cleanup();
      
      await expect(manager.createServer(config)).rejects.toThrow(MockServerError);
      
      await cleanupPromise;
    });
  });

  describe('getStatistics', () => {
    it('should return comprehensive statistics', async () => {
      const config1 = createValidConfig({ apiId: 'api-1' });
      const config2 = createValidConfig({ apiId: 'api-2' });
      
      await manager.createServer(config1);
      await manager.createServer(config2);
      
      const stats = manager.getStatistics();
      
      expect(stats.total).toBe(2);
      expect(stats.running).toBe(2);
      expect(stats.maxInstances).toBe(3);
      expect(stats.portRange).toEqual({ start: 9000, end: 9010 });
      expect(stats.allocatedPorts).toHaveLength(2);
    });
  });

  describe('getServersByApiId', () => {
    it('should return servers for specific API ID', async () => {
      const config1 = createValidConfig({ apiId: 'api-1' });
      const config2 = createValidConfig({ apiId: 'api-2' });
      const config3 = createValidConfig({ apiId: 'api-1' });
      
      const instance1 = await manager.createServer(config1);
      await manager.createServer(config2);
      const instance3 = await manager.createServer(config3);
      
      const servers = manager.getServersByApiId('api-1');
      
      expect(servers).toHaveLength(2);
      expect(servers).toContain(instance1);
      expect(servers).toContain(instance3);
    });

    it('should return empty array for non-existent API ID', () => {
      const servers = manager.getServersByApiId('non-existent');
      
      expect(servers).toEqual([]);
    });
  });

  describe('isHealthy', () => {
    it('should return true when healthy', () => {
      expect(manager.isHealthy()).toBe(true);
    });

    it('should return false when at max instances', async () => {
      // Create maximum number of instances
      await manager.createServer(createValidConfig({ apiId: 'api-1' }));
      await manager.createServer(createValidConfig({ apiId: 'api-2' }));
      await manager.createServer(createValidConfig({ apiId: 'api-3' }));
      
      expect(manager.isHealthy()).toBe(false);
    });

    it('should return false during shutdown', async () => {
      const cleanupPromise = manager.cleanup();
      
      expect(manager.isHealthy()).toBe(false);
      
      await cleanupPromise;
    });
  });

  describe('performMaintenance', () => {
    it('should clean up stopped and error servers', async () => {
      const config1 = createValidConfig({ apiId: 'api-1' });
      const config2 = createValidConfig({ apiId: 'api-2' });
      const config3 = createValidConfig({ apiId: 'api-3' });
      
      const instance1 = await manager.createServer(config1);
      const instance2 = await manager.createServer(config2);
      const instance3 = await manager.createServer(config3);
      
      // Stop some servers
      await manager.stopServer(instance1.id);
      
      // Manually set one to error state
      const registry = manager.getRegistry();
      registry.updateServerStatus(instance2.id, 'error');
      
      expect(manager.listServers()).toHaveLength(3);
      
      await manager.performMaintenance();
      
      // Should have removed stopped and error servers
      const remaining = manager.listServers();
      expect(remaining).toHaveLength(1);
      expect(remaining[0]).toBe(instance3);
    });

    it('should handle maintenance with no servers needing cleanup', async () => {
      const config = createValidConfig();
      await manager.createServer(config);
      
      await expect(manager.performMaintenance()).resolves.not.toThrow();
      
      expect(manager.listServers()).toHaveLength(1);
    });
  });

  describe('getRegistry', () => {
    it('should return registry instance', () => {
      const registry = manager.getRegistry();
      
      expect(registry).toBeDefined();
      expect(registry.instances).toBeInstanceOf(Map);
    });
  });
});