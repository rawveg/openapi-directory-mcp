/**
 * Mock data generator with schema-aware generation
 * Implements realistic data generation for all OpenAPI types with format awareness
 */

import { faker } from '@faker-js/faker';
import { OpenAPISchema, OpenAPIReference } from '../types/openapi.js';
import { DataGenerationStrategy } from './types.js';
import { DataGenerationError } from './errors.js';

/**
 * Configuration for data generation behavior
 */
export interface DataGenerationConfig {
  /** Use example data from schemas when available */
  useExamples: boolean;
  /** Generate varied data on subsequent calls */
  generateVariations: boolean;
  /** Maximum array length for generated arrays */
  maxArrayLength: number;
  /** Maximum object depth for nested objects */
  maxObjectDepth: number;
  /** Seed for reproducible generation (optional) */
  seed?: number;
}

/**
 * Default configuration for data generation
 */
export const DEFAULT_DATA_GENERATION_CONFIG: DataGenerationConfig = {
  useExamples: true,
  generateVariations: true,
  maxArrayLength: 5,
  maxObjectDepth: 10,
};

/**
 * Schema-aware mock data generator implementation
 */
export class MockDataGenerator implements DataGenerationStrategy {
  private config: DataGenerationConfig;
  private generationCount: Map<string, number> = new Map();
  private currentDepth: number = 0;

  constructor(config: Partial<DataGenerationConfig> = {}) {
    this.config = { ...DEFAULT_DATA_GENERATION_CONFIG, ...config };
    
    // Set faker seed if provided for reproducible generation
    if (this.config.seed !== undefined) {
      faker.seed(this.config.seed);
    }
  }

  /**
   * Generate mock data for a string field with format awareness
   */
  generateString(schema: OpenAPISchema | OpenAPIReference, fieldName?: string): string {
    if (this.isReference(schema)) {
      throw new DataGenerationError('unknown', 'string', 'Cannot generate data for unresolved reference');
    }

    // Use example data if available and configured
    if (this.config.useExamples && schema.example !== undefined) {
      return String(schema.example);
    }

    // Handle enum values
    if (schema.enum && schema.enum.length > 0) {
      return String(faker.helpers.arrayElement(schema.enum));
    }

    // Format-aware string generation
    const format = schema.format?.toLowerCase();
    
    switch (format) {
      case 'email':
        return faker.internet.email();
      case 'uri':
      case 'url':
        return faker.internet.url();
      case 'uuid':
        return faker.string.uuid();
      case 'date':
        return faker.date.past().toISOString().split('T')[0]!;
      case 'date-time':
        return faker.date.past().toISOString();
      case 'time':
        return faker.date.recent().toTimeString().split(' ')[0]!;
      case 'password':
        return faker.internet.password({ length: 12 });
      case 'byte':
        return Buffer.from(faker.lorem.words(3)).toString('base64');
      case 'binary':
        return faker.string.binary({ length: 16 });
      case 'hostname':
        return faker.internet.domainName();
      case 'ipv4':
        return faker.internet.ipv4();
      case 'ipv6':
        return faker.internet.ipv6();
      default:
        return this.generateStringByFieldName(fieldName, schema);
    }
  }

  /**
   * Generate string based on field name patterns
   */
  private generateStringByFieldName(fieldName?: string, schema?: OpenAPISchema): string {
    if (!fieldName) {
      return this.generateGenericString(schema);
    }

    const lowerFieldName = fieldName.toLowerCase();

    // Common field name patterns
    if (lowerFieldName.includes('email')) return faker.internet.email();
    if (lowerFieldName.includes('name')) return faker.person.fullName();
    if (lowerFieldName.includes('firstname') || lowerFieldName.includes('first_name')) return faker.person.firstName();
    if (lowerFieldName.includes('lastname') || lowerFieldName.includes('last_name')) return faker.person.lastName();
    if (lowerFieldName.includes('username')) return faker.internet.userName();
    if (lowerFieldName.includes('phone')) return faker.phone.number();
    if (lowerFieldName.includes('address')) return faker.location.streetAddress();
    if (lowerFieldName.includes('city')) return faker.location.city();
    if (lowerFieldName.includes('country')) return faker.location.country();
    if (lowerFieldName.includes('company')) return faker.company.name();
    if (lowerFieldName.includes('title')) return faker.person.jobTitle();
    if (lowerFieldName.includes('description')) return faker.lorem.paragraph();
    if (lowerFieldName.includes('url') || lowerFieldName.includes('link')) return faker.internet.url();
    if (lowerFieldName.includes('color')) return faker.color.human();
    if (lowerFieldName.includes('status')) return faker.helpers.arrayElement(['active', 'inactive', 'pending']);
    if (lowerFieldName.includes('type')) return faker.helpers.arrayElement(['primary', 'secondary', 'tertiary']);

    return this.generateGenericString(schema);
  }

