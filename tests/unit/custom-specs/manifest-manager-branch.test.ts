import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ManifestManager } from '../../../src/custom-specs/manifest-manager.js';
import { ValidationError } from '../../../src/utils/errors.js';
import { CustomSpecEntry } from '../../../src/custom-specs/types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock os module
jest.mock('os');
const mockedOs = os as jest.Mocked<typeof os>;

// Mock path module (for normalize and resolve)
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn((...args: string[]) => args.join('/')),
  dirname: jest.fn((path: string) => path.substring(0, path.lastIndexOf('/'))),
  resolve: jest.fn((...args: string[]) => {
    const joined = args.join('/');
    return joined.startsWith('/') ? joined : '/' + joined;
  }),
  normalize: jest.fn((path: string) => path)
}));

// Mock validation module
jest.mock('../../../src/utils/validation.js', () => ({
  PathValidator: {
    validatePath: jest.fn(),
    sanitizePath: jest.fn((path: string) => path),
    validateFileExtension: jest.fn()
  },
  FileValidator: {
    validateFileSize: jest.fn(),
    validateOpenAPIFile: jest.fn(),
    validateOpenAPIContent: jest.fn()
  }
}));

// No need to mock ErrorHandler - let it work normally

import { PathValidator, FileValidator } from '../../../src/utils/validation.js';
const mockedPathValidator = PathValidator as jest.Mocked<typeof PathValidator>;
const mockedFileValidator = FileValidator as jest.Mocked<typeof FileValidator>;

