/**
 * Manifest manager for custom OpenAPI specifications
 * Handles indexing, storage paths, and metadata management
 */

/* eslint-disable no-console */

import { join, dirname, resolve, normalize } from "path";
import { homedir } from "os";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  statSync,
  readdirSync,
  rmdirSync,
} from "fs";
import {
  CustomSpecManifest,
  CustomSpecEntry,
  CustomSpecPaths,
} from "./types.js";
import { PathValidator, FileValidator } from "../utils/validation.js";
import { ValidationError, ErrorHandler } from "../utils/errors.js";

export class ManifestManager {
  private paths: CustomSpecPaths;
  private manifest: CustomSpecManifest;

  constructor() {
    this.paths = this.initializePaths();
    this.ensureDirectories();
    this.manifest = this.loadManifest();
  }

  /**
   * Initialize storage paths with validation
   */
  private initializePaths(): CustomSpecPaths {
    try {
      const baseDir = process.env.OPENAPI_DIRECTORY_CACHE_DIR
        ? join(process.env.OPENAPI_DIRECTORY_CACHE_DIR, "custom-specs")
        : join(homedir(), ".cache", "openapi-directory-mcp", "custom-specs");

      // Validate and normalize base directory path
      PathValidator.validatePath(baseDir);
      const validatedBaseDir = normalize(resolve(baseDir));

      const specsDir = join(validatedBaseDir, "custom");
      const manifestFile = join(validatedBaseDir, "manifest.json");

      // Validate all paths
      PathValidator.validatePath(specsDir);
      PathValidator.validatePath(manifestFile);

      return {
        baseDir: validatedBaseDir,
        manifestFile,
        specsDir,
        getSpecFile: (name: string, version: string) => {
          // Validate input parameters
          if (!name || !version) {
            throw new ValidationError(
              "Name and version are required for spec file path",
            );
          }

          // Sanitize name and version to prevent path traversal
          const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
          const safeVersion = version.replace(/[^a-zA-Z0-9_.-]/g, "_");

          const specFile = join(specsDir, safeName, `${safeVersion}.json`);
          PathValidator.validatePath(specFile);

          return normalize(specFile);
        },
      };
    } catch (error) {
      throw ErrorHandler.handleError(
        error,
        "Failed to initialize storage paths",
        "INIT_PATHS_ERROR",
      );
    }
  }

  /**
   * Ensure directories exist
   */
  private ensureDirectories(): void {
    if (!existsSync(this.paths.baseDir)) {
      mkdirSync(this.paths.baseDir, { recursive: true });
    }
    if (!existsSync(this.paths.specsDir)) {
      mkdirSync(this.paths.specsDir, { recursive: true });
    }
  }

  /**
   * Load manifest from disk with validation
   */
  private loadManifest(): CustomSpecManifest {
    try {
      // Validate manifest file path
      PathValidator.validatePath(this.paths.manifestFile);

      if (!existsSync(this.paths.manifestFile)) {
        return this.createEmptyManifest();
      }

      const content = readFileSync(this.paths.manifestFile, "utf-8");
      const manifest = JSON.parse(content) as CustomSpecManifest;

      // Validate manifest structure
      if (!manifest.version || !manifest.specs || !manifest.lastUpdated) {
        console.warn("Invalid manifest structure, creating new one");
        return this.createEmptyManifest();
      }

      return manifest;
    } catch (error) {
      console.warn(`Failed to load manifest: ${error}. Creating new one.`);
      return this.createEmptyManifest();
    }
  }

