export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/src/**/__tests__/**/*.ts',
    '**/src/**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/test/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Stricter requirements for critical plugin architecture
    'src/prompts/loader.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'src/tools/loader.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  // Separate test configurations
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testTimeout: 30000
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/tests/performance/**/*.test.ts'],
      testTimeout: 60000
    }
  ],
  // Coverage reporting
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  collectCoverage: true,
  verbose: true,
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.ts'],
  // Global test timeout
  testTimeout: 10000
};