describe('ManifestManager - Branch Coverage', () => {
  let manifestManager: ManifestManager;
  let savedManifest: string | null = null;
  let originalEnv: NodeJS.ProcessEnv;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    savedManifest = null;
    originalEnv = { ...process.env };
    
    // Mock console methods
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    
    // Reset mocks
    mockedOs.homedir.mockReturnValue('/home/user');
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.mkdirSync.mockImplementation(() => {});
    mockedFs.readFileSync.mockImplementation((path) => {
      if (savedManifest && path.toString().includes('manifest.json')) {
        return savedManifest;
      }
      throw new Error('ENOENT: no such file or directory');
    });
    mockedFs.writeFileSync.mockImplementation((path, content) => {
      if (path.toString().includes('manifest.json')) {
        savedManifest = content.toString();
      }
    });
    mockedFs.unlinkSync.mockImplementation(() => {});
    mockedFs.statSync.mockImplementation(() => ({
      size: 1024,
      mtime: new Date()
    } as any));
    mockedFs.readdirSync.mockReturnValue([]);
    mockedFs.rmdirSync.mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  describe('initializePaths - branch coverage', () => {
    test('should handle path validation errors', () => {
      mockedPathValidator.validatePath.mockImplementation((path) => {
        if (path.includes('custom-specs')) {
          throw new ValidationError('Invalid path');
        }
      });

      // ErrorHandler wraps the error, so check for the wrapped error
      expect(() => new ManifestManager()).toThrow();
      
      // Reset the mock for subsequent tests
      mockedPathValidator.validatePath.mockReset();
    });

    test('should handle empty name or version in getSpecFile', () => {
      const manager = new ManifestManager();
      const paths = manager.getPaths();

      expect(() => paths.getSpecFile('', 'version')).toThrow('Name and version are required');
      expect(() => paths.getSpecFile('name', '')).toThrow('Name and version are required');
      expect(() => paths.getSpecFile('', '')).toThrow('Name and version are required');
    });

    test('should sanitize name and version with special characters', () => {
      const manager = new ManifestManager();
      const paths = manager.getPaths();

      const specPath = paths.getSpecFile('test@api#name$', 'v1.2.3-beta!');
      expect(specPath).toContain('test_api_name_');
      expect(specPath).toContain('v1.2.3-beta_');
    });
  });

  describe('loadManifest - branch coverage', () => {
    beforeEach(() => {
      // Reset path validator mock to not throw
      mockedPathValidator.validatePath.mockReset();
    });

    test('should handle manifest with missing version field', () => {
      mockedFs.existsSync.mockImplementation((path) => 
        path.toString().includes('manifest.json')
      );
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({
        specs: {},
        lastUpdated: '2023-01-01T00:00:00.000Z'
      }));

      const manager = new ManifestManager();
      const specs = manager.listSpecs();
      expect(specs).toEqual([]);
    });

    test('should handle manifest with missing specs field', () => {
      mockedFs.existsSync.mockImplementation((path) => 
        path.toString().includes('manifest.json')
      );
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({
        version: '1.0.0',
        lastUpdated: '2023-01-01T00:00:00.000Z'
      }));

      const manager = new ManifestManager();
      const specs = manager.listSpecs();
      expect(specs).toEqual([]);
    });

    test('should handle manifest with missing lastUpdated field', () => {
      mockedFs.existsSync.mockImplementation((path) => 
        path.toString().includes('manifest.json')
      );
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({
        version: '1.0.0',
        specs: {}
      }));

      const manager = new ManifestManager();
      const specs = manager.listSpecs();
      expect(specs).toEqual([]);
    });

    test('should handle path validation error when loading manifest', () => {
      let callCount = 0;
      mockedPathValidator.validatePath.mockImplementation((path) => {
        callCount++;
        // Allow initial paths, but fail on manifest file validation
        if (callCount > 3 && path.includes('manifest.json')) {
          throw new ValidationError('Invalid manifest path');
        }
      });

      const manager = new ManifestManager();
      const specs = manager.listSpecs();
      expect(specs).toEqual([]);
    });
  });

  describe('saveManifest - branch coverage', () => {
    beforeEach(() => {
      // Reset path validator mock to not throw by default
      mockedPathValidator.validatePath.mockReset();
    });

    test('should handle path validation error when saving', () => {
      const manager = new ManifestManager();
      
      mockedPathValidator.validatePath.mockImplementation((path) => {
        if (path.includes('manifest.json')) {
          throw new ValidationError('Invalid path for saving');
        }
      });

      const spec: CustomSpecEntry = {
        id: 'custom:test:1.0.0',
        name: 'test',
        version: '1.0.0',
        title: 'Test API',
        description: 'Test',
        originalFormat: 'json',
        sourceType: 'file',
        sourcePath: '/test.json',
        imported: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        fileSize: 1024
      };

      expect(() => manager.addSpec(spec)).toThrow();
    });

    test('should handle file size validation error', () => {
      const manager = new ManifestManager();
      
      mockedFileValidator.validateFileSize.mockImplementation(() => {
        throw new ValidationError('File too large');
      });

      const spec: CustomSpecEntry = {
        id: 'custom:test:1.0.0',
        name: 'test',
        version: '1.0.0',
        title: 'Test API',
        description: 'Test',
        originalFormat: 'json',
        sourceType: 'file',
        sourcePath: '/test.json',
        imported: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        fileSize: 1024
      };

      expect(() => manager.addSpec(spec)).toThrow();
    });
  });

  describe('addSpec - branch coverage', () => {
    beforeEach(() => {
      // Reset path validator mock to not throw
      mockedPathValidator.validatePath.mockReset();
    });

    test('should throw error when spec has no id', () => {
      const manager = new ManifestManager();
      
      const spec = {
        name: 'test',
        version: '1.0.0'
      } as any;

      expect(() => manager.addSpec(spec)).toThrow('Spec entry must have id, name, and version');
    });

    test('should throw error when spec has no name', () => {
      const manager = new ManifestManager();
      
      const spec = {
        id: 'custom:test:1.0.0',
        version: '1.0.0'
      } as any;

      expect(() => manager.addSpec(spec)).toThrow('Spec entry must have id, name, and version');
    });

    test('should throw error when spec has no version', () => {
      const manager = new ManifestManager();
      
      const spec = {
        id: 'custom:test:1.0.0',
        name: 'test'
      } as any;

      expect(() => manager.addSpec(spec)).toThrow('Spec entry must have id, name, and version');
    });
  });

  describe('storeSpecFile - branch coverage', () => {
    beforeEach(() => {
      // Reset path validator mock to not throw
      mockedPathValidator.validatePath.mockReset();
      // Reset file validator mocks too
      mockedFileValidator.validateFileSize.mockReset();
      mockedFileValidator.validateOpenAPIContent.mockReset();
    });

    test('should throw error when name is empty', () => {
      const manager = new ManifestManager();
      
      expect(() => manager.storeSpecFile('', '1.0.0', 'content'))
        .toThrow('Name, version, and content are required');
    });

    test('should throw error when version is empty', () => {
      const manager = new ManifestManager();
      
      expect(() => manager.storeSpecFile('test', '', 'content'))
        .toThrow('Name, version, and content are required');
    });

    test('should throw error when content is empty', () => {
      const manager = new ManifestManager();
      
      expect(() => manager.storeSpecFile('test', '1.0.0', ''))
        .toThrow('Name, version, and content are required');
    });

    test('should handle file size validation error', () => {
      const manager = new ManifestManager();
      
      mockedFileValidator.validateFileSize.mockImplementation(() => {
        throw new ValidationError('Content too large');
      });

      expect(() => manager.storeSpecFile('test', '1.0.0', 'content'))
        .toThrow();
    });

    test('should handle OpenAPI content validation error', () => {
      const manager = new ManifestManager();
      
      mockedFileValidator.validateOpenAPIContent.mockImplementation(() => {
        throw new ValidationError('Invalid OpenAPI content');
      });

      expect(() => manager.storeSpecFile('test', '1.0.0', 'content'))
        .toThrow();
    });

    test('should handle path validation error for spec directory', () => {
      const manager = new ManifestManager();
      
      // This will throw when validatePath is called on the spec directory path
      mockedPathValidator.validatePath.mockImplementation((path) => {
        if (path.includes('/custom/test/')) {
          throw new ValidationError('Invalid spec directory path');
        }
      });

      expect(() => manager.storeSpecFile('test', '1.0.0', '{"openapi": "3.0.0"}'))
        .toThrow();
    });

    test('should create directory if it does not exist', () => {
      const manager = new ManifestManager();
      
      mockedFs.existsSync.mockImplementation((path) => {
        // Directory doesn't exist
        if (path.toString().includes('/custom/test')) {
          return false;
        }
        return false;
      });

      manager.storeSpecFile('test', '1.0.0', '{"openapi": "3.0.0"}');
      
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('/custom/test'),
        { recursive: true }
      );
    });
  });

  describe('readSpecFile - branch coverage', () => {
    beforeEach(() => {
      // Reset path validator mock to not throw
      mockedPathValidator.validatePath.mockReset();
    });

    test('should throw error when name is empty', () => {
      const manager = new ManifestManager();
      
      expect(() => manager.readSpecFile('', '1.0.0'))
        .toThrow('Name and version are required');
    });

    test('should throw error when version is empty', () => {
      const manager = new ManifestManager();
      
      expect(() => manager.readSpecFile('test', ''))
        .toThrow('Name and version are required');
    });

    test('should throw error when file does not exist', () => {
      const manager = new ManifestManager();
      
      mockedFs.existsSync.mockReturnValue(false);

      expect(() => manager.readSpecFile('test', '1.0.0'))
        .toThrow('Spec file not found');
    });

    test('should handle path validation error', () => {
      const manager = new ManifestManager();
      
      mockedPathValidator.validatePath.mockImplementation((path) => {
        if (path.includes('test') && path.includes('1.0.0')) {
          throw new ValidationError('Invalid spec file path');
        }
      });

      expect(() => manager.readSpecFile('test', '1.0.0'))
        .toThrow();
    });
  });

  describe('deleteSpecFile - branch coverage', () => {
    beforeEach(() => {
      // Reset path validator mock to not throw
      mockedPathValidator.validatePath.mockReset();
    });

    test('should return false when name is empty', () => {
      const manager = new ManifestManager();
      
      const result = manager.deleteSpecFile('', '1.0.0');
      expect(result).toBe(false);
    });

    test('should return false when version is empty', () => {
      const manager = new ManifestManager();
      
      const result = manager.deleteSpecFile('test', '');
      expect(result).toBe(false);
    });

    test('should return false when file does not exist', () => {
      const manager = new ManifestManager();
      
      mockedFs.existsSync.mockReturnValue(false);

      const result = manager.deleteSpecFile('test', '1.0.0');
      expect(result).toBe(false);
    });

    test('should handle path validation error and return false', () => {
      const manager = new ManifestManager();
      
      mockedPathValidator.validatePath.mockImplementation((path) => {
        if (path.includes('test') && path.includes('1.0.0')) {
          throw new ValidationError('Invalid path');
        }
      });

      const result = manager.deleteSpecFile('test', '1.0.0');
      expect(result).toBe(false);
    });

    test('should remove empty directory after deleting file', () => {
      const manager = new ManifestManager();
      
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([]);

      const result = manager.deleteSpecFile('test', '1.0.0');
      
      expect(result).toBe(true);
      expect(mockedFs.rmdirSync).toHaveBeenCalled();
    });

    test('should not remove directory if not empty', () => {
      const manager = new ManifestManager();
      
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue(['other-file.json']);

      const result = manager.deleteSpecFile('test', '1.0.0');
      
      expect(result).toBe(true);
      expect(mockedFs.rmdirSync).not.toHaveBeenCalled();
    });

    test('should handle directory removal errors gracefully', () => {
      const manager = new ManifestManager();
      
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([]);
      mockedFs.rmdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = manager.deleteSpecFile('test', '1.0.0');
      
      expect(result).toBe(true); // Should still return true even if dir removal fails
    });

    test('should handle unlink errors and return false', () => {
      const manager = new ManifestManager();
      
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.unlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = manager.deleteSpecFile('test', '1.0.0');
      expect(result).toBe(false);
    });
  });

  describe('getSpecFileSize - branch coverage', () => {
    beforeEach(() => {
      // Reset path validator mock to not throw
      mockedPathValidator.validatePath.mockReset();
    });

    test('should return 0 when name is empty', () => {
      const manager = new ManifestManager();
      
      const size = manager.getSpecFileSize('', '1.0.0');
      expect(size).toBe(0);
    });

    test('should return 0 when version is empty', () => {
      const manager = new ManifestManager();
      
      const size = manager.getSpecFileSize('test', '');
      expect(size).toBe(0);
    });

    test('should return 0 when file does not exist', () => {
      const manager = new ManifestManager();
      
      mockedFs.existsSync.mockReturnValue(false);

      const size = manager.getSpecFileSize('test', '1.0.0');
      expect(size).toBe(0);
    });

    test('should return 0 when path validation fails', () => {
      const manager = new ManifestManager();
      
      mockedPathValidator.validatePath.mockImplementation((path) => {
        if (path.includes('test') && path.includes('1.0.0')) {
          throw new ValidationError('Invalid path');
        }
      });

      const size = manager.getSpecFileSize('test', '1.0.0');
      expect(size).toBe(0);
    });

    test('should return 0 when stat fails', () => {
      const manager = new ManifestManager();
      
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const size = manager.getSpecFileSize('test', '1.0.0');
      expect(size).toBe(0);
    });
  });

  describe('parseSpecId - branch coverage', () => {
    beforeEach(() => {
      // Reset path validator mock to not throw
      mockedPathValidator.validatePath.mockReset();
    });

    test('should return null for invalid ID format', () => {
      const manager = new ManifestManager();
      
      expect(manager.parseSpecId('invalid')).toBeNull();
      expect(manager.parseSpecId('invalid:format')).toBeNull();
      expect(manager.parseSpecId('notcustom:api:version')).toBeNull();
      expect(manager.parseSpecId('custom:api:version:extra')).toBeNull();
    });

    test('should parse valid custom spec ID', () => {
      const manager = new ManifestManager();
      
      const result = manager.parseSpecId('custom:test-api:1.0.0');
      expect(result).toEqual({
        provider: 'custom',
        name: 'test-api',
        version: '1.0.0'
      });
    });
  });

  describe('getStats - branch coverage', () => {
    beforeEach(() => {
      // Reset path validator mock to not throw
      mockedPathValidator.validatePath.mockReset();
    });

    test('should handle specs with different formats and sources', () => {
      const manager = new ManifestManager();
      
      const specs: CustomSpecEntry[] = [
        {
          id: 'custom:yaml1:1.0.0',
          name: 'yaml1',
          version: '1.0.0',
          title: 'YAML API 1',
          description: 'Test',
          originalFormat: 'yaml',
          sourceType: 'file',
          sourcePath: '/test.yaml',
          imported: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          fileSize: 1024
        },
        {
          id: 'custom:json1:1.0.0',
          name: 'json1',
          version: '1.0.0',
          title: 'JSON API 1',
          description: 'Test',
          originalFormat: 'json',
          sourceType: 'url',
          sourcePath: 'https://example.com/api.json',
          imported: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          fileSize: 2048
        }
      ];

      // Make manifest.json exist for listSpecs
      mockedFs.existsSync.mockImplementation((path) => 
        path.toString().includes('manifest.json')
      );

      specs.forEach(spec => manager.addSpec(spec));
      
      const stats = manager.getStats();
      
      expect(stats.totalSpecs).toBe(2);
      expect(stats.totalSize).toBe(3072);
      expect(stats.byFormat.yaml).toBe(1);
      expect(stats.byFormat.json).toBe(1);
      expect(stats.bySource.file).toBe(1);
      expect(stats.bySource.url).toBe(1);
    });
  });

  describe('validateIntegrity - branch coverage', () => {
    beforeEach(() => {
      // Reset path validator mock to not throw
      mockedPathValidator.validatePath.mockReset();
    });

    test('should report invalid spec ID format', () => {
      const manager = new ManifestManager();
      
      // Manually set up a corrupted manifest
      savedManifest = JSON.stringify({
        version: '1.0.0',
        specs: {
          'invalid-id-format': {
            id: 'invalid-id-format',
            name: 'test',
            version: '1.0.0',
            title: 'Test',
            fileSize: 1024
          }
        },
        lastUpdated: new Date().toISOString()
      });
      
      mockedFs.existsSync.mockImplementation((path) => 
        path.toString().includes('manifest.json')
      );

      // Force reload by calling listSpecs
      manager.listSpecs();
      
      const result = manager.validateIntegrity();
      
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Invalid spec ID format: invalid-id-format');
    });

    test('should report missing spec file', () => {
      const manager = new ManifestManager();
      
      const spec: CustomSpecEntry = {
        id: 'custom:missing:1.0.0',
        name: 'missing',
        version: '1.0.0',
        title: 'Missing API',
        description: 'Test',
        originalFormat: 'json',
        sourceType: 'file',
        sourcePath: '/missing.json',
        imported: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        fileSize: 1024
      };

      // Make manifest.json exist
      mockedFs.existsSync.mockImplementation((path) => 
        path.toString().includes('manifest.json')
      );

      manager.addSpec(spec);
      
      // File doesn't exist
      mockedFs.existsSync.mockImplementation((path) => {
        if (path.toString().includes('missing') && path.toString().includes('1.0.0.json')) {
          return false;
        }
        return path.toString().includes('manifest.json');
      });

      const result = manager.validateIntegrity();
      
      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => issue.includes('Spec file missing for custom:missing:1.0.0'))).toBe(true);
    });

    test('should report missing required fields', () => {
      const manager = new ManifestManager();
      
      // Add incomplete spec
      savedManifest = JSON.stringify({
        version: '1.0.0',
        specs: {
          'custom:incomplete:1.0.0': {
            id: 'custom:incomplete:1.0.0',
            name: 'incomplete',
            version: '1.0.0',
            // Missing title
            fileSize: 1024
          }
        },
        lastUpdated: new Date().toISOString()
      });
      
      mockedFs.existsSync.mockImplementation((path) => 
        path.toString().includes('manifest.json') || path.toString().includes('incomplete')
      );

      // Force reload
      manager.listSpecs();
      
      const result = manager.validateIntegrity();
      
      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => issue.includes('Missing required fields'))).toBe(true);
    });

    test('should report file size mismatch', () => {
      const manager = new ManifestManager();
      
      const spec: CustomSpecEntry = {
        id: 'custom:mismatch:1.0.0',
        name: 'mismatch',
        version: '1.0.0',
        title: 'Mismatch API',
        description: 'Test',
        originalFormat: 'json',
        sourceType: 'file',
        sourcePath: '/mismatch.json',
        imported: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        fileSize: 1024
      };

      // Make manifest.json exist
      mockedFs.existsSync.mockImplementation((path) => 
        path.toString().includes('manifest.json')
      );

      manager.addSpec(spec);
      
      // File exists but with different size
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue({ size: 2048 } as any);

      const result = manager.validateIntegrity();
      
      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => 
        issue.includes('File size mismatch') && 
        issue.includes('expected 1024, found 2048')
      )).toBe(true);
    });

    test('should handle spec validation errors', () => {
      const manager = new ManifestManager();
      
      const spec: CustomSpecEntry = {
        id: 'custom:error:1.0.0',
        name: 'error',
        version: '1.0.0',
        title: 'Error API',
        description: 'Test',
        originalFormat: 'json',
        sourceType: 'file',
        sourcePath: '/error.json',
        imported: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        fileSize: 1024
      };

      // Make manifest.json exist
      mockedFs.existsSync.mockImplementation((path) => 
        path.toString().includes('manifest.json')
      );

      manager.addSpec(spec);
      
      // Throw error during validation
      mockedPathValidator.validatePath.mockImplementation((path) => {
        if (path.includes('error') && path.includes('1.0.0')) {
          throw new Error('Validation error');
        }
      });

      const result = manager.validateIntegrity();
      
      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => 
        issue.includes('Error validating spec custom:error:1.0.0')
      )).toBe(true);
    });

    test('should handle general validation errors', () => {
      const manager = new ManifestManager();
      
      // Mock listSpecs to throw
      jest.spyOn(manager, 'listSpecs').mockImplementation(() => {
        throw new Error('General error');
      });

      const result = manager.validateIntegrity();
      
      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => 
        issue.includes('Error during integrity validation')
      )).toBe(true);
    });
  });

  describe('repairIntegrity - branch coverage', () => {
    beforeEach(() => {
      // Reset path validator mock to not throw
      mockedPathValidator.validatePath.mockReset();
    });

    test('should return empty arrays when integrity is valid', () => {
      const manager = new ManifestManager();
      
      // Add valid spec
      const spec: CustomSpecEntry = {
        id: 'custom:valid:1.0.0',
        name: 'valid',
        version: '1.0.0',
        title: 'Valid API',
        description: 'Test',
        originalFormat: 'json',
        sourceType: 'file',
        sourcePath: '/valid.json',
        imported: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        fileSize: 1024
      };

      // Make manifest.json exist
      mockedFs.existsSync.mockImplementation((path) => 
        path.toString().includes('manifest.json')
      );

      manager.addSpec(spec);
      
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue({ size: 1024 } as any);

      const result = manager.repairIntegrity();
      
      expect(result.repaired).toEqual([]);
      expect(result.failed).toEqual([]);
    });

    test('should remove specs with invalid IDs', () => {
      const manager = new ManifestManager();
      
      // Manually create corrupted manifest
      savedManifest = JSON.stringify({
        version: '1.0.0',
        specs: {
          'invalid-id': {
            id: 'invalid-id',
            name: 'test',
            version: '1.0.0',
            title: 'Test',
            fileSize: 1024
          }
        },
        lastUpdated: new Date().toISOString()
      });
      
      mockedFs.existsSync.mockImplementation((path) => 
        path.toString().includes('manifest.json')
      );

      // Force reload
      manager.listSpecs();
      
      const result = manager.repairIntegrity();
      
      expect(result.repaired).toContain('Removed spec with invalid ID: invalid-id');
    });

    test('should remove specs with missing files', () => {
      const manager = new ManifestManager();
      
      const spec: CustomSpecEntry = {
        id: 'custom:missing:1.0.0',
        name: 'missing',
        version: '1.0.0',
        title: 'Missing API',
        description: 'Test',
        originalFormat: 'json',
        sourceType: 'file',
        sourcePath: '/missing.json',
        imported: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        fileSize: 1024
      };

      // Make manifest.json exist
      mockedFs.existsSync.mockImplementation((path) => 
        path.toString().includes('manifest.json')
      );

      manager.addSpec(spec);
      
      // File doesn't exist
      mockedFs.existsSync.mockImplementation((path) => {
        if (path.toString().includes('missing') && path.toString().includes('1.0.0.json')) {
          return false;
        }
        return path.toString().includes('manifest.json');
      });

      const result = manager.repairIntegrity();
      
      expect(result.repaired).toContain('Removed spec with missing file: custom:missing:1.0.0');
    });

    test('should update file size when mismatch detected', () => {
      const manager = new ManifestManager();
      
      const spec: CustomSpecEntry = {
        id: 'custom:mismatch:1.0.0',
        name: 'mismatch',
        version: '1.0.0',
        title: 'Mismatch API',
        description: 'Test',
        originalFormat: 'json',
        sourceType: 'file',
        sourcePath: '/mismatch.json',
        imported: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        fileSize: 1024
      };

      // Make manifest.json exist
      mockedFs.existsSync.mockImplementation((path) => 
        path.toString().includes('manifest.json')
      );

      manager.addSpec(spec);
      
      // File exists with different size
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue({ size: 2048 } as any);

      const result = manager.repairIntegrity();
      
      expect(result.repaired).toContain('Updated file size for custom:mismatch:1.0.0');
      
      // Verify the update happened
      const updatedSpec = manager.getSpec('custom:mismatch:1.0.0');
      expect(updatedSpec?.fileSize).toBe(2048);
    });
  });

  describe('hasNameVersion - branch coverage', () => {
    beforeEach(() => {
      // Reset path validator mock to not throw
      mockedPathValidator.validatePath.mockReset();
    });

    test('should return true when name/version combination exists', () => {
      const manager = new ManifestManager();
      
      const spec: CustomSpecEntry = {
        id: 'custom:test:1.0.0',
        name: 'test',
        version: '1.0.0',
        title: 'Test API',
        description: 'Test',
        originalFormat: 'json',
        sourceType: 'file',
        sourcePath: '/test.json',
        imported: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        fileSize: 1024
      };

      // Make manifest.json exist
      mockedFs.existsSync.mockImplementation((path) => 
        path.toString().includes('manifest.json')
      );

      manager.addSpec(spec);
      
      expect(manager.hasNameVersion('test', '1.0.0')).toBe(true);
    });

    test('should return false when name/version combination does not exist', () => {
      const manager = new ManifestManager();
      
      expect(manager.hasNameVersion('nonexistent', '1.0.0')).toBe(false);
    });
  });

  describe('generateSpecId - branch coverage', () => {
    beforeEach(() => {
      // Reset path validator mock to not throw
      mockedPathValidator.validatePath.mockReset();
    });

    test('should generate correct spec ID format', () => {
      const manager = new ManifestManager();
      
      const id = manager.generateSpecId('test-api', '2.5.0');
      expect(id).toBe('custom:test-api:2.5.0');
    });
  });
});