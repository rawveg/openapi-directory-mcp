/**
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress', 'dashboard'],
  testRunner: 'jest',
  coverageAnalysis: 'perTest',
  
  // Focus on critical validation and security modules
  mutate: [
    'src/utils/validation.ts',
    'src/utils/errors.ts', 
    'src/utils/logger.ts',
    'src/cache/manager.ts',
    'src/cache/persistent-manager.ts',
    'src/api/dual-source-client.ts',
    'src/custom-specs/security-scanner.ts',
    'src/custom-specs/spec-processor.ts'
  ],
  
  // Exclude test files and non-critical utilities
  ignore: [
    'src/**/*.test.ts',
    'src/**/*.spec.ts',
    'tests/**/*',
    'dist/**/*',
    'node_modules/**/*',
    'src/index.ts', // Entry point - less critical for mutation testing
    'src/tools/**/*', // Tool definitions - less critical
    'src/utils/constants.ts' // Constants don't need mutation testing
  ],
  
  // Jest configuration
  jest: {
    projectType: 'custom',
    config: {
      preset: 'ts-jest/presets/default-esm',
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapping: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
      },
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.test.ts',
        '!src/**/*.spec.ts',
        '!src/index.ts'
      ],
      testMatch: [
        '<rootDir>/tests/unit/**/*.test.ts'
      ],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          useESM: true,
          tsconfig: {
            module: 'ESNext',
            target: 'ESNext'
          }
        }]
      }
    }
  },
  
  // TypeScript checking
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  
  // Thresholds for mutation score
  thresholds: {
    high: 85,
    low: 70,
    break: 60
  },
  
  // Timeout settings
  timeoutMS: 60000,
  timeoutFactor: 2,
  
  // Concurrency
  concurrency: 4,
  
  // Dashboard settings (optional - for stryker-mutator.io)
  dashboard: {
    project: 'github.com/rawveg/openapi-directory-mcp',
    version: 'main'
  },
  
  // HTML report settings
  htmlReporter: {
    fileName: 'mutation-report.html'
  },
  
  // Logging
  logLevel: 'info',
  fileLogLevel: 'trace',
  
  // Plugins
  plugins: [
    '@stryker-mutator/jest-runner',
    '@stryker-mutator/typescript-checker'
  ],
  
  // Specific mutations to focus on for security-critical code
  mutator: {
    plugins: ['typescript'],
    excludedMutations: [
      // Exclude some mutations that might cause infinite loops in tests
      'ArithmeticOperator', // Can cause infinite loops
      'UpdateOperator'      // Can cause infinite loops
    ]
  },
  
  // Custom configuration for different scenarios
  buildCommand: 'npm run build'
};