  /**
   * Generate generic string respecting length constraints
   */
  private generateGenericString(schema?: OpenAPISchema): string {
    const minLength = schema?.minLength || 1;
    const maxLength = schema?.maxLength || 50;
    
    // Ensure valid length range
    const actualMinLength = Math.max(1, minLength);
    const actualMaxLength = Math.max(actualMinLength, Math.min(maxLength, 100));
    
    const length = faker.number.int({ min: actualMinLength, max: actualMaxLength });
    
    // Generate pattern-based string if pattern is provided
    if (schema?.pattern) {
      try {
        // Simple pattern handling for common cases
        if (schema.pattern === '^[a-zA-Z0-9]+$') {
          return faker.string.alphanumeric(length);
        }
        if (schema.pattern === '^[0-9]+$') {
          return faker.string.numeric(length);
        }
      } catch {
        // Fall back to generic string if pattern is too complex
      }
    }
    
    return faker.lorem.words(Math.ceil(length / 6)).substring(0, length);
  }

  /**
   * Generate mock data for a numeric field
   */
  generateNumber(schema: OpenAPISchema | OpenAPIReference): number {
    if (this.isReference(schema)) {
      throw new DataGenerationError('unknown', 'number', 'Cannot generate data for unresolved reference');
    }

    // Use example data if available and configured
    if (this.config.useExamples && schema.example !== undefined) {
      return Number(schema.example);
    }

    // Handle enum values
    if (schema.enum && schema.enum.length > 0) {
      return Number(faker.helpers.arrayElement(schema.enum));
    }

    const isInteger = schema.type === 'integer';
    const minimum = schema.minimum ?? (isInteger ? -1000 : -1000.0);
    const maximum = schema.maximum ?? (isInteger ? 1000 : 1000.0);
    
    // Handle exclusive bounds
    const actualMin = schema.exclusiveMinimum === true ? minimum + (isInteger ? 1 : 0.01) : minimum;
    const actualMax = schema.exclusiveMaximum === true ? maximum - (isInteger ? 1 : 0.01) : maximum;

    // Handle invalid constraints gracefully - ensure min <= max
    const validMin = Math.min(actualMin, actualMax);
    const validMax = Math.max(actualMin, actualMax);

    if (isInteger) {
      let value = faker.number.int({ min: Math.ceil(validMin), max: Math.floor(validMax) });
      
      // Handle multipleOf constraint
      if (schema.multipleOf && schema.multipleOf > 0) {
        value = Math.round(value / schema.multipleOf) * schema.multipleOf;
      }
      
      return value;
    } else {
      let value = faker.number.float({ min: validMin, max: validMax, fractionDigits: 2 });
      
      // Handle multipleOf constraint
      if (schema.multipleOf && schema.multipleOf > 0) {
        value = Math.round(value / schema.multipleOf) * schema.multipleOf;
      }
      
      return value;
    }
  }

