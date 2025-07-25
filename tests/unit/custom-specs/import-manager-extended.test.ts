import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { ImportManager } from '../../../src/custom-specs/import-manager.js';
import { SpecProcessor } from '../../../src/custom-specs/spec-processor.js';
import { ManifestManager } from '../../../src/custom-specs/manifest-manager.js';
import { SpecProcessingResult } from '../../../src/custom-specs/types.js';

// Mock dependencies
jest.mock('../../../src/custom-specs/spec-processor.js');
jest.mock('../../../src/custom-specs/manifest-manager.js');

const MockedSpecProcessor = SpecProcessor as jest.MockedClass<typeof SpecProcessor>;
const MockedManifestManager = ManifestManager as jest.MockedClass<typeof ManifestManager>;

describe('ImportManager - Extended Coverage', () => {
  let importManager: ImportManager;
  let mockSpecProcessor: jest.Mocked<SpecProcessor>;
  let mockManifestManager: jest.Mocked<ManifestManager>;
  let mockOnSpecChange: jest.Mock;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  const mockProcessingResult: SpecProcessingResult = {
    spec: {
      added: '2023-01-01T00:00:00.000Z',
      info: {
        title: 'Test API',
        version: '1.0.0',
        description: 'A test API'
      },
      preferred: true,
      swaggerUrl: 'file:///test/api.json',
      swaggerYamlUrl: 'file:///test/api.yaml',
      openapiVer: '3.0.0',
      link: 'file:///test'
    },
    originalFormat: 'json',
    securityScan: {
      scannedAt: '2023-01-01T00:00:00.000Z',
      issues: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0 },
      blocked: false
    },
    metadata: {
      title: 'Test API',
      description: 'A test API',
      version: '1.0.0',
      fileSize: 1024
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Mock SpecProcessor
    mockSpecProcessor = {
      processSpec: jest.fn().mockResolvedValue(mockProcessingResult),
      getSecurityScanner: jest.fn().mockReturnValue({
        generateReport: jest.fn().mockReturnValue('Security scan report'),
        scanSpec: jest.fn().mockResolvedValue(mockProcessingResult.securityScan)
      }),
      toNormalizedJSON: jest.fn().mockReturnValue('{"openapi":"3.0.0"}'),
      quickValidate: jest.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] })
    } as any;

    MockedSpecProcessor.mockImplementation(() => mockSpecProcessor);

    // Mock ManifestManager
    mockManifestManager = {
      hasNameVersion: jest.fn().mockReturnValue(false),
      hasSpec: jest.fn().mockReturnValue(false),
      addSpec: jest.fn(),
      removeSpec: jest.fn().mockReturnValue(true),
      getSpec: jest.fn(),
      listSpecs: jest.fn().mockReturnValue([]),
      updateSpec: jest.fn(),
      storeSpecFile: jest.fn(),
      deleteSpecFile: jest.fn().mockReturnValue(true),
      readSpecFile: jest.fn().mockReturnValue('{}'),
      getPaths: jest.fn().mockReturnValue({
        getSpecFile: jest.fn().mockReturnValue('/path/to/spec/file.json')
      }),
      generateSpecId: jest.fn((name: string, version: string) => `custom:${name}:${version}`),
      parseSpecId: jest.fn((id: string) => {
        const [, name, version] = id.split(':');
        return { name, version };
      }),
      validateSpec: jest.fn().mockReturnValue({ valid: true, errors: [] }),
      getStats: jest.fn().mockReturnValue({ total: 0, byFormat: {}, bySource: {} }),
      validateIntegrity: jest.fn().mockReturnValue({ valid: true, issues: [] }),
      repairIntegrity: jest.fn().mockReturnValue({ repaired: 0, issues: [] })
    } as any;

    MockedManifestManager.mockImplementation(() => mockManifestManager);

    mockOnSpecChange = jest.fn().mockResolvedValue(undefined);
    importManager = new ImportManager(mockOnSpecChange);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('removeSpec - additional coverage', () => {
    test('should handle name:version format without custom prefix', async () => {
      mockManifestManager.hasSpec.mockReturnValue(true);
      mockManifestManager.removeSpec.mockReturnValue(true);
      mockManifestManager.deleteSpecFile.mockReturnValue(true);

      const result = await importManager.removeSpec('test-api:1.0.0');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Successfully removed custom:test-api:1.0.0');
      expect(mockManifestManager.parseSpecId).not.toHaveBeenCalled();
      expect(mockManifestManager.removeSpec).toHaveBeenCalledWith('custom:test-api:1.0.0');
      expect(mockManifestManager.deleteSpecFile).toHaveBeenCalledWith('test-api', '1.0.0');
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Successfully removed custom spec: custom:test-api:1.0.0');
    });

    test('should handle invalid name:version format', async () => {
      const result = await importManager.removeSpec('invalid:format:with:too:many:colons');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid name:version format: invalid:format:with:too:many:colons');
    });

    test('should handle invalid spec ID format', async () => {
      mockManifestManager.parseSpecId.mockReturnValue(null);

      const result = await importManager.removeSpec('custom:invalid');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid spec ID format: custom:invalid');
    });

    test('should handle separate name and version parameters', async () => {
      mockManifestManager.hasSpec.mockReturnValue(true);
      mockManifestManager.removeSpec.mockReturnValue(true);
      mockManifestManager.deleteSpecFile.mockReturnValue(true);

      const result = await importManager.removeSpec('test-api', '2.0.0');

      expect(result.success).toBe(true);
      expect(mockManifestManager.removeSpec).toHaveBeenCalledWith('custom:test-api:2.0.0');
      expect(mockManifestManager.deleteSpecFile).toHaveBeenCalledWith('test-api', '2.0.0');
    });

    test('should return error when version not provided with name only', async () => {
      const result = await importManager.removeSpec('test-api');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Version required when providing name only');
    });

    test('should warn when spec file deletion fails', async () => {
      mockManifestManager.hasSpec.mockReturnValue(true);
      mockManifestManager.removeSpec.mockReturnValue(true);
      mockManifestManager.deleteSpecFile.mockReturnValue(false);

      const result = await importManager.removeSpec('test-api:1.0.0');

      expect(result.success).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Warning: Failed to remove spec file for custom:test-api:1.0.0');
    });

    test('should handle cache invalidation failure during removal', async () => {
      mockManifestManager.hasSpec.mockReturnValue(true);
      mockManifestManager.removeSpec.mockReturnValue(true);
      mockOnSpecChange.mockRejectedValue(new Error('Cache error'));

      const result = await importManager.removeSpec('test-api:1.0.0');

      expect(result.success).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Cache invalidation failed after removal:', expect.any(Error));
    });

    test('should handle unexpected errors during removal', async () => {
      mockManifestManager.hasSpec.mockReturnValue(true);
      mockManifestManager.removeSpec.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await importManager.removeSpec('test-api:1.0.0');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Remove failed: Unexpected error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Remove failed: Unexpected error');
    });
  });

  describe('listSpecs - coverage', () => {
    test('should list specs with truncated descriptions', () => {
      const longDescription = 'A'.repeat(150);
      const mockSpecs = [{
        id: 'custom:api1:1.0.0',
        name: 'api1',
        version: '1.0.0',
        title: 'API 1',
        description: longDescription,
        imported: '2023-01-01T00:00:00.000Z',
        fileSize: 2048,
        securityScan: {
          summary: { critical: 1, high: 2, medium: 3, low: 4 }
        },
        originalFormat: 'yaml',
        sourceType: 'url'
      }];

      mockManifestManager.listSpecs.mockReturnValue(mockSpecs);
      
      const result = importManager.listSpecs();

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('A'.repeat(100) + '...');
      expect(result[0].securityIssues).toBe(10); // 1+2+3+4
    });

    test('should handle specs without security scan', () => {
      const mockSpecs = [{
        id: 'custom:api2:1.0.0',
        name: 'api2',
        version: '1.0.0',
        title: 'API 2',
        description: 'Short description',
        imported: '2023-01-01T00:00:00.000Z',
        fileSize: 1024,
        securityScan: null,
        originalFormat: 'json',
        sourceType: 'file'
      }];

      mockManifestManager.listSpecs.mockReturnValue(mockSpecs);
      
      const result = importManager.listSpecs();

      expect(result[0].securityIssues).toBe(0);
      expect(result[0].description).toBe('Short description');
    });
  });

  describe('getSpecDetails - coverage', () => {
    test('should handle custom: prefixed ID', () => {
      const mockSpec = { id: 'custom:test:1.0.0', name: 'test', version: '1.0.0' };
      mockManifestManager.getSpec.mockReturnValue(mockSpec);

      const result = importManager.getSpecDetails('custom:test:1.0.0');

      expect(result).toEqual(mockSpec);
      expect(mockManifestManager.getSpec).toHaveBeenCalledWith('custom:test:1.0.0');
    });

    test('should handle name:version format', () => {
      const mockSpec = { id: 'custom:test:2.0.0', name: 'test', version: '2.0.0' };
      mockManifestManager.getSpec.mockReturnValue(mockSpec);

      const result = importManager.getSpecDetails('test:2.0.0');

      expect(result).toEqual(mockSpec);
      expect(mockManifestManager.getSpec).toHaveBeenCalledWith('custom:test:2.0.0');
    });

    test('should handle separate name and version', () => {
      const mockSpec = { id: 'custom:test:3.0.0', name: 'test', version: '3.0.0' };
      mockManifestManager.getSpec.mockReturnValue(mockSpec);

      const result = importManager.getSpecDetails('test', '3.0.0');

      expect(result).toEqual(mockSpec);
      expect(mockManifestManager.getSpec).toHaveBeenCalledWith('custom:test:3.0.0');
    });

    test('should return null for invalid format', () => {
      const result = importManager.getSpecDetails('invalid:format:with:too:many');
      expect(result).toBeNull();
    });

    test('should return null when spec not found', () => {
      mockManifestManager.getSpec.mockReturnValue(null);
      const result = importManager.getSpecDetails('test:1.0.0');
      expect(result).toBeNull();
    });

    test('should return null when no version and no colon', () => {
      const result = importManager.getSpecDetails('test');
      expect(result).toBeNull();
    });
  });

  describe('rescanSecurity - coverage', () => {
    test('should successfully rescan security', async () => {
      const mockSpec = {
        id: 'custom:test:1.0.0',
        name: 'test',
        version: '1.0.0'
      };
      
      const mockSpecData = {
        versions: {
          '1.0.0': {
            spec: { openapi: '3.0.0' }
          }
        },
        preferred: '1.0.0'
      };

      const newSecurityScan = {
        scannedAt: '2023-06-01T00:00:00.000Z',
        issues: [{ type: 'test', severity: 'low' }],
        summary: { critical: 0, high: 0, medium: 0, low: 1 },
        blocked: false
      };

      mockManifestManager.getSpec.mockReturnValue(mockSpec);
      mockManifestManager.parseSpecId.mockReturnValue({ name: 'test', version: '1.0.0' });
      mockManifestManager.readSpecFile.mockReturnValue(JSON.stringify(mockSpecData));
      mockSpecProcessor.getSecurityScanner().scanSpec.mockResolvedValue(newSecurityScan);

      const result = await importManager.rescanSecurity('test:1.0.0');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Security scan completed for custom:test:1.0.0');
      expect(result.securityScan).toEqual(newSecurityScan);
      expect(mockManifestManager.updateSpec).toHaveBeenCalledWith(
        'custom:test:1.0.0',
        expect.objectContaining({
          securityScan: newSecurityScan,
          lastModified: expect.any(String)
        })
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('🔒 Running security scan for custom:test:1.0.0...');
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Security scan completed for custom:test:1.0.0');
    });

    test('should handle spec not found', async () => {
      mockManifestManager.getSpec.mockReturnValue(null);

      const result = await importManager.rescanSecurity('nonexistent:1.0.0');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Spec not found');
    });

    test('should handle invalid spec ID during parsing', async () => {
      const mockSpec = { id: 'custom:test:1.0.0' };
      mockManifestManager.getSpec.mockReturnValue(mockSpec);
      mockManifestManager.parseSpecId.mockReturnValue(null);

      const result = await importManager.rescanSecurity('test:1.0.0');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid spec ID');
    });

    test('should handle missing spec data in file', async () => {
      const mockSpec = { id: 'custom:test:1.0.0' };
      const mockSpecData = {
        versions: {},
        preferred: '1.0.0'
      };

      mockManifestManager.getSpec.mockReturnValue(mockSpec);
      mockManifestManager.parseSpecId.mockReturnValue({ name: 'test', version: '1.0.0' });
      mockManifestManager.readSpecFile.mockReturnValue(JSON.stringify(mockSpecData));

      const result = await importManager.rescanSecurity('test:1.0.0');

      expect(result.success).toBe(false);
      expect(result.message).toBe('No spec data found for security scan');
    });

    test('should handle security scan errors', async () => {
      const mockSpec = { id: 'custom:test:1.0.0' };
      const mockSpecData = {
        versions: { '1.0.0': { spec: {} } },
        preferred: '1.0.0'
      };

      mockManifestManager.getSpec.mockReturnValue(mockSpec);
      mockManifestManager.parseSpecId.mockReturnValue({ name: 'test', version: '1.0.0' });
      mockManifestManager.readSpecFile.mockReturnValue(JSON.stringify(mockSpecData));
      mockSpecProcessor.getSecurityScanner().scanSpec.mockRejectedValue(new Error('Scan failed'));

      const result = await importManager.rescanSecurity('test:1.0.0');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Security scan failed: Scan failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Security scan failed: Scan failed');
    });

    test('should handle non-Error exceptions', async () => {
      const mockSpec = { id: 'custom:test:1.0.0' };
      mockManifestManager.getSpec.mockReturnValue(mockSpec);
      mockManifestManager.parseSpecId.mockImplementation(() => {
        throw 'String error';
      });

      const result = await importManager.rescanSecurity('test:1.0.0');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Security scan failed: Unknown error');
    });
  });

  describe('importSpec - processImportOptions coverage', () => {
    test('should extract name from URL with query parameters', async () => {
      const options = {
        source: 'https://api.example.com/specs/user-service.yaml?version=latest'
      };

      const result = await importManager.importSpec(options);

      expect(mockManifestManager.addSpec).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'user-service',
          version: '1.0.0'
        })
      );
    });

    test('should handle URL parsing errors', async () => {
      const options = {
        source: 'http://[invalid-url'
      };

      const result = await importManager.importSpec(options);

      expect(mockManifestManager.addSpec).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-api', // Falls back to title from metadata
          version: '1.0.0'
        })
      );
    });

    test('should handle empty path in URL', async () => {
      const options = {
        source: 'https://example.com/'
      };

      const result = await importManager.importSpec(options);

      expect(mockManifestManager.addSpec).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-api', // Falls back to title from metadata
          version: '1.0.0'
        })
      );
    });

    test('should handle file path with multiple extensions', async () => {
      const options = {
        source: '/path/to/api.spec.yaml'
      };

      const result = await importManager.importSpec(options);

      expect(mockManifestManager.addSpec).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'api-spec',
          version: '1.0.0'
        })
      );
    });

    test('should handle spec processing error when extracting title', async () => {
      const options = {
        source: '/path/to/swagger.json'
      };

      // First call for title extraction fails
      mockSpecProcessor.processSpec
        .mockRejectedValueOnce(new Error('Parse error'))
        .mockResolvedValueOnce(mockProcessingResult);

      const result = await importManager.importSpec(options);

      expect(result.success).toBe(true);
      expect(mockManifestManager.addSpec).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'swagger', // Falls back to generic name
          version: '1.0.0'
        })
      );
    });

    test('should clean up title to valid name format', async () => {
      const processingResultWithComplexTitle = {
        ...mockProcessingResult,
        metadata: {
          ...mockProcessingResult.metadata,
          title: 'My API Service (v2.0) - Production'
        }
      };

      mockSpecProcessor.processSpec.mockResolvedValue(processingResultWithComplexTitle);

      const options = {
        source: '/path/to/openapi.json'
      };

      const result = await importManager.importSpec(options);

      expect(mockManifestManager.addSpec).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'my-api-service-v2-0-production',
          version: '1.0.0'
        })
      );
    });

    test('should handle empty filename extraction', async () => {
      const options = {
        source: '/path/to/'
      };

      const result = await importManager.importSpec(options);

      expect(mockManifestManager.addSpec).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-api', // Falls back to title from metadata
          version: '1.0.0'
        })
      );
    });

    test('should handle special characters in filename', async () => {
      const options = {
        source: '/path/to/my@api#spec$.json'
      };

      const result = await importManager.importSpec(options);

      expect(mockManifestManager.addSpec).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'my-api-spec', // Trailing dash is cleaned up
          version: '1.0.0'
        })
      );
    });

    test('should handle empty source path', async () => {
      const options = {
        source: ''
      };

      const result = await importManager.importSpec(options);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Source path or URL is required');
    });
  });

  describe('importSpec - non-Error exceptions', () => {
    test('should handle non-Error exception in importSpec', async () => {
      mockSpecProcessor.processSpec.mockImplementation(() => {
        throw 'String exception';
      });

      const result = await importManager.importSpec({
        name: 'test',
        version: '1.0.0',
        source: '/test.json'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Import failed: Unknown error');
      expect(result.errors).toEqual(['Unknown error']);
    });
  });

  describe('removeSpec - non-Error exceptions', () => {
    test('should handle non-Error exception in removeSpec', async () => {
      mockManifestManager.hasSpec.mockReturnValue(true);
      mockManifestManager.removeSpec.mockImplementation(() => {
        throw 'String exception';
      });

      const result = await importManager.removeSpec('test:1.0.0');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Remove failed: Unknown error');
    });
  });

  describe('quickValidate - coverage', () => {
    test('should delegate to specProcessor', async () => {
      const mockValidation = { valid: true, errors: [], warnings: ['Minor issue'] };
      mockSpecProcessor.quickValidate.mockResolvedValue(mockValidation);

      const result = await importManager.quickValidate('/path/to/spec.json');

      expect(result).toEqual(mockValidation);
      expect(mockSpecProcessor.quickValidate).toHaveBeenCalledWith('/path/to/spec.json');
    });
  });

  describe('getStats, validateIntegrity, repairIntegrity - coverage', () => {
    test('should delegate getStats to manifestManager', () => {
      const mockStats = { total: 5, byFormat: { json: 3, yaml: 2 }, bySource: { file: 4, url: 1 } };
      mockManifestManager.getStats.mockReturnValue(mockStats);

      const result = importManager.getStats();

      expect(result).toEqual(mockStats);
      expect(mockManifestManager.getStats).toHaveBeenCalled();
    });

    test('should delegate validateIntegrity to manifestManager', () => {
      const mockIntegrity = { valid: true, issues: [] };
      mockManifestManager.validateIntegrity.mockReturnValue(mockIntegrity);

      const result = importManager.validateIntegrity();

      expect(result).toEqual(mockIntegrity);
      expect(mockManifestManager.validateIntegrity).toHaveBeenCalled();
    });

    test('should delegate repairIntegrity to manifestManager', () => {
      const mockRepair = { repaired: 2, issues: ['Fixed issue 1', 'Fixed issue 2'] };
      mockManifestManager.repairIntegrity.mockReturnValue(mockRepair);

      const result = importManager.repairIntegrity();

      expect(result).toEqual(mockRepair);
      expect(mockManifestManager.repairIntegrity).toHaveBeenCalled();
    });
  });
});