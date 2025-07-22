/**
 * Unit tests for MockServerPortAllocator
 * Tests port allocation, conflict resolution, and resource management
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MockServerPortAllocator } from '../../../src/mock-server/port-allocator.js';
import { PortInUseError, PortAllocationError } from '../../../src/mock-server/errors.js';

describe('MockServerPortAllocator', () => {
  let allocator: MockServerPortAllocator;
  const testPortRange = { start: 9000, end: 9010 };

  beforeEach(() => {
    allocator = new MockServerPortAllocator(testPortRange);
  });

  afterEach(() => {
    allocator.clear();
  });

  describe('constructor', () => {
    it('should create allocator with default port range', () => {
      const defaultAllocator = new MockServerPortAllocator();
      const range = defaultAllocator.getRange();
      
      expect(range.start).toBeGreaterThanOrEqual(3000);
      expect(range.end).toBeGreaterThan(range.start);
    });

    it('should create allocator with custom port range', () => {
      const range = allocator.getRange();
      
      expect(range.start).toBe(9000);
      expect(range.end).toBe(9010);
    });

    it('should throw error for invalid port range', () => {
      expect(() => {
        new MockServerPortAllocator({ start: 9010, end: 9000 });
      }).toThrow('Port range start must be less than end');
    });

    it('should throw error for port range below 1024', () => {
      expect(() => {
        new MockServerPortAllocator({ start: 500, end: 1000 });
      }).toThrow('Port range must be between 1024 and 65535');
    });

    it('should throw error for port range above 65535', () => {
      expect(() => {
        new MockServerPortAllocator({ start: 65536, end: 65540 });
      }).toThrow('Port range must be between 1024 and 65535');
    });
  });

  describe('allocate', () => {
    it('should allocate first available port when no preference', async () => {
      const port = await allocator.allocate();
      
      expect(port).toBeGreaterThanOrEqual(testPortRange.start);
      expect(port).toBeLessThan(testPortRange.end);
      expect(allocator.isAllocated(port)).toBe(true);
    });

    it('should allocate preferred port when available', async () => {
      const preferredPort = 9005;
      const port = await allocator.allocate(preferredPort);
      
      expect(port).toBe(preferredPort);
      expect(allocator.isAllocated(port)).toBe(true);
    });

    it('should throw PortInUseError when preferred port is already allocated', async () => {
      const preferredPort = 9005;
      await allocator.allocate(preferredPort);
      
      await expect(allocator.allocate(preferredPort)).rejects.toThrow(PortInUseError);
    });

    it('should allocate multiple different ports', async () => {
      const port1 = await allocator.allocate();
      const port2 = await allocator.allocate();
      const port3 = await allocator.allocate();
      
      expect(port1).not.toBe(port2);
      expect(port2).not.toBe(port3);
      expect(port1).not.toBe(port3);
      
      expect(allocator.isAllocated(port1)).toBe(true);
      expect(allocator.isAllocated(port2)).toBe(true);
      expect(allocator.isAllocated(port3)).toBe(true);
    });

    it('should throw PortAllocationError when no ports available', async () => {
      // Allocate all ports in the small range
      const ports: number[] = [];
      for (let i = testPortRange.start; i < testPortRange.end; i++) {
        const port = await allocator.allocate();
        ports.push(port);
      }
      
      expect(ports).toHaveLength(testPortRange.end - testPortRange.start);
      
      await expect(allocator.allocate()).rejects.toThrow(PortAllocationError);
    });
  });

  describe('release', () => {
    it('should release allocated port', async () => {
      const port = await allocator.allocate();
      expect(allocator.isAllocated(port)).toBe(true);
      
      allocator.release(port);
      expect(allocator.isAllocated(port)).toBe(false);
    });

    it('should allow reallocation of released port', async () => {
      const port = await allocator.allocate();
      allocator.release(port);
      
      const newPort = await allocator.allocate(port);
      expect(newPort).toBe(port);
    });

    it('should handle release of non-allocated port gracefully', () => {
      expect(() => {
        allocator.release(9999);
      }).not.toThrow();
    });
  });

  describe('isAvailable', () => {
    it('should return true for available port', async () => {
      const available = await allocator.isAvailable(9005);
      expect(available).toBe(true);
    });

    it('should return false for allocated port', async () => {
      const port = await allocator.allocate(9005);
      const available = await allocator.isAvailable(port);
      expect(available).toBe(false);
    });
  });

  describe('getAllocated', () => {
    it('should return empty array initially', () => {
      const allocated = allocator.getAllocated();
      expect(allocated).toEqual([]);
    });

    it('should return allocated ports', async () => {
      const port1 = await allocator.allocate();
      const port2 = await allocator.allocate();
      
      const allocated = allocator.getAllocated();
      expect(allocated).toContain(port1);
      expect(allocated).toContain(port2);
      expect(allocated).toHaveLength(2);
    });

    it('should not include released ports', async () => {
      const port1 = await allocator.allocate();
      const port2 = await allocator.allocate();
      
      allocator.release(port1);
      
      const allocated = allocator.getAllocated();
      expect(allocated).not.toContain(port1);
      expect(allocated).toContain(port2);
      expect(allocated).toHaveLength(1);
    });
  });

  describe('getRange', () => {
    it('should return port range configuration', () => {
      const range = allocator.getRange();
      expect(range).toEqual(testPortRange);
    });

    it('should return copy of range (not reference)', () => {
      const range = allocator.getRange();
      range.start = 1000;
      
      const newRange = allocator.getRange();
      expect(newRange.start).toBe(testPortRange.start);
    });
  });

  describe('clear', () => {
    it('should clear all allocated ports', async () => {
      await allocator.allocate();
      await allocator.allocate();
      
      expect(allocator.getAllocated()).toHaveLength(2);
      
      allocator.clear();
      expect(allocator.getAllocated()).toHaveLength(0);
    });
  });

  describe('getCount', () => {
    it('should return zero initially', () => {
      expect(allocator.getCount()).toBe(0);
    });

    it('should return count of allocated ports', async () => {
      await allocator.allocate();
      expect(allocator.getCount()).toBe(1);
      
      await allocator.allocate();
      expect(allocator.getCount()).toBe(2);
    });

    it('should decrease count when ports are released', async () => {
      const port = await allocator.allocate();
      expect(allocator.getCount()).toBe(1);
      
      allocator.release(port);
      expect(allocator.getCount()).toBe(0);
    });
  });

  describe('isAllocated', () => {
    it('should return false for non-allocated port', () => {
      expect(allocator.isAllocated(9005)).toBe(false);
    });

    it('should return true for allocated port', async () => {
      const port = await allocator.allocate(9005);
      expect(allocator.isAllocated(port)).toBe(true);
    });

    it('should return false for released port', async () => {
      const port = await allocator.allocate(9005);
      allocator.release(port);
      expect(allocator.isAllocated(port)).toBe(false);
    });
  });
});