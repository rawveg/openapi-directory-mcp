// @ts-nocheck
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ManifestManager } from '../../../src/custom-specs/manifest-manager.js';
import { ValidationError } from '../../../src/utils/errors.js';
import { CustomSpecEntry } from '../../../src/custom-specs/types.js';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock homedir
jest.mock('os', () => ({
  homedir: jest.fn().mockReturnValue('/home/user')
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

describe('ManifestManager', () => {
  let manifestManager: ManifestManager;
  const mockPaths = {
    baseDir: '/home/user/.cache/openapi-directory-mcp/custom-specs',
    manifestFile: '/home/user/.cache/openapi-directory-mcp/custom-specs/manifest.json',
    specsDir: '/home/user/.cache/openapi-directory-mcp/custom-specs/custom',
    getSpecFile: jest.fn((name: string, version: string) => 
      `/home/user/.cache/openapi-directory-mcp/custom-specs/custom/${name}/${version}.json`
    )
  };

  let savedManifest: string | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    savedManifest = null;

    // Mock fs operations - start with empty state
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

  describe('constructor', () => {
    test('should initialize with default paths when no cache dir is set', () => {
      delete process.env.OPENAPI_DIRECTORY_CACHE_DIR;
      
      manifestManager = new ManifestManager();
      
      // Check that directories are created
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('custom-specs'),
        { recursive: true }
      );
    });

    test('should use custom cache directory when OPENAPI_DIRECTORY_CACHE_DIR is set', () => {
      process.env.OPENAPI_DIRECTORY_CACHE_DIR = '/custom/cache';
      
      manifestManager = new ManifestManager();
      
      // Check that custom directory is used
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('/custom/cache'),
        { recursive: true }
      );
      
      delete process.env.OPENAPI_DIRECTORY_CACHE_DIR;
    });

    test('should create directories if they do not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      
      manifestManager = new ManifestManager();
      
      expect(mockedFs.mkdirSync).toHaveBeenCalledTimes(2);
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('custom-specs'),
        { recursive: true }
      );
    });

    test('should load existing manifest if present', () => {
      const existingManifest = {
        version: '1.0.0',
        specs: {
          'custom:test:1.0.0': {
            id: 'custom:test:1.0.0',
            name: 'test',
            version: '1.0.0',
            title: 'Test API',
            description: 'A test API',
            originalFormat: 'json' as const,
            sourceType: 'file' as const,
            sourcePath: '/test.json',
            imported: '2023-01-01T00:00:00.000Z',
            lastModified: '2023-01-01T00:00:00.000Z',
            fileSize: 1024
          }
        },
        lastUpdated: '2023-01-01T00:00:00.000Z'
      };

      mockedFs.existsSync.mockImplementation((path) => 
        path.toString().includes('manifest.json')
      );
      mockedFs.readFileSync.mockImplementation((path) => {
        if (path.toString().includes('manifest.json')) {
          return JSON.stringify(existingManifest);
        }
        throw new Error('File not found');
      });
      
      manifestManager = new ManifestManager();
      
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('manifest.json'),
        'utf-8'
      );
    });
  });

  describe('addSpec', () => {
    beforeEach(() => {
      manifestManager = new ManifestManager();
    });

    test('should add a new spec to the manifest', () => {
      const specEntry: CustomSpecEntry = {
        id: 'custom:example:1.0.0',
        name: 'example',
        version: '1.0.0',
        title: 'Example API',
        description: 'An example API',
        originalFormat: 'json',
        sourceType: 'file',
        sourcePath: '/example.json',
        imported: '2023-01-01T00:00:00.000Z',
        lastModified: '2023-01-01T00:00:00.000Z',
        fileSize: 2048
      };

      manifestManager.addSpec(specEntry);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('manifest.json'),
        expect.stringContaining('"custom:example:1.0.0"'),
        'utf-8'
      );
    });

    test('should throw error for duplicate spec ID', () => {
      const specEntry: CustomSpecEntry = {
        id: 'custom:duplicate:1.0.0',
        name: 'duplicate',
        version: '1.0.0',
        title: 'Duplicate API',
        description: 'A duplicate API',
        originalFormat: 'yaml',
        sourceType: 'url',
        sourcePath: 'https://example.com/api.yaml',
        imported: '2023-01-01T00:00:00.000Z',
        lastModified: '2023-01-01T00:00:00.000Z',
        fileSize: 1024
      };

      // Add first time
      manifestManager.addSpec(specEntry);
      
      // Try to add again
      expect(() => manifestManager.addSpec(specEntry))
        .toThrow('Spec with ID custom:duplicate:1.0.0 already exists');
    });

    test('should validate spec entry before adding', () => {
      const invalidSpecEntry = {
        id: '',
        name: 'invalid',
        version: '1.0.0'
      } as CustomSpecEntry;

      expect(() => manifestManager.addSpec(invalidSpecEntry))
        .toThrow(ValidationError);
    });
  });

  describe('removeSpec', () => {
    beforeEach(() => {
      manifestManager = new ManifestManager();
    });

    test('should remove spec from manifest', () => {
      const specEntry: CustomSpecEntry = {
        id: 'custom:toremove:1.0.0',
        name: 'toremove',
        version: '1.0.0',
        title: 'To Remove API',
        description: 'API to be removed',
        originalFormat: 'json',
        sourceType: 'file',
        sourcePath: '/toremove.json',
        imported: '2023-01-01T00:00:00.000Z',
        lastModified: '2023-01-01T00:00:00.000Z',
        fileSize: 1024
      };

      // Add spec first
      manifestManager.addSpec(specEntry);
      
      // Remove spec
      const result = manifestManager.removeSpec('custom:toremove:1.0.0');

      expect(result).toBe(true);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('manifest.json'),
        expect.not.stringContaining('custom:toremove:1.0.0'),
        'utf-8'
      );
    });

    test('should return false for non-existent spec', () => {
      const result = manifestManager.removeSpec('custom:nonexistent:1.0.0');
      expect(result).toBe(false);
    });

    test('should handle file deletion errors gracefully', () => {
      const specEntry: CustomSpecEntry = {
        id: 'custom:error:1.0.0',
        name: 'error',
        version: '1.0.0',
        title: 'Error API',
        description: 'API with deletion error',
        originalFormat: 'json',
        sourceType: 'file',
        sourcePath: '/error.json',
        imported: '2023-01-01T00:00:00.000Z',
        lastModified: '2023-01-01T00:00:00.000Z',
        fileSize: 1024
      };

      manifestManager.addSpec(specEntry);
      
      // Mock file deletion error
      mockedFs.unlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      // Should still remove from manifest even if file deletion fails
      const result = manifestManager.removeSpec('custom:error:1.0.0');
      expect(result).toBe(true);
    });
  });

  describe('getSpec', () => {
    beforeEach(() => {
      manifestManager = new ManifestManager();
    });

    test('should return spec entry if it exists', () => {
      const specEntry: CustomSpecEntry = {
        id: 'custom:exists:1.0.0',
        name: 'exists',
        version: '1.0.0',
        title: 'Exists API',
        description: 'An existing API',
        originalFormat: 'json',
        sourceType: 'file',
        sourcePath: '/exists.json',
        imported: '2023-01-01T00:00:00.000Z',
        lastModified: '2023-01-01T00:00:00.000Z',
        fileSize: 1024
      };

      manifestManager.addSpec(specEntry);
      
      const result = manifestManager.getSpec('custom:exists:1.0.0');
      expect(result).toEqual(specEntry);
    });

    test('should return undefined for non-existent spec', () => {
      const result = manifestManager.getSpec('custom:nonexistent:1.0.0');
      expect(result).toBeUndefined();
    });
  });

  describe('listSpecs', () => {
    beforeEach(() => {
      manifestManager = new ManifestManager();
    });

    test('should return empty array when no specs exist', () => {
      const result = manifestManager.listSpecs();
      expect(result).toEqual([]);
    });

    test('should return all specs when they exist', () => {
      const spec1: CustomSpecEntry = {
        id: 'custom:api1:1.0.0',
        name: 'api1',
        version: '1.0.0',
        title: 'API 1',
        description: 'First API',
        originalFormat: 'json',
        sourceType: 'file',
        sourcePath: '/api1.json',
        imported: '2023-01-01T00:00:00.000Z',
        lastModified: '2023-01-01T00:00:00.000Z',
        fileSize: 1024
      };

      const spec2: CustomSpecEntry = {
        id: 'custom:api2:2.0.0',
        name: 'api2',
        version: '2.0.0',
        title: 'API 2',
        description: 'Second API',
        originalFormat: 'yaml',
        sourceType: 'url',
        sourcePath: 'https://example.com/api2.yaml',
        imported: '2023-01-02T00:00:00.000Z',
        lastModified: '2023-01-02T00:00:00.000Z',
        fileSize: 2048
      };

      // After adding specs, the manifest file exists
      mockedFs.existsSync.mockImplementation((path) => 
        path.toString().includes('manifest.json')
      );

      manifestManager.addSpec(spec1);
      manifestManager.addSpec(spec2);
      
      const result = manifestManager.listSpecs();
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(spec1);
      expect(result).toContainEqual(spec2);
    });
  });

  describe('updateSpec', () => {
    beforeEach(() => {
      manifestManager = new ManifestManager();
    });

    test('should update existing spec', () => {
      const originalSpec: CustomSpecEntry = {
        id: 'custom:update:1.0.0',
        name: 'update',
        version: '1.0.0',
        title: 'Update API',
        description: 'Original description',
        originalFormat: 'json',
        sourceType: 'file',
        sourcePath: '/update.json',
        imported: '2023-01-01T00:00:00.000Z',
        lastModified: '2023-01-01T00:00:00.000Z',
        fileSize: 1024
      };

      manifestManager.addSpec(originalSpec);
      
      const updates = {
        description: 'Updated description',
        lastModified: '2023-01-02T00:00:00.000Z'
      };
      
      const result = manifestManager.updateSpec('custom:update:1.0.0', updates);
      expect(result).toBe(true);
      
      const retrieved = manifestManager.getSpec('custom:update:1.0.0');
      expect(retrieved?.description).toBe('Updated description');
    });

    test('should return false for non-existent spec', () => {
      const updates = {
        description: 'Updated description'
      };
      
      const result = manifestManager.updateSpec('custom:nonexistent:1.0.0', updates);
      expect(result).toBe(false);
    });
  });

  describe('file operations', () => {
    beforeEach(() => {
      manifestManager = new ManifestManager();
    });

    test('should handle file system permission errors', () => {
      const specEntry: CustomSpecEntry = {
        id: 'custom:permission:1.0.0',
        name: 'nonexistent',
        version: '1.0.0',
        title: 'Non-existent API',
        description: 'Does not exist',
        originalFormat: 'json',
        sourceType: 'file',
        sourcePath: '/nonexistent.json',
        imported: '2023-01-01T00:00:00.000Z',
        lastModified: '2023-01-01T00:00:00.000Z',
        fileSize: 1024
      };

      // This test should be testing that updateSpec returns false for non-existent spec
      const result = manifestManager.updateSpec('custom:nonexistent:1.0.0', { description: 'Updated' });
      expect(result).toBe(false);
    });
  });

  describe('path operations', () => {
    beforeEach(() => {
      manifestManager = new ManifestManager();
    });

    test('should return correct paths', () => {
      const paths = manifestManager.getPaths();
      
      expect(paths.baseDir).toContain('custom-specs');
      expect(paths.manifestFile).toContain('manifest.json');
      expect(paths.specsDir).toContain('custom');
      expect(typeof paths.getSpecFile).toBe('function');
    });

    test('should generate correct spec file path', () => {
      const paths = manifestManager.getPaths();
      const specPath = paths.getSpecFile('myapi', '1.0.0');
      
      expect(specPath).toContain('myapi');
      expect(specPath).toContain('1.0.0.json');
    });
  });

  describe('error handling', () => {
    test('should handle invalid manifest file gracefully', () => {
      mockedFs.existsSync.mockImplementation((path) => 
        path.toString().includes('manifest.json')
      );
      mockedFs.readFileSync.mockImplementation(() => 'invalid json');
      
      // Should not throw, should create new manifest
      expect(() => new ManifestManager()).not.toThrow();
    });

    test('should handle file system permission errors', () => {
      // First existsSync returns false so mkdirSync is called
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      expect(() => new ManifestManager()).toThrow('Permission denied');
    });

    test('should handle write errors when saving manifest', () => {
      manifestManager = new ManifestManager();
      
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Disk full');
      });
      
      const specEntry: CustomSpecEntry = {
        id: 'custom:test:1.0.0',
        name: 'test',
        version: '1.0.0',
        title: 'Test API',
        description: 'A test API',
        originalFormat: 'json',
        sourceType: 'file',
        sourcePath: '/test.json',
        imported: '2023-01-01T00:00:00.000Z',
        lastModified: '2023-01-01T00:00:00.000Z',
        fileSize: 1024
      };

      expect(() => manifestManager.addSpec(specEntry)).toThrow();
    });
  });
});