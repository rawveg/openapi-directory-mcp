/**
 * Custom OpenAPI specifications module
 * Provides functionality for importing, managing, and serving custom OpenAPI specs
 */

export { CustomSpecClient } from './custom-spec-client.js';
export { ImportManager } from './import-manager.js';
export { ManifestManager } from './manifest-manager.js';
export { SpecProcessor } from './spec-processor.js';
export { SecurityScanner } from './security-scanner.js';

export type {
  CustomSpecEntry,
  CustomSpecManifest,
  CustomSpecPaths,
  SecurityIssue,
  SecurityRule,
  SecurityScanResult,
  SpecProcessingResult,
  ImportOptions,
  ImportResult,
  ValidationResult,
} from './types.js';