import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { 
  PathValidator,
  FileValidator,
  CacheValidator,
  URLValidator,
  APIDataValidator,
  DataValidator,
  validateAndSanitize
} from '../../../src/utils/validation.js';
import { ValidationError } from '../../../src/utils/errors.js';
import { VALIDATION, FILE_EXTENSIONS } from '../../../src/utils/constants.js';

// Mock modules
jest.mock('../../../src/utils/errors.js', () => {
  const actualModule = jest.requireActual('../../../src/utils/errors.js') as any;
  return {
    ...actualModule,
    ErrorHandler: {
      logError: jest.fn()
    }
  };
});

describe('PathValidator - Extended Coverage', () => {
  describe('validatePath', () => {
    test('should accept valid paths', () => {
      const validPaths = [
        'test.json',
        'folder/file.yaml',
        'deep/nested/path/file.yml',
        'file-with-dashes.json',
        'file_with_underscores.yaml',
        'file123.json'
      ];

      validPaths.forEach(path => {
        expect(() => PathValidator.validatePath(path)).not.toThrow();
      });
    });

    test('should reject empty paths', () => {
      expect(() => PathValidator.validatePath('')).toThrow(ValidationError);
      expect(() => PathValidator.validatePath('')).toThrow('Path cannot be empty');
    });

    test('should reject paths that are too long', () => {
      const longPath = 'a'.repeat(VALIDATION.MAX_PATH_LENGTH + 1);
      expect(() => PathValidator.validatePath(longPath)).toThrow(ValidationError);
      expect(() => PathValidator.validatePath(longPath)).toThrow(`Path too long (max ${VALIDATION.MAX_PATH_LENGTH} characters)`);
    });

    test('should reject paths with path traversal attempts', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        'folder/../../../secret',
        '~/sensitive/file',
        'folder/..\\..\\windows',
        '..file.json',
        'folder..//file'
      ];

      maliciousPaths.forEach(path => {
        expect(() => PathValidator.validatePath(path)).toThrow('Path traversal detected');
      });
    });

    test('should reject paths with invalid characters', () => {
      const invalidPaths = [
        'file<script>.json',
        'file|pipe.yaml',
        'file?question.yaml',
        'file*asterisk.json',
        'file"quote.yaml',
        'file>greater.json',
        'file\0null.yaml',
        'file\ttab.json',
        'file\nnewline.yaml',
        'file@at.json',
        'file#hash.yaml',
        'file$dollar.json',
        'file%percent.yaml',
        'file&ampersand.json',
        'file=equals.yaml',
        'file+plus.json',
        'file{brace.yaml',
        'file}brace.json',
        'file[bracket.yaml',
        'file]bracket.json',
        'file;semicolon.yaml',
        'file\'quote.json',
        'file,comma.yaml',
        'file space.json'
      ];

      invalidPaths.forEach(path => {
        expect(() => PathValidator.validatePath(path)).toThrow('Path contains invalid characters');
      });
    });

    test('should reject absolute paths not in allowed directories', () => {
      const disallowedPaths = [
        '/etc/passwd',
        '/root/.ssh/id_rsa',
        '/usr/bin/secret',
        '/opt/sensitive/data.json'
      ];

      disallowedPaths.forEach(path => {
        expect(() => PathValidator.validatePath(path)).toThrow('Absolute path not allowed');
      });
    });

    test('should accept absolute paths in allowed directories', () => {
      const allowedPaths = [
        '/tmp/test.json',
        '/var/tmp/file.yaml',
        `${process.cwd()}/test.json`,
        `${require('os').homedir()}/cache/file.yaml`
      ];

      allowedPaths.forEach(path => {
        expect(() => PathValidator.validatePath(path)).not.toThrow();
      });
    });
  });

  describe('sanitizePath', () => {
    test('should sanitize paths properly', () => {
      expect(PathValidator.sanitizePath('../test.json')).toBe('/test.json');
      expect(PathValidator.sanitizePath('File With Spaces.yaml')).toBe('file_with_spaces.yaml');
      expect(PathValidator.sanitizePath('file<>:"|?*.json')).toBe('file.json');
      expect(PathValidator.sanitizePath('UPPERCASE.JSON')).toBe('uppercase.json');
      expect(PathValidator.sanitizePath('multiple   spaces.yaml')).toBe('multiple_spaces.yaml');
      expect(PathValidator.sanitizePath('../../etc/passwd')).toBe('//etc/passwd');
      expect(PathValidator.sanitizePath('file:with:colons.json')).toBe('filewithcolons.json');
    });
  });

  describe('validateFileExtension', () => {
    test('should accept allowed extensions', () => {
      expect(() => PathValidator.validateFileExtension('file.json', FILE_EXTENSIONS.OPENAPI))
        .not.toThrow();
      expect(() => PathValidator.validateFileExtension('file.yaml', FILE_EXTENSIONS.OPENAPI))
        .not.toThrow();
      expect(() => PathValidator.validateFileExtension('file.yml', FILE_EXTENSIONS.OPENAPI))
        .not.toThrow();
    });

    test('should reject disallowed extensions', () => {
      expect(() => PathValidator.validateFileExtension('file.txt', FILE_EXTENSIONS.OPENAPI))
        .toThrow(ValidationError);
      expect(() => PathValidator.validateFileExtension('file.txt', FILE_EXTENSIONS.OPENAPI))
        .toThrow('Invalid file extension. Allowed: .json, .yaml, .yml');
    });

    test('should handle uppercase extensions', () => {
      expect(() => PathValidator.validateFileExtension('file.JSON', FILE_EXTENSIONS.OPENAPI))
        .not.toThrow();
      expect(() => PathValidator.validateFileExtension('file.YAML', FILE_EXTENSIONS.OPENAPI))
        .not.toThrow();
    });

    test('should handle files without extensions', () => {
      expect(() => PathValidator.validateFileExtension('file', FILE_EXTENSIONS.OPENAPI))
        .toThrow('Invalid file extension');
    });
  });
});

