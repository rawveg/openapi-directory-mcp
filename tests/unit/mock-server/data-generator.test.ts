/**
 * Unit tests for MockDataGenerator
 * Tests all data generation scenarios with schema-aware generation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { MockDataGenerator, createDataGenerator, generateMockData, generateVariedResponses } from '../../../src/mock-server/data-generator.js';
import { OpenAPISchema } from '../../../src/types/openapi.js';

describe('MockDataGenerator', () => {
  let generator: MockDataGenerator;

  beforeEach(() => {
    generator = new MockDataGenerator({ seed: 12345 }); // Use seed for deterministic tests
  });

  describe('String Generation', () => {
    it('should generate basic strings', () => {
      const schema: OpenAPISchema = { type: 'string' };
      const result = generator.generateString(schema);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should respect string length constraints', () => {
      const schema: OpenAPISchema = { 
        type: 'string', 
        minLength: 5, 
        maxLength: 10 
      };
      const result = generator.generateString(schema);
      
      expect(result.length).toBeGreaterThanOrEqual(5);
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should generate format-aware strings', () => {
      const emailSchema: OpenAPISchema = { type: 'string', format: 'email' };
      const emailResult = generator.generateString(emailSchema);
      expect(emailResult).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

      const uuidSchema: OpenAPISchema = { type: 'string', format: 'uuid' };
      const uuidResult = generator.generateString(uuidSchema);
      expect(uuidResult).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      const dateSchema: OpenAPISchema = { type: 'string', format: 'date' };
      const dateResult = generator.generateString(dateSchema);
      expect(dateResult).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const dateTimeSchema: OpenAPISchema = { type: 'string', format: 'date-time' };
      const dateTimeResult = generator.generateString(dateTimeSchema);
      expect(dateTimeResult).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should use example data when available', () => {
      const schema: OpenAPISchema = { 
        type: 'string', 
        example: 'test-example' 
      };
      const result = generator.generateString(schema);
      
      expect(result).toBe('test-example');
    });

    it('should handle enum values', () => {
      const schema: OpenAPISchema = { 
        type: 'string', 
        enum: ['option1', 'option2', 'option3'] 
      };
      const result = generator.generateString(schema);
      
      expect(['option1', 'option2', 'option3']).toContain(result);
    });

    it('should generate field-name aware strings', () => {
      const schema: OpenAPISchema = { type: 'string' };
      
      const emailResult = generator.generateString(schema, 'email');
      expect(emailResult).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

      const nameResult = generator.generateString(schema, 'name');
      expect(typeof nameResult).toBe('string');
      expect(nameResult.length).toBeGreaterThan(0);

      const phoneResult = generator.generateString(schema, 'phone');
      expect(typeof phoneResult).toBe('string');
      expect(phoneResult.length).toBeGreaterThan(0);
    });

    it('should handle pattern constraints for simple patterns', () => {
      const alphanumericSchema: OpenAPISchema = { 
        type: 'string', 
        pattern: '^[a-zA-Z0-9]+$',
        minLength: 5,
        maxLength: 10
      };
      const result = generator.generateString(alphanumericSchema);
      
      expect(result).toMatch(/^[a-zA-Z0-9]+$/);
      expect(result.length).toBeGreaterThanOrEqual(5);
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Number Generation', () => {
    it('should generate integers', () => {
      const schema: OpenAPISchema = { type: 'integer' };
      const result = generator.generateNumber(schema);
      
      expect(typeof result).toBe('number');
      expect(Number.isInteger(result)).toBe(true);
    });

    it('should generate floats', () => {
      const schema: OpenAPISchema = { type: 'number' };
      const result = generator.generateNumber(schema);
      
      expect(typeof result).toBe('number');
    });

    it('should respect numeric constraints', () => {
      const schema: OpenAPISchema = { 
        type: 'integer', 
        minimum: 10, 
        maximum: 20 
      };
      const result = generator.generateNumber(schema);
      
      expect(result).toBeGreaterThanOrEqual(10);
      expect(result).toBeLessThanOrEqual(20);
    });

    it('should handle exclusive bounds', () => {
      const schema: OpenAPISchema = { 
        type: 'integer', 
        minimum: 10,
        maximum: 20,
        exclusiveMinimum: true,
        exclusiveMaximum: true
      };
      const result = generator.generateNumber(schema);
      
      expect(result).toBeGreaterThan(10);
      expect(result).toBeLessThan(20);
    });

    it('should handle multipleOf constraint', () => {
      const schema: OpenAPISchema = { 
        type: 'integer', 
        minimum: 0,
        maximum: 100,
        multipleOf: 5
      };
      const result = generator.generateNumber(schema);
      
      expect(result % 5).toBe(0);
    });

    it('should use example data when available', () => {
      const schema: OpenAPISchema = { 
        type: 'number', 
        example: 42.5 
      };
      const result = generator.generateNumber(schema);
      
      expect(result).toBe(42.5);
    });

    it('should handle enum values', () => {
      const schema: OpenAPISchema = { 
        type: 'integer', 
        enum: [1, 5, 10, 15] 
      };
      const result = generator.generateNumber(schema);
      
      expect([1, 5, 10, 15]).toContain(result);
    });
  });

  describe('Array Generation', () => {
    it('should generate arrays with basic items', () => {
      const schema: OpenAPISchema = { 
        type: 'array',
        items: { type: 'string' }
      };
      const result = generator.generateArray(schema);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(item => expect(typeof item).toBe('string'));
    });

    it('should respect array length constraints', () => {
      const schema: OpenAPISchema = { 
        type: 'array',
        items: { type: 'string' },
        minItems: 3,
        maxItems: 5
      };
      const result = generator.generateArray(schema);
      
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should handle tuple-style arrays', () => {
      const schema: OpenAPISchema = { 
        type: 'array',
        items: [
          { type: 'string' },
          { type: 'number' },
          { type: 'boolean' }
        ]
      };
      const result = generator.generateArray(schema);
      
      expect(Array.isArray(result)).toBe(true);
      if (result.length >= 3) {
        expect(typeof result[0]).toBe('string');
        expect(typeof result[1]).toBe('number');
        expect(typeof result[2]).toBe('boolean');
      }
    });

    it('should handle uniqueItems constraint', () => {
      const schema: OpenAPISchema = { 
        type: 'array',
        items: { type: 'string', enum: ['a', 'b', 'c'] },
        uniqueItems: true,
        minItems: 3,
        maxItems: 3
      };
      const result = generator.generateArray(schema);
      
      const uniqueItems = new Set(result);
      expect(uniqueItems.size).toBe(result.length);
    });

    it('should use example data when available', () => {
      const schema: OpenAPISchema = { 
        type: 'array',
        items: { type: 'string' },
        example: ['test1', 'test2', 'test3']
      };
      const result = generator.generateArray(schema);
      
      expect(result).toEqual(['test1', 'test2', 'test3']);
    });

    it('should handle arrays without items schema', () => {
      const schema: OpenAPISchema = { type: 'array' };
      const result = generator.generateArray(schema);
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Object Generation', () => {
    it('should generate objects with properties', () => {
      const schema: OpenAPISchema = { 
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
          active: { type: 'boolean' }
        }
      };
      const result = generator.generateObject(schema);
      
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });

    it('should include required properties', () => {
      const schema: OpenAPISchema = { 
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
          email: { type: 'string' }
        },
        required: ['name', 'email']
      };
      const result = generator.generateObject(schema);
      
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
      expect(typeof result.name).toBe('string');
      expect(typeof result.email).toBe('string');
    });

    it('should handle additionalProperties: true', () => {
      const schema: OpenAPISchema = { 
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        additionalProperties: true
      };
      const result = generator.generateObject(schema);
      
      expect(typeof result).toBe('object');
      // May have additional properties beyond 'name'
    });

    it('should handle additionalProperties with schema', () => {
      const schema: OpenAPISchema = { 
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        additionalProperties: { type: 'number' }
      };
      const result = generator.generateObject(schema);
      
      expect(typeof result).toBe('object');
      // Additional properties should be numbers if present
      Object.keys(result).forEach(key => {
        if (key !== 'name') {
          expect(typeof result[key]).toBe('number');
        }
      });
    });

    it('should respect property count constraints', () => {
      const schema: OpenAPISchema = { 
        type: 'object',
        properties: {
          prop1: { type: 'string' },
          prop2: { type: 'string' }
        },
        minProperties: 3
      };
      const result = generator.generateObject(schema);
      
      expect(Object.keys(result).length).toBeGreaterThanOrEqual(3);
    });

    it('should use example data when available', () => {
      const exampleData = { name: 'John', age: 30 };
      const schema: OpenAPISchema = { 
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' }
        },
        example: exampleData
      };
      const result = generator.generateObject(schema);
      
      expect(result).toEqual(exampleData);
    });

    it('should handle nested objects', () => {
      const schema: OpenAPISchema = { 
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              profile: {
                type: 'object',
                properties: {
                  bio: { type: 'string' }
                }
              }
            }
          }
        }
      };
      const result = generator.generateObject(schema);
      
      expect(typeof result).toBe('object');
      if (result.user) {
        expect(typeof result.user).toBe('object');
      }
    });
  });

  describe('Example Data Usage', () => {
    it('should return example data when available', () => {
      const schema: OpenAPISchema = { 
        type: 'string', 
        example: 'test-example' 
      };
      const result = generator.useExampleData(schema);
      
      expect(result).toBe('test-example');
    });

    it('should return null when no example data', () => {
      const schema: OpenAPISchema = { type: 'string' };
      const result = generator.useExampleData(schema);
      
      expect(result).toBeNull();
    });

    it('should handle examples array', () => {
      const schema: OpenAPISchema = { 
        type: 'string', 
        examples: ['example1', 'example2', 'example3'] 
      };
      const result = generator.useExampleData(schema);
      
      expect(['example1', 'example2', 'example3']).toContain(result);
    });

    it('should respect useExamples configuration', () => {
      const generatorWithoutExamples = new MockDataGenerator({ useExamples: false });
      const schema: OpenAPISchema = { 
        type: 'string', 
        example: 'test-example' 
      };
      const result = generatorWithoutExamples.useExampleData(schema);
      
      expect(result).toBeNull();
    });
  });

  describe('Varied Data Generation', () => {
    it('should generate data based on schema type', () => {
      const stringSchema: OpenAPISchema = { type: 'string' };
      const stringResult = generator.generateVariedData(stringSchema);
      expect(typeof stringResult).toBe('string');

      const numberSchema: OpenAPISchema = { type: 'number' };
      const numberResult = generator.generateVariedData(numberSchema);
      expect(typeof numberResult).toBe('number');

      const booleanSchema: OpenAPISchema = { type: 'boolean' };
      const booleanResult = generator.generateVariedData(booleanSchema);
      expect(typeof booleanResult).toBe('boolean');

      const nullSchema: OpenAPISchema = { type: 'null' };
      const nullResult = generator.generateVariedData(nullSchema);
      expect(nullResult).toBeNull();
    });

    it('should handle schemas without explicit type', () => {
      const objectLikeSchema: OpenAPISchema = { 
        properties: { name: { type: 'string' } }
      };
      const objectResult = generator.generateVariedData(objectLikeSchema);
      expect(typeof objectResult).toBe('object');

      const arrayLikeSchema: OpenAPISchema = { 
        items: { type: 'string' }
      };
      const arrayResult = generator.generateVariedData(arrayLikeSchema);
      expect(Array.isArray(arrayResult)).toBe(true);

      const enumSchema: OpenAPISchema = { 
        enum: ['a', 'b', 'c'] 
      };
      const enumResult = generator.generateVariedData(enumSchema);
      expect(['a', 'b', 'c']).toContain(enumResult);
    });

    it('should prioritize example data', () => {
      const schema: OpenAPISchema = { 
        type: 'string', 
        example: 'priority-example' 
      };
      const result = generator.generateVariedData(schema);
      
      expect(result).toBe('priority-example');
    });
  });

  describe('Response Data Generation', () => {
    it('should generate complete response data', () => {
      const schema: OpenAPISchema = { 
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          items: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['id', 'name']
      };
      const result = generator.generateResponseData(schema);
      
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(typeof result.id).toBe('number');
      expect(typeof result.name).toBe('string');
    });

    it('should reset depth for each response generation', () => {
      const deepSchema: OpenAPISchema = { 
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  value: { type: 'string' }
                }
              }
            }
          }
        }
      };
      
      const result1 = generator.generateResponseData(deepSchema);
      const result2 = generator.generateResponseData(deepSchema);
      
      expect(typeof result1).toBe('object');
      expect(typeof result2).toBe('object');
    });
  });

  describe('Configuration and State Management', () => {
    it('should respect maxArrayLength configuration', () => {
      const generatorWithSmallArrays = new MockDataGenerator({ maxArrayLength: 2 });
      const schema: OpenAPISchema = { 
        type: 'array',
        items: { type: 'string' }
      };
      const result = generatorWithSmallArrays.generateArray(schema);
      
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should respect maxObjectDepth configuration', () => {
      const generatorWithShallowDepth = new MockDataGenerator({ maxObjectDepth: 2 });
      const deepSchema: OpenAPISchema = { 
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  level3: { type: 'string' }
                }
              }
            }
          }
        }
      };
      
      const result = generatorWithShallowDepth.generateResponseData(deepSchema);
      expect(typeof result).toBe('object');
      // Should not generate infinitely deep objects
    });

    it('should reset generation state', () => {
      generator.generateString({ type: 'string' });
      const statsBefore = generator.getStats();
      
      generator.reset();
      const statsAfter = generator.getStats();
      
      expect(statsAfter.totalGenerations).toBe(0);
      expect(statsAfter.uniqueSchemas).toBe(0);
    });

    it('should update configuration', () => {
      generator.updateConfig({ useExamples: false });
      
      const schema: OpenAPISchema = { 
        type: 'string', 
        example: 'should-not-use' 
      };
      const result = generator.useExampleData(schema);
      
      expect(result).toBeNull();
    });

    it('should provide generation statistics', () => {
      generator.generateString({ type: 'string' });
      generator.generateNumber({ type: 'number' });
      
      const stats = generator.getStats();
      expect(typeof stats.totalGenerations).toBe('number');
      expect(typeof stats.uniqueSchemas).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unresolved references', () => {
      const reference = { $ref: '#/components/schemas/UnresolvedSchema' };
      
      expect(() => generator.generateString(reference)).toThrow();
      expect(() => generator.generateNumber(reference)).toThrow();
      expect(() => generator.generateArray(reference)).toThrow();
      expect(() => generator.generateObject(reference)).toThrow();
      expect(() => generator.generateVariedData(reference)).toThrow();
    });

    it('should handle invalid length constraints gracefully', () => {
      const schema: OpenAPISchema = { 
        type: 'string', 
        minLength: 10, 
        maxLength: 5 // Invalid: min > max
      };
      
      expect(() => generator.generateString(schema)).not.toThrow();
      const result = generator.generateString(schema);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle invalid numeric constraints gracefully', () => {
      const schema: OpenAPISchema = { 
        type: 'number', 
        minimum: 100, 
        maximum: 50 // Invalid: min > max
      };
      
      expect(() => generator.generateNumber(schema)).not.toThrow();
      const result = generator.generateNumber(schema);
      expect(typeof result).toBe('number');
    });
  });
});

describe('Factory Functions', () => {
  describe('createDataGenerator', () => {
    it('should create generator with default config', () => {
      const generator = createDataGenerator();
      expect(generator).toBeInstanceOf(MockDataGenerator);
    });

    it('should create generator with custom config', () => {
      const generator = createDataGenerator({ useExamples: false, maxArrayLength: 10 });
      expect(generator).toBeInstanceOf(MockDataGenerator);
    });
  });

  describe('generateMockData', () => {
    it('should generate mock data for schema', () => {
      const schema: OpenAPISchema = { type: 'string' };
      const result = generateMockData(schema);
      
      expect(typeof result).toBe('string');
    });

    it('should use field name for generation', () => {
      const schema: OpenAPISchema = { type: 'string' };
      const result = generateMockData(schema, 'email');
      
      expect(typeof result).toBe('string');
    });

    it('should use custom config', () => {
      const schema: OpenAPISchema = { 
        type: 'string', 
        example: 'test-example' 
      };
      const result = generateMockData(schema, undefined, { useExamples: false });
      
      expect(result).not.toBe('test-example');
    });
  });

  describe('generateVariedResponses', () => {
    it('should generate multiple varied responses', () => {
      const schema: OpenAPISchema = { 
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' }
        }
      };
      const results = generateVariedResponses(schema, 3);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(typeof result).toBe('object');
      });
    });

    it('should use custom config for varied responses', () => {
      const schema: OpenAPISchema = { 
        type: 'array',
        items: { type: 'string' }
      };
      const results = generateVariedResponses(schema, 2, { maxArrayLength: 2 });
      
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeLessThanOrEqual(2);
      });
    });
  });
});