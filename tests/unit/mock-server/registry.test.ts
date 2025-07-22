/**
 * Unit tests for MockServerRegistryImpl
 * Tests server instance management and registry operations
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { MockServerRegistryImpl } from '../../../src/mock-server/registry.js';
import { MockServerPortAllocator } from '../../../src/mock-server/port-allocator.js';
import { MockServerInstance } from '../../../src/mock-server/types.js';

describe('MockServerRegistryImpl', () => {
  let registry: MockServerRegistryImpl;
  let portAllocator: MockServerPortAllocator;

  const createMockInstance = (overrides: Partial<MockServerInstance> = {}): MockServerInstance => ({
    id: `test-server-${Date.now()}-${Math.random()}`,
    apiId: 'test-api',
    port: 3000,
    baseUrl: 'http://localhost:3000',
    status: 'running',
    config: {
      apiId: 'test-api',
      enableLogging: true,
      responseDelay: 0,
      authValidation: true,
      enableCors: true,
    },
    startTime: new Date(),
    requestCount: 0,
    errorCount: 0,
    server: { listening: true },
    endpoints: [],
    ...overrides,
  });

  beforeEach(() => {
    portAllocator = new MockServerPortAllocator({ start: 9000, end: 9010 });
    registry = new MockServerRegistryImpl(portAllocator);
  });

  describe('constructor', () => {
    it('should create registry with port allocator', () => {
      expect(registry.portAllocator).toBe(portAllocator);
      expect(registry.instances).toBeInstanceOf(Map);
      expect(registry.instances.size).toBe(0);
    });
  });

  describe('add', () => {
    it('should add server instance to registry', () => {
      const instance = createMockInstance();
      
      registry.add(instance);
      
      expect(registry.instances.has(instance.id)).toBe(true);
      expect(registry.instances.get(instance.id)).toBe(instance);
    });

    it('should allow adding multiple instances', () => {
      const instance1 = createMockInstance({ id: 'server-1' });
      const instance2 = createMockInstance({ id: 'server-2' });
      
      registry.add(instance1);
      registry.add(instance2);
      
      expect(registry.instances.size).toBe(2);
      expect(registry.instances.get('server-1')).toBe(instance1);
      expect(registry.instances.get('server-2')).toBe(instance2);
    });

    it('should overwrite existing instance with same ID', () => {
      const instance1 = createMockInstance({ id: 'server-1', port: 3000 });
      const instance2 = createMockInstance({ id: 'server-1', port: 3001 });
      
      registry.add(instance1);
      registry.add(instance2);
      
      expect(registry.instances.size).toBe(1);
      expect(registry.instances.get('server-1')).toBe(instance2);
      expect(registry.instances.get('server-1')?.port).toBe(3001);
    });
  });

  describe('remove', () => {
    it('should remove server instance from registry', () => {
      const instance = createMockInstance({ id: 'server-1' });
      registry.add(instance);
      
      registry.remove('server-1');
      
      expect(registry.instances.has('server-1')).toBe(false);
      expect(registry.instances.size).toBe(0);
    });

    it('should release port when removing instance', async () => {
      const port = await portAllocator.allocate();
      const instance = createMockInstance({ id: 'server-1', port });
      registry.add(instance);
      
      expect(portAllocator.isAllocated(port)).toBe(true);
      
      registry.remove('server-1');
      
      expect(portAllocator.isAllocated(port)).toBe(false);
    });

    it('should handle removal of non-existent instance gracefully', () => {
      expect(() => {
        registry.remove('non-existent');
      }).not.toThrow();
    });
  });

  describe('get', () => {
    it('should return server instance by ID', () => {
      const instance = createMockInstance({ id: 'server-1' });
      registry.add(instance);
      
      const retrieved = registry.get('server-1');
      
      expect(retrieved).toBe(instance);
    });

    it('should return undefined for non-existent ID', () => {
      const retrieved = registry.get('non-existent');
      
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return empty array when no instances', () => {
      const instances = registry.getAll();
      
      expect(instances).toEqual([]);
    });

    it('should return all server instances', () => {
      const instance1 = createMockInstance({ id: 'server-1' });
      const instance2 = createMockInstance({ id: 'server-2' });
      
      registry.add(instance1);
      registry.add(instance2);
      
      const instances = registry.getAll();
      
      expect(instances).toHaveLength(2);
      expect(instances).toContain(instance1);
      expect(instances).toContain(instance2);
    });
  });

  describe('getByPort', () => {
    it('should return server instance by port', () => {
      const instance = createMockInstance({ id: 'server-1', port: 3000 });
      registry.add(instance);
      
      const retrieved = registry.getByPort(3000);
      
      expect(retrieved).toBe(instance);
    });

    it('should return undefined for non-existent port', () => {
      const retrieved = registry.getByPort(9999);
      
      expect(retrieved).toBeUndefined();
    });

    it('should return first instance when multiple instances exist (edge case)', () => {
      const instance1 = createMockInstance({ id: 'server-1', port: 3000 });
      const instance2 = createMockInstance({ id: 'server-2', port: 3000 });
      
      registry.add(instance1);
      registry.add(instance2);
      
      const retrieved = registry.getByPort(3000);
      
      expect(retrieved).toBeDefined();
      expect([instance1, instance2]).toContain(retrieved);
    });
  });

  describe('getByApiId', () => {
    it('should return empty array when no instances match', () => {
      const instances = registry.getByApiId('non-existent-api');
      
      expect(instances).toEqual([]);
    });

    it('should return instances matching API ID', () => {
      const instance1 = createMockInstance({ id: 'server-1', apiId: 'api-1' });
      const instance2 = createMockInstance({ id: 'server-2', apiId: 'api-2' });
      const instance3 = createMockInstance({ id: 'server-3', apiId: 'api-1' });
      
      registry.add(instance1);
      registry.add(instance2);
      registry.add(instance3);
      
      const instances = registry.getByApiId('api-1');
      
      expect(instances).toHaveLength(2);
      expect(instances).toContain(instance1);
      expect(instances).toContain(instance3);
      expect(instances).not.toContain(instance2);
    });
  });

  describe('has', () => {
    it('should return true for existing server ID', () => {
      const instance = createMockInstance({ id: 'server-1' });
      registry.add(instance);
      
      expect(registry.has('server-1')).toBe(true);
    });

    it('should return false for non-existent server ID', () => {
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('count', () => {
    it('should return zero when no instances', () => {
      expect(registry.count()).toBe(0);
    });

    it('should return count of instances', () => {
      const instance1 = createMockInstance({ id: 'server-1' });
      const instance2 = createMockInstance({ id: 'server-2' });
      
      registry.add(instance1);
      expect(registry.count()).toBe(1);
      
      registry.add(instance2);
      expect(registry.count()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all instances', () => {
      const instance1 = createMockInstance({ id: 'server-1' });
      const instance2 = createMockInstance({ id: 'server-2' });
      
      registry.add(instance1);
      registry.add(instance2);
      
      registry.clear();
      
      expect(registry.count()).toBe(0);
      expect(registry.instances.size).toBe(0);
    });

    it('should release all allocated ports', async () => {
      const port1 = await portAllocator.allocate();
      const port2 = await portAllocator.allocate();
      
      const instance1 = createMockInstance({ id: 'server-1', port: port1 });
      const instance2 = createMockInstance({ id: 'server-2', port: port2 });
      
      registry.add(instance1);
      registry.add(instance2);
      
      expect(portAllocator.isAllocated(port1)).toBe(true);
      expect(portAllocator.isAllocated(port2)).toBe(true);
      
      registry.clear();
      
      expect(portAllocator.isAllocated(port1)).toBe(false);
      expect(portAllocator.isAllocated(port2)).toBe(false);
    });
  });

  describe('getByStatus', () => {
    it('should return instances with matching status', () => {
      const instance1 = createMockInstance({ id: 'server-1', status: 'running' });
      const instance2 = createMockInstance({ id: 'server-2', status: 'stopped' });
      const instance3 = createMockInstance({ id: 'server-3', status: 'running' });
      
      registry.add(instance1);
      registry.add(instance2);
      registry.add(instance3);
      
      const runningInstances = registry.getByStatus('running');
      
      expect(runningInstances).toHaveLength(2);
      expect(runningInstances).toContain(instance1);
      expect(runningInstances).toContain(instance3);
      expect(runningInstances).not.toContain(instance2);
    });

    it('should return empty array when no instances match status', () => {
      const instance = createMockInstance({ status: 'running' });
      registry.add(instance);
      
      const stoppedInstances = registry.getByStatus('stopped');
      
      expect(stoppedInstances).toEqual([]);
    });
  });

  describe('getRunningCount', () => {
    it('should return count of running instances', () => {
      const instance1 = createMockInstance({ id: 'server-1', status: 'running' });
      const instance2 = createMockInstance({ id: 'server-2', status: 'stopped' });
      const instance3 = createMockInstance({ id: 'server-3', status: 'running' });
      
      registry.add(instance1);
      registry.add(instance2);
      registry.add(instance3);
      
      expect(registry.getRunningCount()).toBe(2);
    });
  });

  describe('getStatistics', () => {
    it('should return comprehensive statistics', () => {
      const instance1 = createMockInstance({ 
        id: 'server-1', 
        status: 'running',
        requestCount: 10,
        errorCount: 1
      });
      const instance2 = createMockInstance({ 
        id: 'server-2', 
        status: 'stopped',
        requestCount: 5,
        errorCount: 0
      });
      const instance3 = createMockInstance({ 
        id: 'server-3', 
        status: 'error',
        requestCount: 3,
        errorCount: 2
      });
      
      registry.add(instance1);
      registry.add(instance2);
      registry.add(instance3);
      
      const stats = registry.getStatistics();
      
      expect(stats).toEqual({
        totalServers: 3,
        runningServers: 1,
        stoppedServers: 1,
        errorServers: 1,
        totalRequests: 18,
        totalErrors: 3,
      });
    });
  });

  describe('getServersNeedingCleanup', () => {
    it('should return servers with stopped or error status', () => {
      const instance1 = createMockInstance({ id: 'server-1', status: 'running' });
      const instance2 = createMockInstance({ id: 'server-2', status: 'stopped' });
      const instance3 = createMockInstance({ id: 'server-3', status: 'error' });
      const instance4 = createMockInstance({ id: 'server-4', status: 'starting' });
      
      registry.add(instance1);
      registry.add(instance2);
      registry.add(instance3);
      registry.add(instance4);
      
      const needingCleanup = registry.getServersNeedingCleanup();
      
      expect(needingCleanup).toHaveLength(2);
      expect(needingCleanup).toContain(instance2);
      expect(needingCleanup).toContain(instance3);
      expect(needingCleanup).not.toContain(instance1);
      expect(needingCleanup).not.toContain(instance4);
    });
  });

  describe('updateServerStatus', () => {
    it('should update status of existing server', () => {
      const instance = createMockInstance({ id: 'server-1', status: 'starting' });
      registry.add(instance);
      
      registry.updateServerStatus('server-1', 'running');
      
      const updated = registry.get('server-1');
      expect(updated?.status).toBe('running');
    });

    it('should handle update of non-existent server gracefully', () => {
      expect(() => {
        registry.updateServerStatus('non-existent', 'running');
      }).not.toThrow();
    });
  });

  describe('incrementRequestCount', () => {
    it('should increment request count for existing server', () => {
      const instance = createMockInstance({ id: 'server-1', requestCount: 5 });
      registry.add(instance);
      
      registry.incrementRequestCount('server-1');
      
      const updated = registry.get('server-1');
      expect(updated?.requestCount).toBe(6);
    });

    it('should handle increment for non-existent server gracefully', () => {
      expect(() => {
        registry.incrementRequestCount('non-existent');
      }).not.toThrow();
    });
  });

  describe('incrementErrorCount', () => {
    it('should increment error count for existing server', () => {
      const instance = createMockInstance({ id: 'server-1', errorCount: 2 });
      registry.add(instance);
      
      registry.incrementErrorCount('server-1');
      
      const updated = registry.get('server-1');
      expect(updated?.errorCount).toBe(3);
    });

    it('should handle increment for non-existent server gracefully', () => {
      expect(() => {
        registry.incrementErrorCount('non-existent');
      }).not.toThrow();
    });
  });
});