  /**
   * Create empty manifest
   */
  private createEmptyManifest(): CustomSpecManifest {
    return {
      version: "1.0.0",
      specs: {},
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Save manifest to disk with validation
   */
  private saveManifest(): void {
    try {
      this.ensureDirectories();

      // Validate manifest file path before writing
      PathValidator.validatePath(this.paths.manifestFile);

      this.manifest.lastUpdated = new Date().toISOString();

      const content = JSON.stringify(this.manifest, null, 2);

      // Validate content size before writing
      FileValidator.validateFileSize(content.length);

      writeFileSync(this.paths.manifestFile, content, "utf-8");
    } catch (error) {
      throw ErrorHandler.handleError(
        error,
        "Failed to save manifest",
        "SAVE_MANIFEST_ERROR",
      );
    }
  }

  /**
   * Add a spec to the manifest
   */
  addSpec(entry: CustomSpecEntry): void {
    // Validate required fields
    if (!entry.id || !entry.name || !entry.version) {
      throw new ValidationError('Spec entry must have id, name, and version');
    }
    
    if (this.manifest.specs[entry.id]) {
      throw new ValidationError(`Spec with ID ${entry.id} already exists`);
    }
    this.manifest.specs[entry.id] = entry;
    this.saveManifest();
  }

  /**
   * Remove a spec from the manifest
   */
  removeSpec(id: string): boolean {
    if (this.manifest.specs[id]) {
      delete this.manifest.specs[id];
      this.saveManifest();
      return true;
    }
    return false;
  }

  /**
   * Update a spec in the manifest
   */
  updateSpec(id: string, updates: Partial<CustomSpecEntry>): boolean {
    if (this.manifest.specs[id]) {
      this.manifest.specs[id] = { ...this.manifest.specs[id], ...updates };
      this.saveManifest();
      return true;
    }
    return false;
  }

  /**
   * Get a spec from the manifest
   */
  getSpec(id: string): CustomSpecEntry | undefined {
    return this.manifest.specs[id];
  }

  /**
   * List all specs in the manifest
   */
  listSpecs(): CustomSpecEntry[] {
    // Always reload manifest from disk to get latest state
    this.manifest = this.loadManifest();
    return Object.values(this.manifest.specs);
  }

  /**
   * Check if a spec exists
   */
  hasSpec(id: string): boolean {
    return id in this.manifest.specs;
  }

  /**
   * Check if a name/version combination exists
   */
  hasNameVersion(name: string, version: string): boolean {
    const id = `custom:${name}:${version}`;
    return this.hasSpec(id);
  }

  /**
   * Get storage paths
   */
  getPaths(): CustomSpecPaths {
    return this.paths;
  }

  /**
   * Store spec file on disk with validation
   */
  storeSpecFile(name: string, version: string, content: string): string {
    try {
      // Validate inputs
      if (!name || !version || !content) {
        throw new ValidationError("Name, version, and content are required");
      }

      // Validate content size and structure
      FileValidator.validateFileSize(content.length);
      FileValidator.validateOpenAPIContent(content);

      // Get validated spec file path
      const specFile = this.paths.getSpecFile(name, version);
      const specDir = dirname(specFile);

      // Validate the directory path before creating
      PathValidator.validatePath(specDir);

      // Ensure spec directory exists
      if (!existsSync(specDir)) {
        mkdirSync(specDir, { recursive: true });
      }

      // Write file with validated path
      writeFileSync(specFile, content, "utf-8");
      return specFile;
    } catch (error) {
      throw ErrorHandler.handleError(
        error,
        `Failed to store spec file for ${name}:${version}`,
        "STORE_SPEC_ERROR",
      );
    }
  }

  /**
   * Read spec file from disk with validation
   */
  readSpecFile(name: string, version: string): string {
    try {
      // Validate inputs
      if (!name || !version) {
        throw new ValidationError("Name and version are required");
      }

      // Get validated spec file path
      const specFile = this.paths.getSpecFile(name, version);

      // Additional path validation before file operations
      PathValidator.validatePath(specFile);

      if (!existsSync(specFile)) {
        throw new ValidationError(`Spec file not found: ${specFile}`);
      }

      const content = readFileSync(specFile, "utf-8");

      // Note: Content validation is handled by the CustomSpecClient
      // which extracts the actual OpenAPI spec from the wrapper structure

      return content;
    } catch (error) {
      throw ErrorHandler.handleError(
        error,
        `Failed to read spec file for ${name}:${version}`,
        "READ_SPEC_ERROR",
      );
    }
  }

  /**
   * Delete spec file from disk with validation
   */
  deleteSpecFile(name: string, version: string): boolean {
    try {
      // Validate inputs
      if (!name || !version) {
        throw new ValidationError("Name and version are required");
      }

      // Get validated spec file path
      const specFile = this.paths.getSpecFile(name, version);

      // Additional path validation before file operations
      PathValidator.validatePath(specFile);

      if (!existsSync(specFile)) {
        return false;
      }

      unlinkSync(specFile);

      // Try to remove directory if empty
      const specDir = dirname(specFile);
      try {
        PathValidator.validatePath(specDir);
        const files = readdirSync(specDir);
        if (files.length === 0) {
          rmdirSync(specDir);
        }
      } catch {
        // Ignore errors when trying to remove directory
      }

      return true;
    } catch (error) {
      console.warn(`Failed to delete spec file for ${name}:${version}:`, error);
      return false;
    }
  }

  /**
   * Get file size of a spec with validation
   */
  getSpecFileSize(name: string, version: string): number {
    try {
      // Validate inputs
      if (!name || !version) {
        return 0;
      }

      // Get validated spec file path
      const specFile = this.paths.getSpecFile(name, version);

      // Additional path validation before file operations
      PathValidator.validatePath(specFile);

      if (!existsSync(specFile)) {
        return 0;
      }

      return statSync(specFile).size;
    } catch {
      return 0;
    }
  }

  /**
   * Generate unique spec ID
   */
  generateSpecId(name: string, version: string): string {
    return `custom:${name}:${version}`;
  }

  /**
   * Parse spec ID into components
   */
  parseSpecId(
    id: string,
  ): { provider: string; name: string; version: string } | null {
    const parts = id.split(":");
    if (parts.length !== 3 || parts[0] !== "custom") {
      return null;
    }

    return {
      provider: parts[0]!,
      name: parts[1]!,
      version: parts[2]!,
    };
  }

  /**
   * Get manifest statistics
   */
  getStats(): {
    totalSpecs: number;
    totalSize: number;
    byFormat: { yaml: number; json: number };
    bySource: { file: number; url: number };
    lastUpdated: string;
  } {
    const specs = this.listSpecs();

    return {
      totalSpecs: specs.length,
      totalSize: specs.reduce((sum, spec) => sum + spec.fileSize, 0),
      byFormat: {
        yaml: specs.filter((s) => s.originalFormat === "yaml").length,
        json: specs.filter((s) => s.originalFormat === "json").length,
      },
      bySource: {
        file: specs.filter((s) => s.sourceType === "file").length,
        url: specs.filter((s) => s.sourceType === "url").length,
      },
      lastUpdated: this.manifest.lastUpdated,
    };
  }

  /**
   * Validate manifest integrity with path validation
   */
  validateIntegrity(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    try {
      const specs = this.listSpecs();

      for (const spec of specs) {
        try {
          // Check if spec file exists
          const parsed = this.parseSpecId(spec.id);
          if (!parsed) {
            issues.push(`Invalid spec ID format: ${spec.id}`);
            continue;
          }

          // Validate the spec file path
          const specFile = this.paths.getSpecFile(parsed.name, parsed.version);
          PathValidator.validatePath(specFile);

          if (!existsSync(specFile)) {
            issues.push(`Spec file missing for ${spec.id}: ${specFile}`);
            continue;
          }

          // Validate required fields
          if (!spec.name || !spec.version || !spec.title) {
            issues.push(`Missing required fields for ${spec.id}`);
          }

          // Check file size consistency
          const actualSize = this.getSpecFileSize(parsed.name, parsed.version);
          if (actualSize !== spec.fileSize && actualSize > 0) {
            issues.push(
              `File size mismatch for ${spec.id}: expected ${spec.fileSize}, found ${actualSize}`,
            );
          }

          // Note: Spec content validation is handled by CustomSpecClient
          // as it needs to extract the actual OpenAPI spec from the wrapper
        } catch (specError) {
          issues.push(`Error validating spec ${spec.id}: ${specError}`);
        }
      }
    } catch (error) {
      issues.push(`Error during integrity validation: ${error}`);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Repair manifest integrity issues
   */
  repairIntegrity(): { repaired: string[]; failed: string[] } {
    const repaired: string[] = [];
    const failed: string[] = [];
    const integrity = this.validateIntegrity();

    if (integrity.valid) {
      return { repaired, failed };
    }

    const specs = this.listSpecs();

    for (const spec of specs) {
      const parsed = this.parseSpecId(spec.id);
      if (!parsed) {
        this.removeSpec(spec.id);
        repaired.push(`Removed spec with invalid ID: ${spec.id}`);
        continue;
      }

      const specFile = this.paths.getSpecFile(parsed.name, parsed.version);

      // Remove specs with missing files
      if (!existsSync(specFile)) {
        this.removeSpec(spec.id);
        repaired.push(`Removed spec with missing file: ${spec.id}`);
        continue;
      }

      // Update file size if incorrect
      const actualSize = this.getSpecFileSize(parsed.name, parsed.version);
      if (actualSize !== spec.fileSize && actualSize > 0) {
        this.updateSpec(spec.id, { fileSize: actualSize });
        repaired.push(`Updated file size for ${spec.id}`);
      }
    }

    return { repaired, failed };
  }
}
