/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/tests/feature/**/*.(test|spec).+(ts|tsx)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ES2020',
        target: 'ES2020',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        skipLibCheck: true,
        strict: false,
        isolatedModules: true,
        noImplicitAny: false,
        noImplicitReturns: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        exactOptionalPropertyTypes: false
      }
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  collectCoverageFrom: [
    'src/tools/loader.ts',
    'src/tools/handler.ts',
    'src/tools/registry.ts',
    'src/prompts/loader.ts',
    'src/prompts/handler.ts'
  ],
  coverageDirectory: 'coverage/feature',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  },
  verbose: true,
  testTimeout: 20000,
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.mjs$)'
  ]
};