describe('FileValidator - Extended Coverage', () => {
  describe('validateFileSize', () => {
    test('should accept valid file sizes', () => {
      const validSizes = [
        1024, // 1KB
        1024 * 1024, // 1MB
        10 * 1024 * 1024, // 10MB
        VALIDATION.MAX_FILE_SIZE_MB * 1024 * 1024 - 1 // Just under max
      ];

      validSizes.forEach(size => {
        expect(() => FileValidator.validateFileSize(size)).not.toThrow();
      });
    });

    test('should reject files that are too large', () => {
      const largeSize = (VALIDATION.MAX_FILE_SIZE_MB + 1) * 1024 * 1024;
      expect(() => FileValidator.validateFileSize(largeSize))
        .toThrow(`File too large (${VALIDATION.MAX_FILE_SIZE_MB + 1}MB). Maximum allowed: ${VALIDATION.MAX_FILE_SIZE_MB}MB`);
    });

    test('should reject files that are too small', () => {
      const smallSizes = [0, 1, VALIDATION.MIN_SPEC_SIZE_BYTES - 1];
      
      smallSizes.forEach(size => {
        expect(() => FileValidator.validateFileSize(size))
          .toThrow(`File too small (${size} bytes). Minimum required: ${VALIDATION.MIN_SPEC_SIZE_BYTES} bytes`);
      });
    });

    test('should accept custom max size', () => {
      const customMaxMB = 5;
      const customMaxBytes = customMaxMB * 1024 * 1024;
      
      expect(() => FileValidator.validateFileSize(customMaxBytes - 1, customMaxMB)).not.toThrow();
      expect(() => FileValidator.validateFileSize(customMaxBytes + 1, customMaxMB))
        .toThrow(`File too large (${customMaxMB}MB). Maximum allowed: ${customMaxMB}MB`);
    });
  });

  describe('validateOpenAPIFile', () => {
    test('should validate complete OpenAPI file', () => {
      expect(() => FileValidator.validateOpenAPIFile('api.json', 1024 * 1024)).not.toThrow();
      expect(() => FileValidator.validateOpenAPIFile('spec.yaml', 2 * 1024 * 1024)).not.toThrow();
    });

    test('should reject invalid paths', () => {
      expect(() => FileValidator.validateOpenAPIFile('../../../api.json', 1024))
        .toThrow('Path traversal detected');
    });

    test('should reject invalid extensions', () => {
      expect(() => FileValidator.validateOpenAPIFile('api.txt', 1024))
        .toThrow('Invalid file extension');
    });

    test('should reject invalid file sizes', () => {
      expect(() => FileValidator.validateOpenAPIFile('api.json', 10))
        .toThrow('File too small');
    });
  });

  describe('validateOpenAPIContent', () => {
    test('should validate valid OpenAPI content', () => {
      const validSpecs = [
        {
          openapi: '3.0.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {}
        },
        {
          swagger: '2.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {}
        }
      ];

      validSpecs.forEach(spec => {
        expect(() => FileValidator.validateOpenAPIContent(spec)).not.toThrow();
      });
    });

    test('should validate JSON string content', () => {
      const jsonContent = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' }
      });

      expect(() => FileValidator.validateOpenAPIContent(jsonContent)).not.toThrow();
    });

    test('should reject invalid JSON string', () => {
      expect(() => FileValidator.validateOpenAPIContent('{ invalid json'))
        .toThrow('Invalid JSON content');
    });

    test('should reject non-object content', () => {
      expect(() => FileValidator.validateOpenAPIContent(null))
        .toThrow('Invalid OpenAPI content: must be an object');
      expect(() => FileValidator.validateOpenAPIContent('string'))
        .toThrow('Invalid JSON content');
      expect(() => FileValidator.validateOpenAPIContent(123))
        .toThrow('Invalid OpenAPI content: must be an object');
    });

    test('should reject missing version field', () => {
      expect(() => FileValidator.validateOpenAPIContent({
        info: { title: 'Test' }
      })).toThrow('Invalid OpenAPI content: missing version field');
    });

    test('should reject missing info field', () => {
      expect(() => FileValidator.validateOpenAPIContent({
        openapi: '3.0.0'
      })).toThrow('Invalid OpenAPI content: missing info field');
    });

    test('should reject missing title in info', () => {
      expect(() => FileValidator.validateOpenAPIContent({
        openapi: '3.0.0',
        info: { version: '1.0.0' }
      })).toThrow('Invalid OpenAPI content: missing title in info');
    });

    test('should reject invalid paths field', () => {
      expect(() => FileValidator.validateOpenAPIContent({
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: 'invalid'
      })).toThrow('Invalid OpenAPI content: paths must be an object');
    });

    test('should reject invalid components field', () => {
      expect(() => FileValidator.validateOpenAPIContent({
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        components: 'invalid'
      })).toThrow('Invalid OpenAPI content: components must be an object');
    });
  });
});

