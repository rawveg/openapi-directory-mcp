import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Logger, LogLevel } from '../../../src/utils/logger.js';

describe('Logger', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Store original environment
    originalEnv = process.env.LOG_LEVEL;
    
    // Mock console methods
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    // Restore mocks
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleLogSpy.mockRestore();
    
    // Restore environment
    if (originalEnv !== undefined) {
      process.env.LOG_LEVEL = originalEnv;
    } else {
      delete process.env.LOG_LEVEL;
    }
  });

  describe('LogLevel enum', () => {
    test('should have correct numeric values', () => {
      expect(LogLevel.ERROR).toBe(0);
      expect(LogLevel.WARN).toBe(1);
      expect(LogLevel.INFO).toBe(2);
      expect(LogLevel.DEBUG).toBe(3);
    });
  });

  describe('log level configuration', () => {
    test('should default to WARN in production environment', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.LOG_LEVEL;
      
      // Reset the logger to pick up new environment
      Logger.setLogLevel(Logger['getLogLevelFromEnv']());
      
      Logger.error('error message');
      Logger.warn('warn message');
      Logger.info('info message');
      Logger.debug('debug message');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warn message');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should default to DEBUG in development environment', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.LOG_LEVEL;
      
      Logger.setLogLevel(Logger['getLogLevelFromEnv']());
      
      Logger.error('error message');
      Logger.warn('warn message');
      Logger.info('info message');
      Logger.debug('debug message');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warn message');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] info message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG] debug message');
    });

    test('should respect explicit LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'ERROR';
      
      Logger.setLogLevel(Logger['getLogLevelFromEnv']());
      
      Logger.error('error message');
      Logger.warn('warn message');
      Logger.info('info message');
      Logger.debug('debug message');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should handle invalid LOG_LEVEL values', () => {
      process.env.LOG_LEVEL = 'INVALID';
      process.env.NODE_ENV = 'production';
      
      Logger.setLogLevel(Logger['getLogLevelFromEnv']());
      
      Logger.error('error message');
      Logger.warn('warn message');
      Logger.info('info message');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] error message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warn message');
      expect(consoleInfoSpy).not.toHaveBeenCalled(); // Should default to WARN in production
    });
  });

  describe('error logging', () => {
    beforeEach(() => {
      Logger.setLogLevel(LogLevel.DEBUG);
    });

    test('should log error messages', () => {
      Logger.error('Test error message');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error message');
    });

    test('should log error with additional arguments', () => {
      const errorObj = new Error('Test error');
      Logger.error('Error occurred:', errorObj, { context: 'test' });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR] Error occurred:',
        errorObj,
        { context: 'test' }
      );
    });

    test('should not log when level is below ERROR', () => {
      // This shouldn't happen in practice since ERROR is 0, but test edge case
      Logger.setLogLevel(-1 as LogLevel);
      
      Logger.error('Test error message');
      
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('warn logging', () => {
    test('should log warn messages when level is WARN or higher', () => {
      Logger.setLogLevel(LogLevel.WARN);
      
      Logger.warn('Test warning message');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Test warning message');
    });

    test('should not log warn messages when level is below WARN', () => {
      Logger.setLogLevel(LogLevel.ERROR);
      
      Logger.warn('Test warning message');
      
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('should log warn with additional arguments', () => {
      Logger.setLogLevel(LogLevel.WARN);
      
      Logger.warn('Warning occurred:', { data: 'test' }, 'extra info');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[WARN] Warning occurred:',
        { data: 'test' },
        'extra info'
      );
    });
  });

  describe('info logging', () => {
    test('should log info messages when level is INFO or higher', () => {
      Logger.setLogLevel(LogLevel.INFO);
      
      Logger.info('Test info message');
      
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Test info message');
    });

    test('should not log info messages when level is below INFO', () => {
      Logger.setLogLevel(LogLevel.WARN);
      
      Logger.info('Test info message');
      
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });
  });

  describe('debug logging', () => {
    test('should log debug messages when level is DEBUG', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      
      Logger.debug('Test debug message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG] Test debug message');
    });

    test('should not log debug messages when level is below DEBUG', () => {
      Logger.setLogLevel(LogLevel.INFO);
      
      Logger.debug('Test debug message');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('cache logging', () => {
    test('should log cache operations when level is DEBUG', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      
      Logger.cache('hit', 'test-key');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[CACHE] hit: test-key');
    });

    test('should log cache operations with details', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      
      Logger.cache('set', 'test-key', { ttl: '300s' });
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[CACHE] set: test-key - {"ttl":"300s"}');
    });

    test('should log cache operations without key', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      
      Logger.cache('clear');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[CACHE] clear: ');
    });

    test('should not log cache operations when level is below DEBUG', () => {
      Logger.setLogLevel(LogLevel.INFO);
      
      Logger.cache('hit', 'test-key');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should sanitize long cache keys', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      
      const longKey = 'a'.repeat(100);
      Logger.cache('hit', longKey);
      
      const expectedSanitized = 'a'.repeat(20) + '...' + 'a'.repeat(20);
      expect(consoleLogSpy).toHaveBeenCalledWith(`[CACHE] hit: ${expectedSanitized}`);
    });

    test('should not sanitize short cache keys', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      
      const shortKey = 'short-key';
      Logger.cache('hit', shortKey);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[CACHE] hit: short-key');
    });

    test('should handle undefined key gracefully', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      
      Logger.cache('operation', undefined);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[CACHE] operation: ');
    });
  });

  describe('setLogLevel', () => {
    test('should update the log level dynamically', () => {
      Logger.setLogLevel(LogLevel.ERROR);
      
      Logger.warn('This should not appear');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      
      Logger.setLogLevel(LogLevel.WARN);
      
      Logger.warn('This should appear');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] This should appear');
    });
  });

  describe('sanitizeKey', () => {
    test('should sanitize keys exactly at 50 character boundary', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      
      const fiftyCharKey = 'a'.repeat(50);
      Logger.cache('test', fiftyCharKey);
      
      // Should not be sanitized at exactly 50 chars
      expect(consoleLogSpy).toHaveBeenCalledWith(`[CACHE] test: ${fiftyCharKey}`);
    });

    test('should sanitize keys over 50 characters', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      
      const fiftyOneCharKey = 'a'.repeat(51);
      Logger.cache('test', fiftyOneCharKey);
      
      const expectedSanitized = 'a'.repeat(20) + '...' + 'a'.repeat(20);
      expect(consoleLogSpy).toHaveBeenCalledWith(`[CACHE] test: ${expectedSanitized}`);
    });
  });

  describe('edge cases', () => {
    test('should handle null and undefined arguments', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      
      expect(() => {
        Logger.error('Error:', null, undefined);
        Logger.warn('Warn:', null);
        Logger.info('Info:', undefined);
        Logger.debug('Debug:', null, undefined);
      }).not.toThrow();
    });

    test('should handle empty string messages', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      
      Logger.error('');
      Logger.warn('');
      Logger.info('');
      Logger.debug('');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] ');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] ');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] ');
      expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG] ');
    });

    test('should handle complex object serialization in cache details', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      
      const complexObject = {
        nested: { data: 'value' },
        array: [1, 2, 3],
        circular: null as any
      };
      complexObject.circular = complexObject; // Create circular reference
      
      // Should throw on circular reference since JSON.stringify is used directly
      expect(() => {
        Logger.cache('test', 'key', complexObject);
      }).toThrow('Converting circular structure to JSON');
    });
  });

  describe('getLogLevelFromEnv internal method', () => {
    test('should return DEBUG for development environment', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.LOG_LEVEL;
      
      const level = Logger['getLogLevelFromEnv']();
      expect(level).toBe(LogLevel.DEBUG);
    });

    test('should return WARN for production environment', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.LOG_LEVEL;
      
      const level = Logger['getLogLevelFromEnv']();
      expect(level).toBe(LogLevel.WARN);
    });

    test('should return DEBUG for unknown environment', () => {
      process.env.NODE_ENV = 'staging';
      delete process.env.LOG_LEVEL;
      
      const level = Logger['getLogLevelFromEnv']();
      expect(level).toBe(LogLevel.DEBUG); // Defaults to DEBUG for non-production
    });

    test('should prioritize LOG_LEVEL over NODE_ENV', () => {
      process.env.NODE_ENV = 'development';
      process.env.LOG_LEVEL = 'ERROR';
      
      const level = Logger['getLogLevelFromEnv']();
      expect(level).toBe(LogLevel.ERROR);
    });

    test('should handle all valid LOG_LEVEL values', () => {
      const validLevels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
      
      validLevels.forEach((levelStr, index) => {
        process.env.LOG_LEVEL = levelStr;
        const level = Logger['getLogLevelFromEnv']();
        expect(level).toBe(index);
      });
    });

    test('should fall back to NODE_ENV behavior for invalid LOG_LEVEL', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'INVALID_LEVEL';
      
      const level = Logger['getLogLevelFromEnv']();
      expect(level).toBe(LogLevel.WARN);
    });
  });

  describe('sanitizeKey internal method', () => {
    test('should handle exactly 50 character keys', () => {
      const fiftyCharKey = 'a'.repeat(50);
      const sanitized = Logger['sanitizeKey'](fiftyCharKey);
      expect(sanitized).toBe(fiftyCharKey); // Should not be truncated
    });

    test('should handle keys over 50 characters', () => {
      const longKey = 'a'.repeat(60);
      const sanitized = Logger['sanitizeKey'](longKey);
      expect(sanitized).toBe('a'.repeat(20) + '...' + 'a'.repeat(20));
    });

    test('should handle keys under 50 characters', () => {
      const shortKey = 'short';
      const sanitized = Logger['sanitizeKey'](shortKey);
      expect(sanitized).toBe('short');
    });

    test('should handle empty key', () => {
      const sanitized = Logger['sanitizeKey']('');
      expect(sanitized).toBe('');
    });

    test('should handle mixed character keys correctly', () => {
      const mixedKey = 'prefix' + '_'.repeat(50) + 'suffix';
      const sanitized = Logger['sanitizeKey'](mixedKey);
      const expected = 'prefix' + '_'.repeat(14) + '...' + '_'.repeat(14) + 'suffix';
      expect(sanitized).toBe(expected);
    });
  });

  describe('log level thresholds', () => {
    test('should respect ERROR level threshold (most restrictive)', () => {
      Logger.setLogLevel(LogLevel.ERROR);
      
      Logger.error('error message');
      Logger.warn('warn message'); 
      Logger.info('info message');
      Logger.debug('debug message');
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(0);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(0);
      expect(consoleLogSpy).toHaveBeenCalledTimes(0);
    });

    test('should respect WARN level threshold', () => {
      Logger.setLogLevel(LogLevel.WARN);
      
      Logger.error('error message');
      Logger.warn('warn message');
      Logger.info('info message');
      Logger.debug('debug message');
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(0);
      expect(consoleLogSpy).toHaveBeenCalledTimes(0);
    });

    test('should respect INFO level threshold', () => {
      Logger.setLogLevel(LogLevel.INFO);
      
      Logger.error('error message');
      Logger.warn('warn message');
      Logger.info('info message');
      Logger.debug('debug message');
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledTimes(0);
    });

    test('should respect DEBUG level threshold (most permissive)', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      
      Logger.error('error message');
      Logger.warn('warn message');
      Logger.info('info message');
      Logger.debug('debug message');
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });
});