  /**
   * Generate mock data for an array field
   */
  generateArray(schema: OpenAPISchema | OpenAPIReference): any[] {
    if (this.isReference(schema)) {
      throw new DataGenerationError('unknown', 'array', 'Cannot generate data for unresolved reference');
    }

    // Use example data if available and configured
    if (this.config.useExamples && schema.example !== undefined && Array.isArray(schema.example)) {
      return schema.example;
    }

    // Prevent infinite recursion
    if (this.currentDepth >= this.config.maxObjectDepth) {
      return [];
    }

    const minItems = schema.minItems ?? 1;
    const maxItems = Math.min(schema.maxItems ?? this.config.maxArrayLength, this.config.maxArrayLength);
    const actualLength = faker.number.int({ min: minItems, max: Math.max(minItems, maxItems) });

    if (!schema.items) {
      // No items schema, return array of mixed types
      return Array.from({ length: actualLength }, () => faker.helpers.arrayElement([
        faker.lorem.word(),
        faker.number.int(),
        faker.datatype.boolean()
      ]));
    }

    this.currentDepth++;
    const result: any[] = [];
    
    try {
      for (let i = 0; i < actualLength; i++) {
        if (Array.isArray(schema.items)) {
          // Tuple-style array
          const itemSchema = schema.items[i] || schema.items[schema.items.length - 1];
          if (itemSchema) {
            result.push(this.generateVariedData(itemSchema));
          }
        } else {
          // Single item schema for all elements
          result.push(this.generateVariedData(schema.items));
        }
      }

      // Handle uniqueItems constraint
      if (schema.uniqueItems && result.length > 1) {
        const uniqueResult = Array.from(new Set(result.map(item => JSON.stringify(item))))
          .map(item => JSON.parse(item));
        return uniqueResult;
      }

      return result;
    } finally {
      this.currentDepth--;
    }
  }

  /**
   * Generate mock data for an object field
   */
  generateObject(schema: OpenAPISchema | OpenAPIReference): Record<string, any> {
    if (this.isReference(schema)) {
      throw new DataGenerationError('unknown', 'object', 'Cannot generate data for unresolved reference');
    }

    // Use example data if available and configured
    if (this.config.useExamples && schema.example !== undefined && typeof schema.example === 'object') {
      return schema.example;
    }

    // Prevent infinite recursion
    if (this.currentDepth >= this.config.maxObjectDepth) {
      return {};
    }

    this.currentDepth++;
    const result: Record<string, any> = {};

    try {
      // Generate required properties
      if (schema.required && schema.properties) {
        for (const requiredProp of schema.required) {
          const propSchema = schema.properties[requiredProp];
          if (propSchema) {
            result[requiredProp] = this.generateVariedData(propSchema, requiredProp);
          }
        }
      }

      // Generate optional properties (some of them)
      if (schema.properties) {
        const optionalProps = Object.keys(schema.properties).filter(
          prop => !schema.required?.includes(prop)
        );
        
        // Include some optional properties randomly
        const propsToInclude = optionalProps.filter(() => faker.datatype.boolean(0.6));
        
        for (const prop of propsToInclude) {
          const propSchema = schema.properties[prop];
          if (propSchema) {
            result[prop] = this.generateVariedData(propSchema, prop);
          }
        }
      }

      // Handle additionalProperties
      if (schema.additionalProperties === true) {
        // Add some random additional properties
        const additionalCount = faker.number.int({ min: 0, max: 3 });
        for (let i = 0; i < additionalCount; i++) {
          const propName = faker.lorem.word();
          result[propName] = faker.helpers.arrayElement([
            faker.lorem.word(),
            faker.number.int(),
            faker.datatype.boolean()
          ]);
        }
      } else if (typeof schema.additionalProperties === 'object') {
        // Add additional properties following the schema
        const additionalCount = faker.number.int({ min: 0, max: 2 });
        for (let i = 0; i < additionalCount; i++) {
          const propName = faker.lorem.word();
          result[propName] = this.generateVariedData(schema.additionalProperties);
        }
      }

      // Respect minProperties and maxProperties
      const currentPropCount = Object.keys(result).length;
      const minProps = schema.minProperties ?? 0;
      const maxProps = schema.maxProperties ?? 50;

      // Add more properties if below minimum
      if (currentPropCount < minProps) {
        const propsToAdd = minProps - currentPropCount;
        for (let i = 0; i < propsToAdd; i++) {
          const propName = faker.lorem.word() + i;
          result[propName] = faker.lorem.word();
        }
      }

      // Remove properties if above maximum
      if (currentPropCount > maxProps) {
        const propNames = Object.keys(result);
        const propsToRemove = currentPropCount - maxProps;
        const requiredProps = schema.required || [];
        
        // Remove non-required properties first
        const removableProps = propNames.filter(prop => !requiredProps.includes(prop));
        for (let i = 0; i < Math.min(propsToRemove, removableProps.length); i++) {
          const propToRemove = removableProps[i];
          if (propToRemove) {
            delete result[propToRemove];
          }
        }
      }

      return result;
    } finally {
      this.currentDepth--;
    }
  }