describe('Additional edge cases', () => {
  describe('CacheValidator error handling', () => {
    test('should handle circular references in generateIntegrityHash', () => {
      const circular: any = { a: 1 };
      circular.self = circular;
      
      expect(() => CacheValidator.generateIntegrityHash(circular)).toThrow();
    });

    test('should handle non-object data in validateCacheEntry', () => {
      expect(CacheValidator.validateCacheEntry('key', 'string')).toBe(false);
      expect(CacheValidator.validateCacheEntry('key', 123)).toBe(false);
      expect(CacheValidator.validateCacheEntry('key', true)).toBe(false);
    });
  });

  describe('DataValidator edge cases', () => {
    test('should handle empty provider data array', () => {
      const result = DataValidator.validateProviders({ data: [] });
      expect(result.isValid).toBe(true);
      expect(result.data.data).toEqual([]);
    });

    test('should handle providers with object toString representation', () => {
      const result = DataValidator.validateProviders({
        data: [{ toString: () => '[object Object]' }]
      });
      expect(result.warnings).toContain('Skipped unparseable object at index 0');
    });

    test('should handle empty search results', () => {
      const result = DataValidator.validateSearchResults({
        results: [],
        pagination: {
          page: 1,
          limit: 20,
          total_results: 0,
          total_pages: 0,
          has_next: false,
          has_previous: false
        }
      });
      expect(result.isValid).toBe(true);
      expect(result.data.results).toEqual([]);
    });

    test('should handle missing search results fields', () => {
      const result = DataValidator.validateSearchResults({});
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Search results.results must be an array, using empty array');
    });
  });

  describe('DataValidator.logValidationResults', () => {
    test('should log errors when present', () => {
      const { ErrorHandler } = require('../../../src/utils/errors.js');
      
      const result = {
        isValid: false,
        data: {},
        errors: ['Error 1', 'Error 2'],
        warnings: []
      };

      DataValidator.logValidationResults(result, 'test-source');
      
      expect(ErrorHandler.logError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: 'Validation errors in test-source',
        context: { errors: ['Error 1', 'Error 2'] }
      }));
    });

    test('should log warnings when present', () => {
      const { ErrorHandler } = require('../../../src/utils/errors.js');
      
      const result = {
        isValid: true,
        data: {},
        errors: [],
        warnings: ['Warning 1', 'Warning 2']
      };

      DataValidator.logValidationResults(result, 'test-source');
      
      expect(ErrorHandler.logError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'VALIDATION_WARNING',
        message: 'Validation warnings in test-source',
        context: { warnings: ['Warning 1', 'Warning 2'] }
      }));
    });
  });

  describe('validateAndSanitize function', () => {
    test('should validate and return sanitized data', () => {
      const mockValidator = jest.fn().mockReturnValue({
        isValid: true,
        data: { sanitized: 'data' },
        errors: [],
        warnings: []
      });

      const result = validateAndSanitize({ raw: 'data' }, mockValidator, 'test-source');
      
      expect(result).toEqual({ sanitized: 'data' });
      expect(mockValidator).toHaveBeenCalledWith({ raw: 'data' });
    });

    test('should log validation results', () => {
      const { ErrorHandler } = require('../../../src/utils/errors.js');
      jest.clearAllMocks();
      
      const mockValidator = jest.fn().mockReturnValue({
        isValid: false,
        data: { sanitized: 'data' },
        errors: ['Test error'],
        warnings: ['Test warning']
      });

      validateAndSanitize({ raw: 'data' }, mockValidator, 'test-validate');
      
      expect(ErrorHandler.logError).toHaveBeenCalledTimes(2); // Once for errors, once for warnings
    });
  });
});