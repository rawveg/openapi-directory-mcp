import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { ImportManager } from '../../../src/custom-specs/import-manager.js';
import { SpecProcessor } from '../../../src/custom-specs/spec-processor.js';
import { ManifestManager } from '../../../src/custom-specs/manifest-manager.js';
import { ImportOptions, ImportResult, SpecProcessingResult } from '../../../src/custom-specs/types.js';
import * as fs from 'fs';

// Mock dependencies
jest.mock('../../../src/custom-specs/spec-processor.js');
jest.mock('../../../src/custom-specs/manifest-manager.js');
jest.mock('fs');

// Mock validation module
jest.mock('../../../src/utils/validation.js', () => ({
  PathValidator: {
    validatePath: jest.fn(),
    sanitizePath: jest.fn((path: string) => path)
  },
  FileValidator: {
    validateFileSize: jest.fn()
  }
}));

const MockedSpecProcessor = SpecProcessor as jest.MockedClass<typeof SpecProcessor>;
const MockedManifestManager = ManifestManager as jest.MockedClass<typeof ManifestManager>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('ImportManager', () => {
  let importManager: ImportManager;
  let mockSpecProcessor: jest.Mocked<SpecProcessor>;
  let mockManifestManager: jest.Mocked<ManifestManager>;
  let mockOnSpecChange: jest.Mock;

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

  const validImportOptions: ImportOptions = {
    name: 'test-api',
    version: '1.0.0',
    source: '/path/to/api.json'
  };

  beforeEach(() => {
    jest.clearAllMocks();

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

    // Mock fs operations
    mockedFs.writeFileSync.mockImplementation();

    // Mock callback
    mockOnSpecChange = jest.fn().mockResolvedValue(undefined);

    importManager = new ImportManager(mockOnSpecChange);
  });

  describe('importSpec', () => {
    test('should successfully import a valid spec', async () => {
      const result = await importManager.importSpec(validImportOptions);

      expect(result.success).toBe(true);
      expect(result.specId).toBe('custom:test-api:1.0.0');
      expect(result.message).toContain('Successfully imported');
      expect(mockSpecProcessor.processSpec).toHaveBeenCalledWith('/path/to/api.json', false);
      expect(mockManifestManager.addSpec).toHaveBeenCalled();
      expect(mockManifestManager.storeSpecFile).toHaveBeenCalled();
      expect(mockOnSpecChange).toHaveBeenCalled();
    });

    test('should auto-generate name and version when not provided', async () => {
      const optionsWithoutNameVersion: ImportOptions = {
        source: '/path/to/my-api.json'
      };

      const result = await importManager.importSpec(optionsWithoutNameVersion);

      expect(result.success).toBe(true);
      expect(result.specId).toMatch(/^custom:my-api:1\.0\.0$/);
      expect(mockManifestManager.addSpec).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'my-api',
          version: '1.0.0'
        })
      );
    });

    test('should extract name from URL when importing from URL', async () => {
      const urlOptions: ImportOptions = {
        source: 'https://example.com/petstore.yaml'
      };

      const result = await importManager.importSpec(urlOptions);

      expect(result.success).toBe(true);
      expect(mockManifestManager.addSpec).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'petstore',
          version: '1.0.0'
        })
      );
    });

    test('should use spec title as name when file name is generic', async () => {
      const genericFileOptions: ImportOptions = {
        source: '/path/to/openapi.json'
      };

      const result = await importManager.importSpec(genericFileOptions);

      expect(result.success).toBe(true);
      expect(mockManifestManager.addSpec).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-api', // From spec title
          version: '1.0.0'
        })
      );
    });

    test('should reject duplicate name and version', async () => {
      mockManifestManager.hasNameVersion.mockReturnValue(true);

      const result = await importManager.importSpec(validImportOptions);

      expect(result.success).toBe(false);
      expect(result.message).toContain('already exists');
      expect(result.errors).toContain('Duplicate spec: test-api:1.0.0');
      expect(mockSpecProcessor.processSpec).not.toHaveBeenCalled();
    });

    test('should validate import options', async () => {
      const invalidOptions: ImportOptions = {
        name: '', // Invalid empty name
        version: 'invalid.version.format',
        source: ''
      };

      const result = await importManager.importSpec(invalidOptions);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid import options');
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    test('should handle security scan issues', async () => {
      const processingResultWithIssues = {
        ...mockProcessingResult,
        securityScan: {
          ...mockProcessingResult.securityScan,
          issues: [
            {
              type: 'script_injection' as const,
              severity: 'critical' as const,
              location: 'info.description',
              context: 'description' as const,
              pattern: '<script>',
              message: 'Script injection detected',
              ruleId: 'script-injection'
            }
          ],
          summary: { critical: 1, high: 0, medium: 0, low: 0 },
          blocked: true
        }
      };

      mockSpecProcessor.processSpec.mockResolvedValue(processingResultWithIssues);

      const result = await importManager.importSpec(validImportOptions);

      expect(result.success).toBe(false);
      expect(result.message).toContain('security issues');
      expect(result.securityScan).toEqual(processingResultWithIssues.securityScan);
      expect(mockManifestManager.addSpec).not.toHaveBeenCalled();
    });

    test('should allow import with security issues when not in strict mode', async () => {
      const processingResultWithNonCriticalIssues = {
        ...mockProcessingResult,
        securityScan: {
          ...mockProcessingResult.securityScan,
          issues: [
            {
              type: 'suspicious_content' as const,
              severity: 'medium' as const,
              location: 'paths./test.description',
              context: 'description' as const,
              pattern: 'suspicious',
              message: 'Suspicious content detected',
              ruleId: 'suspicious-content'
            }
          ],
          summary: { critical: 0, high: 0, medium: 1, low: 0 },
          blocked: false
        }
      };

      mockSpecProcessor.processSpec.mockResolvedValue(processingResultWithNonCriticalIssues);

      const result = await importManager.importSpec(validImportOptions);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('1 security issue(s) found but import allowed');
      expect(result.securityScan).toEqual(processingResultWithNonCriticalIssues.securityScan);
      expect(mockManifestManager.addSpec).toHaveBeenCalled();
    });

    test('should reject import with medium issues in strict security mode', async () => {
      const processingResultWithMediumIssues = {
        ...mockProcessingResult,
        securityScan: {
          ...mockProcessingResult.securityScan,
          issues: [
            {
              type: 'suspicious_content' as const,
              severity: 'medium' as const,
              location: 'paths./test.description',
              context: 'description' as const,
              pattern: 'suspicious',
              message: 'Suspicious content detected',
              ruleId: 'suspicious-content'
            }
          ],
          summary: { critical: 0, high: 0, medium: 1, low: 0 },
          blocked: false
        }
      };

      mockSpecProcessor.processSpec.mockResolvedValue(processingResultWithMediumIssues);

      const strictOptions = {
        ...validImportOptions,
        strictSecurity: true
      };

      const result = await importManager.importSpec(strictOptions);

      expect(result.success).toBe(false);
      expect(result.message).toContain('security issues in strict mode');
      expect(mockManifestManager.addSpec).not.toHaveBeenCalled();
    });

    test('should skip security scanning when requested', async () => {
      const skipSecurityOptions = {
        ...validImportOptions,
        skipSecurity: true
      };

      const result = await importManager.importSpec(skipSecurityOptions);

      expect(result.success).toBe(true);
      expect(mockSpecProcessor.processSpec).toHaveBeenCalledWith('/path/to/api.json', true);
    });

    test('should handle spec processing errors', async () => {
      mockSpecProcessor.processSpec.mockRejectedValue(new Error('Invalid OpenAPI spec'));

      const result = await importManager.importSpec(validImportOptions);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid OpenAPI spec');
      expect(result.errors).toContain('Invalid OpenAPI spec');
      expect(mockManifestManager.addSpec).not.toHaveBeenCalled();
    });

    test('should handle manifest manager errors', async () => {
      mockManifestManager.addSpec.mockImplementation(() => {
        throw new Error('Manifest write error');
      });

      const result = await importManager.importSpec(validImportOptions);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Manifest write error');
      expect(result.errors).toContain('Manifest write error');
    });

    test('should handle file system errors', async () => {
      mockManifestManager.storeSpecFile.mockImplementation(() => {
        throw new Error('Disk full');
      });

      const result = await importManager.importSpec(validImportOptions);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Disk full');
      expect(result.errors).toContain('Disk full');
    });

    test('should call onChange callback when provided', async () => {
      await importManager.importSpec(validImportOptions);

      expect(mockOnSpecChange).toHaveBeenCalled();
    });

    test('should handle onChange callback errors gracefully', async () => {
      mockOnSpecChange.mockRejectedValue(new Error('Callback error'));

      const result = await importManager.importSpec(validImportOptions);

      // Import should still succeed even if callback fails
      expect(result.success).toBe(true);
      expect(mockOnSpecChange).toHaveBeenCalled();
    });

    test('should work without onChange callback', async () => {
      const importManagerWithoutCallback = new ImportManager();
      
      const result = await importManagerWithoutCallback.importSpec(validImportOptions);

      expect(result.success).toBe(true);
    });
  });

  describe('removeSpec', () => {
    test('should successfully remove an existing spec', async () => {
      mockManifestManager.hasSpec.mockReturnValue(true);
      mockManifestManager.removeSpec.mockReturnValue(true);

      const result = await importManager.removeSpec('custom:test-api:1.0.0');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully removed');
      expect(mockManifestManager.removeSpec).toHaveBeenCalledWith('custom:test-api:1.0.0');
      expect(mockOnSpecChange).toHaveBeenCalled();
    });

    test('should handle non-existent spec removal', async () => {
      mockManifestManager.removeSpec.mockReturnValue(false);

      const result = await importManager.removeSpec('custom:nonexistent:1.0.0');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
      expect(mockOnSpecChange).not.toHaveBeenCalled();
    });

    test('should handle manifest manager errors during removal', async () => {
      mockManifestManager.hasSpec.mockReturnValue(true);
      mockManifestManager.removeSpec.mockImplementation(() => {
        throw new Error('Remove error');
      });

      const result = await importManager.removeSpec('custom:test-api:1.0.0');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Remove error');
    });
  });

  describe('validateImportOptions', () => {
    test('should validate name format', () => {
      const invalidNames = ['', '123invalid', 'invalid name with spaces', 'a'.repeat(256)];
      
      invalidNames.forEach(name => {
        const options = { ...validImportOptions, name };
        const importManagerInstance = new (ImportManager as any)();
        const result = importManagerInstance.validateImportOptions(options);
        
        expect(result.valid).toBe(false);
        expect(result.errors.some((error: string) => error.toLowerCase().includes('name'))).toBe(true);
      });
    });

    test('should validate version format', () => {
      const invalidVersions = ['', 'invalid.version', '1.2.3.4.5', 'v1.0.0'];
      
      invalidVersions.forEach(version => {
        const options = { ...validImportOptions, version };
        const importManagerInstance = new (ImportManager as any)();
        const result = importManagerInstance.validateImportOptions(options);
        
        expect(result.valid).toBe(false);
        expect(result.errors.some((error: string) => error.toLowerCase().includes('version'))).toBe(true);
      });
    });

    test('should validate source format', () => {
      const invalidSources = ['', 'not-a-valid-path-or-url'];
      
      invalidSources.forEach(source => {
        const options = { ...validImportOptions, source };
        const importManagerInstance = new (ImportManager as any)();
        const result = importManagerInstance.validateImportOptions(options);
        
        expect(result.valid).toBe(false);
        expect(result.errors.some((error: string) => error.toLowerCase().includes('source'))).toBe(true);
      });
    });

    test('should accept valid options', () => {
      const importManagerInstance = new (ImportManager as any)();
      const result = importManagerInstance.validateImportOptions(validImportOptions);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    test('should handle very long file paths', async () => {
      const longPath = '/very/' + 'long/'.repeat(100) + 'path/to/api.json';
      const longPathOptions = {
        ...validImportOptions,
        source: longPath
      };

      const result = await importManager.importSpec(longPathOptions);

      expect(result.success).toBe(true);
      expect(mockSpecProcessor.processSpec).toHaveBeenCalledWith(longPath, false);
    });

    test('should handle special characters in names', async () => {
      const specialCharOptions = {
        ...validImportOptions,
        name: 'test-api_v2',
        version: '2.0.0-beta.1'
      };

      const result = await importManager.importSpec(specialCharOptions);

      expect(result.success).toBe(true);
      expect(result.specId).toBe('custom:test-api_v2:2.0.0-beta.1');
    });

    test('should handle Unicode characters in spec content', async () => {
      const unicodeProcessingResult = {
        ...mockProcessingResult,
        metadata: {
          ...mockProcessingResult.metadata,
          title: 'Test API 测试',
          description: 'API with émojis 🚀'
        }
      };

      mockSpecProcessor.processSpec.mockResolvedValue(unicodeProcessingResult);

      const result = await importManager.importSpec(validImportOptions);

      expect(result.success).toBe(true);
      expect(mockManifestManager.addSpec).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test API 测试',
          description: 'API with émojis 🚀'
        })
      );
    });
  });
});