  /**
   * Use example data from OpenAPI spec if available
   */
  useExampleData(schema: OpenAPISchema | OpenAPIReference): any | null {
    if (this.isReference(schema)) {
      return null;
    }

    if (!this.config.useExamples) {
      return null;
    }

    // Check for direct example
    if (schema.example !== undefined) {
      return schema.example;
    }

    // Check for examples array
    if (schema.examples && Array.isArray(schema.examples) && schema.examples.length > 0) {
      return faker.helpers.arrayElement(schema.examples);
    }

    return null;
  }

  /**
   * Generate varied data for the same schema to avoid repetition
   */
  generateVariedData(schema: OpenAPISchema | OpenAPIReference, fieldName?: string): any {
    if (this.isReference(schema)) {
      throw new DataGenerationError('unknown', 'varied', 'Cannot generate data for unresolved reference');
    }

    // Try to use example data first
    const exampleData = this.useExampleData(schema);
    if (exampleData !== null) {
      return exampleData;
    }

    // Generate data based on type
    switch (schema.type) {
      case 'string':
        return this.generateString(schema, fieldName);
      case 'number':
      case 'integer':
        return this.generateNumber(schema);
      case 'boolean':
        return faker.datatype.boolean();
      case 'array':
        return this.generateArray(schema);
      case 'object':
        return this.generateObject(schema);
      case 'null':
        return null;
      default:
        // Handle schemas without explicit type
        if (schema.properties || schema.additionalProperties) {
          return this.generateObject({ ...schema, type: 'object' });
        }
        if (schema.items) {
          return this.generateArray({ ...schema, type: 'array' });
        }
        if (schema.enum) {
          return faker.helpers.arrayElement(schema.enum);
        }
        
        // Default to string for unknown types
        return this.generateString({ ...schema, type: 'string' }, fieldName);
    }
  }

  /**
   * Generate data for a complete response schema
   */
  generateResponseData(schema: OpenAPISchema | OpenAPIReference): any {
    this.currentDepth = 0;
    return this.generateVariedData(schema);
  }

  /**
   * Reset generation state for fresh data
   */
  reset(): void {
    this.generationCount.clear();
    this.currentDepth = 0;
    
    if (this.config.seed !== undefined) {
      faker.seed(this.config.seed);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DataGenerationConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.seed !== undefined) {
      faker.seed(config.seed);
    }
  }

  /**
   * Check if a schema is a reference
   */
  private isReference(schema: OpenAPISchema | OpenAPIReference): schema is OpenAPIReference {
    return '$ref' in schema;
  }

  /**
   * Get generation statistics
   */
  getStats(): { totalGenerations: number; uniqueSchemas: number } {
    const totalGenerations = Array.from(this.generationCount.values()).reduce((sum, count) => sum + count, 0);
    return {
      totalGenerations,
      uniqueSchemas: this.generationCount.size
    };
  }
}

/**
 * Factory function to create a configured data generator
 */
export function createDataGenerator(config?: Partial<DataGenerationConfig>): MockDataGenerator {
  return new MockDataGenerator(config);
}

/**
 * Utility function to generate mock data for a schema
 */
export function generateMockData(
  schema: OpenAPISchema | OpenAPIReference,
  fieldName?: string,
  config?: Partial<DataGenerationConfig>
): any {
  const generator = createDataGenerator(config);
  return generator.generateVariedData(schema, fieldName);
}

/**
 * Utility function to generate multiple varied responses for the same schema
 */
export function generateVariedResponses(
  schema: OpenAPISchema | OpenAPIReference,
  count: number = 3,
  config?: Partial<DataGenerationConfig>
): any[] {
  const generator = createDataGenerator({ ...config, generateVariations: true });
  const responses: any[] = [];
  
  for (let i = 0; i < count; i++) {
    responses.push(generator.generateResponseData(schema));
  }
  
  return responses;
}