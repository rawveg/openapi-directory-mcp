/**
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  packageManager: 'npm',
  reporters: ['html', 'clear-text'],
  testRunner: 'jest',
  coverageAnalysis: 'off', // Faster without coverage analysis
  
  // Focus specifically on the containsSuspiciousContent method
  mutate: [
    'src/utils/validation.ts:679-729' // Line range for containsSuspiciousContent method
  ],
  
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
        '<rootDir>/tests/unit/utils/validation.test.ts'
      ],
      testNamePattern: 'DataValidator.*containsSuspiciousContent', // Only run the security tests
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
  
  // High thresholds for security-critical method
  thresholds: {
    high: 90,
    low: 80,
    break: 70
  },
  
  timeoutMS: 30000, // Shorter timeout
  timeoutFactor: 2,
  
  concurrency: 1, // Single thread for speed
  
  htmlReporter: {
    fileName: 'quick-mutation-report.html'
  },
  
  logLevel: 'info',
  
  plugins: [
    '@stryker-mutator/jest-runner',
    '@stryker-mutator/typescript-checker'
  ],
  
  // Focus on critical mutations for security testing
  mutator: {
    plugins: ['typescript'],
    excludedMutations: [
      'BlockStatement',
      'ArithmeticOperator',
      'UpdateOperator'
    ]
  }
};