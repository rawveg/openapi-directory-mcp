import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MCPLogger } from '../../../src/utils/mcp-logger.js';

describe('MCPLogger', () => {
  let originalArgv: string[];
  let originalEnv: NodeJS.ProcessEnv;
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;
  let consoleInfoSpy: jest.SpiedFunction<typeof console.info>;
  let consoleDebugSpy: jest.SpiedFunction<typeof console.debug>;

  beforeEach(() => {
    // Save original values
    originalArgv = process.argv;
    originalEnv = { ...process.env };

    // Reset spies
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    // Restore original values
    process.argv = originalArgv;
    process.env = originalEnv;
    
    // Restore all spies
    jest.restoreAllMocks();
  });

  describe('MCP mode detection', () => {
    test('should detect MCP mode when no arguments', () => {
      process.argv = ['/usr/bin/node', '/path/to/script.js'];
      delete process.env.MCP_DISABLE_LOGGING;

      MCPLogger.log('test message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should detect CLI mode when arguments present', () => {
      process.argv = ['/usr/bin/node', '/path/to/script.js', 'import'];
      delete process.env.MCP_DISABLE_LOGGING;

      MCPLogger.log('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('test message');
    });

    test('should respect MCP_DISABLE_LOGGING environment variable', () => {
      process.argv = ['/usr/bin/node', '/path/to/script.js'];
      process.env.MCP_DISABLE_LOGGING = 'true';

      MCPLogger.log('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('test message');
    });
  });

  describe('logging methods', () => {
    beforeEach(() => {
      // Set CLI mode for testing logging
      process.argv = ['/usr/bin/node', '/path/to/script.js', 'test'];
      delete process.env.MCP_DISABLE_LOGGING;
    });

    test('should log messages in CLI mode', () => {
      MCPLogger.log('log message');
      expect(consoleLogSpy).toHaveBeenCalledWith('log message');
    });

    test('should log errors in CLI mode', () => {
      MCPLogger.error('error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('error message');
    });

    test('should log warnings in CLI mode', () => {
      MCPLogger.warn('warn message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('warn message');
    });

    test('should log info in CLI mode', () => {
      MCPLogger.info('info message');
      expect(consoleInfoSpy).toHaveBeenCalledWith('info message');
    });

    test('should log debug in CLI mode', () => {
      MCPLogger.debug('debug message');
      expect(consoleDebugSpy).toHaveBeenCalledWith('debug message');
    });

    test('should handle multiple arguments', () => {
      MCPLogger.log('message', { data: 'value' }, 123);
      expect(consoleLogSpy).toHaveBeenCalledWith('message', { data: 'value' }, 123);
    });
  });

  describe('initializeMCPCompliance', () => {
    test('should override console methods in MCP mode', () => {
      process.argv = ['/usr/bin/node', '/path/to/script.js'];
      delete process.env.MCP_DISABLE_LOGGING;

      // Store original console methods
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      const originalInfo = console.info;
      const originalDebug = console.debug;

      MCPLogger.initializeMCPCompliance();

      // Console methods should be replaced with no-op functions
      expect(console.log).not.toBe(originalLog);
      expect(console.error).not.toBe(originalError);
      expect(console.warn).not.toBe(originalWarn);
      expect(console.info).not.toBe(originalInfo);
      expect(console.debug).not.toBe(originalDebug);

      // Verify they are no-op functions
      expect(console.log.toString()).toMatch(/\(\)\s*=>\s*\{\s*\}/);
    });

    test('should not override console methods in CLI mode', () => {
      process.argv = ['/usr/bin/node', '/path/to/script.js', 'cli-arg'];
      delete process.env.MCP_DISABLE_LOGGING;

      // Store original console methods
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      const originalInfo = console.info;
      const originalDebug = console.debug;

      MCPLogger.initializeMCPCompliance();

      // Console methods should remain unchanged
      expect(console.log).toBe(originalLog);
      expect(console.error).toBe(originalError);
      expect(console.warn).toBe(originalWarn);
      expect(console.info).toBe(originalInfo);
      expect(console.debug).toBe(originalDebug);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      // Set CLI mode for testing
      process.argv = ['/usr/bin/node', '/path/to/script.js', 'test'];
    });

    test('should handle undefined and null arguments', () => {
      MCPLogger.log(undefined);
      MCPLogger.log(null);
      MCPLogger.log();

      expect(consoleLogSpy).toHaveBeenCalledWith(undefined);
      expect(consoleLogSpy).toHaveBeenCalledWith(null);
      expect(consoleLogSpy).toHaveBeenCalledWith();
    });

    test('should handle complex objects', () => {
      const complexObj = {
        nested: { data: [1, 2, 3] },
        fn: () => 'function',
        symbol: Symbol('test')
      };

      MCPLogger.log(complexObj);
      expect(consoleLogSpy).toHaveBeenCalledWith(complexObj);
    });
  });
});