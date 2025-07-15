// @ts-nocheck
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { SpecProcessor } from '../../../src/custom-specs/spec-processor.js';
import { SecurityScanner } from '../../../src/custom-specs/security-scanner.js';
import { ValidationResult, SpecProcessingResult } from '../../../src/custom-specs/types.js';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import axios from 'axios';

// Mock dependencies
jest.mock('fs');
jest.mock('js-yaml');
jest.mock('axios');
jest.mock('@apidevtools/swagger-parser');
jest.mock('../../../src/custom-specs/security-scanner.js');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedYaml = yaml as jest.Mocked<typeof yaml>;
const mockedAxios = axios as jest.Mocked<typeof axios>;
const MockedSecurityScanner = SecurityScanner as jest.MockedClass<typeof SecurityScanner>;

describe('SpecProcessor', () => {
  let specProcessor: SpecProcessor;
  let mockSecurityScanner: jest.Mocked<SecurityScanner>;

  const validOpenAPISpec = {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
      description: 'A test API specification'
    },
    paths: {
      '/users': {
        get: {
          summary: 'Get users',
          responses: {
            '200': {
              description: 'Success'
            }
          }
        }
      }
    }
  };

  const mockSecurityScanResult = {
    scannedAt: '2023-01-01T00:00:00.000Z',
    issues: [],
    summary: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    blocked: false
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SecurityScanner
    mockSecurityScanner = {
      scanSpec: jest.fn().mockResolvedValue(mockSecurityScanResult)
    } as any;

    MockedSecurityScanner.mockImplementation(() => mockSecurityScanner);

    specProcessor = new SpecProcessor();
  });

  describe('processSpec', () => {
    test('should process valid JSON spec from file', async () => {
      const jsonContent = JSON.stringify(validOpenAPISpec);
      mockedFs.readFileSync.mockReturnValue(jsonContent);

      // Mock SwaggerParser validation
      const SwaggerParser = require('@apidevtools/swagger-parser');
      SwaggerParser.validate = jest.fn().mockResolvedValue(validOpenAPISpec);

      const result = await specProcessor.processSpec('/path/to/spec.json');

      expect(result).toEqual(
        expect.objectContaining({
          spec: expect.objectContaining({
            preferred: '1.0.0',
            versions: expect.objectContaining({
              '1.0.0': expect.objectContaining({
                info: expect.objectContaining({
                  title: 'Test API',
                  version: '1.0.0'
                })
              })
            })
          }),
          originalFormat: 'json',
          securityScan: mockSecurityScanResult,
          metadata: expect.objectContaining({
            title: 'Test API',
            version: '1.0.0',
            description: 'A test API specification'
          })
        })
      );
    });

    test('should process valid YAML spec from file', async () => {
      const yamlContent = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
  description: A test API specification
paths:
  /users:
    get:
      summary: Get users
      responses:
        '200':
          description: Success
`;
      mockedFs.readFileSync.mockReturnValue(yamlContent);
      mockedYaml.load.mockReturnValue(validOpenAPISpec);

      const SwaggerParser = require('@apidevtools/swagger-parser');
      SwaggerParser.validate = jest.fn().mockResolvedValue(validOpenAPISpec);

      const result = await specProcessor.processSpec('/path/to/spec.yaml');

      expect(result.originalFormat).toBe('yaml');
      expect(mockedYaml.load).toHaveBeenCalledWith(yamlContent, expect.any(Object));
    });

    test('should process spec from URL', async () => {
      const jsonContent = JSON.stringify(validOpenAPISpec);
      mockedAxios.get.mockResolvedValue({ data: jsonContent });

      const SwaggerParser = require('@apidevtools/swagger-parser');
      SwaggerParser.validate = jest.fn().mockResolvedValue(validOpenAPISpec);

      const result = await specProcessor.processSpec('https://example.com/api.json');

      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com/api.json', expect.any(Object));
      expect(result.originalFormat).toBe('json');
    });

    test('should detect format correctly', async () => {
      // Test JSON detection
      const jsonContent = JSON.stringify(validOpenAPISpec);
      mockedFs.readFileSync.mockReturnValue(jsonContent);

      const SwaggerParser = require('@apidevtools/swagger-parser');
      SwaggerParser.validate = jest.fn().mockResolvedValue(validOpenAPISpec);

      let result = await specProcessor.processSpec('/path/to/spec.json');
      expect(result.originalFormat).toBe('json');

      // Test YAML detection
      const yamlContent = 'openapi: 3.0.0\ninfo:\n  title: Test';
      mockedFs.readFileSync.mockReturnValue(yamlContent);
      mockedYaml.load.mockReturnValue(validOpenAPISpec);

      result = await specProcessor.processSpec('/path/to/spec.yaml');
      expect(result.originalFormat).toBe('yaml');
    });

    test('should skip security scanning when requested', async () => {
      const jsonContent = JSON.stringify(validOpenAPISpec);
      mockedFs.readFileSync.mockReturnValue(jsonContent);

      const SwaggerParser = require('@apidevtools/swagger-parser');
      SwaggerParser.validate = jest.fn().mockResolvedValue(validOpenAPISpec);

      const result = await specProcessor.processSpec('/path/to/spec.json', true);

      expect(mockSecurityScanner.scanSpec).not.toHaveBeenCalled();
      expect(result.securityScan).toEqual({
        scannedAt: expect.any(String),
        issues: [],
        summary: { critical: 0, high: 0, medium: 0, low: 0 },
        blocked: false
      });
    });

    test('should include security scan when not skipped', async () => {
      const jsonContent = JSON.stringify(validOpenAPISpec);
      mockedFs.readFileSync.mockReturnValue(jsonContent);

      const SwaggerParser = require('@apidevtools/swagger-parser');
      SwaggerParser.validate = jest.fn().mockResolvedValue(validOpenAPISpec);

      const result = await specProcessor.processSpec('/path/to/spec.json', false);

      expect(mockSecurityScanner.scanSpec).toHaveBeenCalledWith(validOpenAPISpec);
      expect(result.securityScan).toEqual(mockSecurityScanResult);
    });

    test('should convert to ApiGuruAPI format correctly', async () => {
      const jsonContent = JSON.stringify(validOpenAPISpec);
      mockedFs.readFileSync.mockReturnValue(jsonContent);

      const SwaggerParser = require('@apidevtools/swagger-parser');
      SwaggerParser.validate = jest.fn().mockResolvedValue(validOpenAPISpec);

      const result = await specProcessor.processSpec('/path/to/spec.json');

      expect(result.spec).toEqual(
        expect.objectContaining({
          added: expect.any(String),
          preferred: '1.0.0',
          versions: expect.objectContaining({
            '1.0.0': expect.objectContaining({
              added: expect.any(String),
              updated: expect.any(String),
              info: expect.objectContaining({
                ...validOpenAPISpec.info,
                'x-providerName': 'custom',
                'x-apisguru-categories': ['custom']
              }),
              swaggerUrl: 'custom/spec.json',
              swaggerYamlUrl: 'custom/spec.yaml',
              openapiVer: '3.0.0',
              link: ''
            })
          })
        })
      );
    });

    test('should extract metadata correctly', async () => {
      const specWithContact = {
        ...validOpenAPISpec,
        info: {
          ...validOpenAPISpec.info,
          contact: {
            name: 'API Team',
            email: 'api@example.com',
            url: 'https://example.com'
          }
        }
      };

      const jsonContent = JSON.stringify(specWithContact);
      mockedFs.readFileSync.mockReturnValue(jsonContent);

      const SwaggerParser = require('@apidevtools/swagger-parser');
      SwaggerParser.validate = jest.fn().mockResolvedValue(specWithContact);

      const result = await specProcessor.processSpec('/path/to/spec.json');

      expect(result.metadata).toEqual({
        title: 'Test API',
        description: 'A test API specification',
        version: '1.0.0',
        fileSize: expect.any(Number)
      });
    });

    test('should handle file reading errors', async () => {
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(specProcessor.processSpec('/nonexistent/spec.json'))
        .rejects.toThrow('File not found');
    });

    test('should handle URL fetching errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(specProcessor.processSpec('https://invalid.url/spec.json'))
        .rejects.toThrow('Network error');
    });

    test('should handle invalid JSON', async () => {
      mockedFs.readFileSync.mockReturnValue('invalid json {');
      mockedYaml.load.mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      await expect(specProcessor.processSpec('/path/to/invalid.json'))
        .rejects.toThrow('Failed to parse YAML: Invalid YAML');
    });

    test('should handle invalid YAML', async () => {
      const invalidYaml = 'invalid:\nyaml\n  - content\n bad indentation';
      mockedFs.readFileSync.mockReturnValue(invalidYaml);
      mockedYaml.load.mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      await expect(specProcessor.processSpec('/path/to/invalid.yaml'))
        .rejects.toThrow('Invalid YAML');
    });

    test('should handle OpenAPI validation failures', async () => {
      const invalidSpec = { notOpenAPI: true };
      const jsonContent = JSON.stringify(invalidSpec);
      mockedFs.readFileSync.mockReturnValue(jsonContent);

      const SwaggerParser = require('@apidevtools/swagger-parser');
      SwaggerParser.validate = jest.fn().mockRejectedValue(
        new Error('Invalid OpenAPI spec')
      );

      await expect(specProcessor.processSpec('/path/to/invalid-openapi.json'))
        .rejects.toThrow('Invalid OpenAPI specification');
    });

    test('should handle missing required fields gracefully', async () => {
      const incompleteSpec = {
        openapi: '3.0.0',
        info: {
          title: 'Incomplete API'
          // Missing version
        }
      };

      const jsonContent = JSON.stringify(incompleteSpec);
      mockedFs.readFileSync.mockReturnValue(jsonContent);

      const SwaggerParser = require('@apidevtools/swagger-parser');
      SwaggerParser.validate = jest.fn().mockResolvedValue(incompleteSpec);

      const result = await specProcessor.processSpec('/path/to/incomplete.json');

      expect(result.metadata.version).toBe('1.0.0'); // Default value
      expect(result.metadata.description).toBe(''); // Default empty description
    });

    test('should detect OpenAPI 2.0 specs', async () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: {
          title: 'Swagger 2.0 API',
          version: '1.0.0'
        },
        paths: {}
      };

      const jsonContent = JSON.stringify(swagger2Spec);
      mockedFs.readFileSync.mockReturnValue(jsonContent);

      const SwaggerParser = require('@apidevtools/swagger-parser');
      SwaggerParser.validate = jest.fn().mockResolvedValue(swagger2Spec);

      const result = await specProcessor.processSpec('/path/to/swagger2.json');

      expect(result.spec.versions['1.0.0'].openapiVer).toBe('2.0');
    });

    test('should handle URL validation', async () => {
      // Valid URLs
      expect(() => {
        const processor = new (SpecProcessor as any)();
        processor.isUrl('https://example.com/api.json');
      }).not.toThrow();

      expect(() => {
        const processor = new (SpecProcessor as any)();
        processor.isUrl('http://example.com/api.yaml');
      }).not.toThrow();

      // Invalid URLs (should be treated as file paths)
      const processor = new (SpecProcessor as any)();
      expect(processor.isUrl('not-a-url')).toBe(false);
      expect(processor.isUrl('/local/file/path')).toBe(false);
    });

    test('should calculate file size correctly', async () => {
      const content = JSON.stringify(validOpenAPISpec);
      mockedFs.readFileSync.mockReturnValue(content);

      const SwaggerParser = require('@apidevtools/swagger-parser');
      SwaggerParser.validate = jest.fn().mockResolvedValue(validOpenAPISpec);

      const result = await specProcessor.processSpec('/path/to/spec.json');

      expect(result.metadata.fileSize).toBe(Buffer.byteLength(content, 'utf8'));
    });

    test('should handle security scanner errors gracefully', async () => {
      const jsonContent = JSON.stringify(validOpenAPISpec);
      mockedFs.readFileSync.mockReturnValue(jsonContent);

      const SwaggerParser = require('@apidevtools/swagger-parser');
      SwaggerParser.validate = jest.fn().mockResolvedValue(validOpenAPISpec);

      mockSecurityScanner.scanSpec.mockRejectedValue(new Error('Security scan failed'));

      await expect(specProcessor.processSpec('/path/to/spec.json'))
        .rejects.toThrow('Security scan failed');
    });
  });

  describe('edge cases', () => {
    test('should handle very large files', async () => {
      const largeSpec = {
        ...validOpenAPISpec,
        paths: {}
      };

      // Create a large spec with many paths
      for (let i = 0; i < 1000; i++) {
        (largeSpec.paths as any)[`/path${i}`] = {
          get: {
            summary: `Path ${i}`,
            responses: { '200': { description: 'Success' } }
          }
        };
      }

      const jsonContent = JSON.stringify(largeSpec);
      mockedFs.readFileSync.mockReturnValue(jsonContent);

      const SwaggerParser = require('@apidevtools/swagger-parser');
      SwaggerParser.validate = jest.fn().mockResolvedValue(largeSpec);

      const result = await specProcessor.processSpec('/path/to/large-spec.json');

      expect(result).toBeDefined();
      expect(result.metadata.fileSize).toBeGreaterThan(10000);
    });

    test('should handle empty files', async () => {
      mockedFs.readFileSync.mockReturnValue('');

      await expect(specProcessor.processSpec('/path/to/empty.json'))
        .rejects.toThrow();
    });

    test('should handle files with only whitespace', async () => {
      mockedFs.readFileSync.mockReturnValue('   \n\t  \n  ');

      await expect(specProcessor.processSpec('/path/to/whitespace.json'))
        .rejects.toThrow();
    });

    test('should handle malformed URLs gracefully', async () => {
      await expect(specProcessor.processSpec('not://a-valid-url'))
        .rejects.toThrow();
    });

    test('should handle timeout errors for URL fetching', async () => {
      mockedAxios.get.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      });

      await expect(specProcessor.processSpec('https://slow.example.com/api.json'))
        .rejects.toThrow('Unexpected error fetching spec');
    });
  });
});