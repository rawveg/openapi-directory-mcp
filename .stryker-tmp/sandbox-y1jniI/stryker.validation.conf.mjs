/**
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
// @ts-nocheck

export default {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'jest',
  coverageAnalysis: 'perTest',
  
  // Focus specifically on validation module that was just fixed
  mutate: [
    'src/utils/validation.ts'
  ],
  
  ignore: [
    'src/**/*.test.ts',
    'src/**/*.spec.ts', 
    'tests/**/*',
    'dist/**/*',
    'node_modules/**/*'
  ],
  
  // Jest configuration optimized for validation testing
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
      testMatch: [
        '<rootDir>/tests/unit/utils/validation.test.ts',
        '<rootDir>/tests/unit/**/validation*.test.ts'
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
  
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  
  // Higher thresholds for critical security module
  thresholds: {
    high: 95,
    low: 85,
    break: 75
  },
  
  timeoutMS: 120000, // Longer timeout for DOMPurify operations
  timeoutFactor: 3,
  
  concurrency: 2, // Lower concurrency for focused testing
  
  htmlReporter: {
    fileName: 'validation-mutation-report.html'
  },
  
  logLevel: 'info',
  
  plugins: [
    '@stryker-mutator/jest-runner',
    '@stryker-mutator/typescript-checker'
  ],
  
  // Focus on security-relevant mutations
  mutator: {
    plugins: ['typescript'],
    excludedMutations: [
      // Keep these mutations as they're critical for security testing
      // 'ConditionalExpression', 
      // 'EqualityOperator',
      // 'LogicalOperator'
    ]
  }
};