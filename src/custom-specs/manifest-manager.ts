/**
 * Manifest manager for custom OpenAPI specifications
 * Handles indexing, storage paths, and metadata management
 */

/* eslint-disable no-console */

import { join, dirname } from "path";
import { homedir } from "os";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  statSync,
} from "fs";
import {
  CustomSpecManifest,
  CustomSpecEntry,
  CustomSpecPaths,
} from "./types.js";

export class ManifestManager {
  private paths: CustomSpecPaths;
  private manifest: CustomSpecManifest;

  constructor() {
    this.paths = this.initializePaths();
    this.manifest = this.loadManifest();
  }

  /**
   * Initialize storage paths
   */
  private initializePaths(): CustomSpecPaths {
    const baseDir = process.env.OPENAPI_DIRECTORY_CACHE_DIR
      ? join(process.env.OPENAPI_DIRECTORY_CACHE_DIR, "custom-specs")
      : join(homedir(), ".cache", "openapi-directory-mcp", "custom-specs");

    const specsDir = join(baseDir, "custom");
    const manifestFile = join(baseDir, "manifest.json");

    return {
      baseDir,
      manifestFile,
      specsDir,
      getSpecFile: (name: string, version: string) =>
        join(specsDir, name, `${version}.json`),
    };
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
   * Load manifest from disk
   */
  private loadManifest(): CustomSpecManifest {
    if (!existsSync(this.paths.manifestFile)) {
      return this.createEmptyManifest();
    }

    try {
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
   * Save manifest to disk
   */
  private saveManifest(): void {
    this.ensureDirectories();

    this.manifest.lastUpdated = new Date().toISOString();

    try {
      const content = JSON.stringify(this.manifest, null, 2);
      writeFileSync(this.paths.manifestFile, content, "utf-8");
    } catch (error) {
      throw new Error(
        `Failed to save manifest: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Add a spec to the manifest
   */
  addSpec(entry: CustomSpecEntry): void {
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
   * Store spec file on disk
   */
  storeSpecFile(name: string, version: string, content: string): string {
    const specDir = join(this.paths.specsDir, name);
    const specFile = this.paths.getSpecFile(name, version);

    // Ensure spec directory exists
    if (!existsSync(specDir)) {
      mkdirSync(specDir, { recursive: true });
    }

    try {
      writeFileSync(specFile, content, "utf-8");
      return specFile;
    } catch (error) {
      throw new Error(
        `Failed to store spec file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Read spec file from disk
   */
  readSpecFile(name: string, version: string): string {
    const specFile = this.paths.getSpecFile(name, version);

    if (!existsSync(specFile)) {
      throw new Error(`Spec file not found: ${specFile}`);
    }

    try {
      return readFileSync(specFile, "utf-8");
    } catch (error) {
      throw new Error(
        `Failed to read spec file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Delete spec file from disk
   */
  deleteSpecFile(name: string, version: string): boolean {
    const specFile = this.paths.getSpecFile(name, version);

    if (!existsSync(specFile)) {
      return false;
    }

    try {
      unlinkSync(specFile);

      // Try to remove directory if empty
      const specDir = dirname(specFile);
      try {
        const files = require("fs").readdirSync(specDir);
        if (files.length === 0) {
          require("fs").rmdirSync(specDir);
        }
      } catch {
        // Ignore errors when trying to remove directory
      }

      return true;
    } catch (error) {
      console.warn(`Failed to delete spec file: ${error}`);
      return false;
    }
  }

  /**
   * Get file size of a spec
   */
  getSpecFileSize(name: string, version: string): number {
    const specFile = this.paths.getSpecFile(name, version);

    if (!existsSync(specFile)) {
      return 0;
    }

    try {
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
   * Validate manifest integrity
   */
  validateIntegrity(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const specs = this.listSpecs();

    for (const spec of specs) {
      // Check if spec file exists
      const parsed = this.parseSpecId(spec.id);
      if (!parsed) {
        issues.push(`Invalid spec ID format: ${spec.id}`);
        continue;
      }

      const specFile = this.paths.getSpecFile(parsed.name, parsed.version);
      if (!existsSync(specFile)) {
        issues.push(`Spec file missing for ${spec.id}: ${specFile}`);
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
