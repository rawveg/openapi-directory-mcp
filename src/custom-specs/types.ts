/**
 * Types and interfaces for custom OpenAPI specification management
 */

import { ApiGuruAPI } from "../types/api.js";

/**
 * Custom spec manifest entry
 */
export interface CustomSpecEntry {
  id: string; // custom:name:version
  name: string; // User-provided name
  version: string; // User-provided version
  title: string; // From OpenAPI spec title
  description: string; // From OpenAPI spec description
  originalFormat: "yaml" | "json";
  sourceType: "file" | "url";
  sourcePath: string; // Original file path or URL
  imported: string; // ISO timestamp
  lastModified: string; // ISO timestamp
  fileSize: number; // Size in bytes
  securityScan?: SecurityScanResult;
}

/**
 * Custom specs manifest
 */
export interface CustomSpecManifest {
  version: string; // Manifest format version
  specs: Record<string, CustomSpecEntry>; // Keyed by spec ID
  lastUpdated: string; // ISO timestamp
}

/**
 * Security scan result for a custom spec
 */
export interface SecurityScanResult {
  scannedAt: string; // ISO timestamp
  issues: SecurityIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  blocked: boolean; // True if critical issues prevent import
}

/**
 * Individual security issue found in a spec
 */
export interface SecurityIssue {
  type:
    | "prompt_injection"
    | "script_injection"
    | "suspicious_content"
    | "eval_usage";
  severity: "low" | "medium" | "high" | "critical";
  location: string; // JSON path to the issue
  context: "example" | "description" | "parameter" | "schema" | "metadata";
  pattern: string; // The pattern that was detected
  message: string; // Human-readable description
  suggestion?: string; // How to fix or mitigate
  ruleId: string; // Identifier for the security rule that triggered
}

/**
 * Security scanning rule definition
 */
export interface SecurityRule {
  id: string;
  pattern?: RegExp; // Optional - not needed when using detect function
  detect?: (content: string) => boolean; // Optional custom detection function for more sophisticated checks
  type: SecurityIssue["type"];
  severity: SecurityIssue["severity"];
  contexts: SecurityIssue["context"][];
  message: string;
  suggestion?: string;
  allowInExamples?: boolean; // For legitimate cases like Datadog eval
  description: string;
}

/**
 * OpenAPI spec processing result
 */
export interface SpecProcessingResult {
  spec: ApiGuruAPI;
  originalFormat: "yaml" | "json";
  securityScan: SecurityScanResult;
  metadata: {
    title: string;
    description: string;
    version: string;
    fileSize: number;
  };
}

/**
 * Import command options
 */
export interface ImportOptions {
  name?: string;
  version?: string;
  source: string; // File path or URL
  skipSecurity?: boolean;
  strictSecurity?: boolean;
  interactive?: boolean;
}

/**
 * CLI import result
 */
export interface ImportResult {
  success: boolean;
  specId?: string; // custom:name:version
  message: string;
  securityScan?: SecurityScanResult;
  warnings?: string[];
  errors?: string[];
}

/**
 * Custom spec storage paths
 */
export interface CustomSpecPaths {
  baseDir: string; // ~/.cache/openapi-directory-mcp/custom-specs
  manifestFile: string; // manifest.json
  specsDir: string; // custom/ directory
  getSpecFile(name: string, version: string): string; // custom/name/version.json
}

/**
 * Validation result for OpenAPI spec
 */
export interface ValidationResult {
  valid: boolean;
  version?: string; // OpenAPI version (e.g., "3.0.2")
  errors: string[];
  warnings: string[];
}
