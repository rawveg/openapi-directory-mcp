/**
 * Import manager for custom OpenAPI specifications
 * Handles the complete import process including validation, security scanning, and storage
 */

/* eslint-disable no-console */

import { ImportOptions, ImportResult, CustomSpecEntry } from "./types.js";
import { SpecProcessor } from "./spec-processor.js";
import { ManifestManager } from "./manifest-manager.js";

export class ImportManager {
  private specProcessor: SpecProcessor;
  private manifestManager: ManifestManager;
  private onSpecChangeCallback: (() => Promise<void>) | undefined;

  constructor(onSpecChangeCallback?: () => Promise<void>) {
    this.specProcessor = new SpecProcessor();
    this.manifestManager = new ManifestManager();
    this.onSpecChangeCallback = onSpecChangeCallback;
  }

  /**
   * Import a custom OpenAPI specification
   */
  async importSpec(options: ImportOptions): Promise<ImportResult> {
    try {
      // Validate input
      const validation = this.validateImportOptions(options);
      if (!validation.valid) {
        return {
          success: false,
          message: `Invalid import options: ${validation.errors.join(", ")}`,
          errors: validation.errors,
        };
      }

      const { name, version, source, skipSecurity, strictSecurity } = options;

      // Check if name/version already exists
      if (this.manifestManager.hasNameVersion(name!, version!)) {
        return {
          success: false,
          message: `Spec ${name}:${version} already exists. Use a different version or remove the existing spec first.`,
          errors: [`Duplicate spec: ${name}:${version}`],
        };
      }

      console.log(`📥 Importing OpenAPI spec from: ${source}`);
      console.log(`📝 Name: ${name}, Version: ${version}`);

      // Process the specification
      console.log(`🔍 Processing and validating specification...`);
      const processingResult = await this.specProcessor.processSpec(
        source,
        skipSecurity,
      );

      // Check security scan results
      if (processingResult.securityScan.issues.length > 0) {
        console.log(`🔒 Security scan completed:`);
        const scanner = this.specProcessor.getSecurityScanner();
        console.log(scanner.generateReport(processingResult.securityScan));

        // In strict mode, block on any medium+ severity issues
        if (strictSecurity) {
          const blockingIssues = processingResult.securityScan.issues.filter(
            (issue) =>
              issue.severity === "high" || issue.severity === "critical",
          );

          if (blockingIssues.length > 0) {
            return {
              success: false,
              message: `Import blocked by ${blockingIssues.length} high/critical security issues in strict mode`,
              securityScan: processingResult.securityScan,
              errors: blockingIssues.map(
                (issue) => `${issue.severity}: ${issue.message}`,
              ),
            };
          }
        }
      }

      // Store the spec file
      const specId = this.manifestManager.generateSpecId(name!, version!);
      const specContent = this.specProcessor.toNormalizedJSON(
        processingResult.spec,
      );

      console.log(`💾 Storing specification...`);
      this.manifestManager.storeSpecFile(name!, version!, specContent);

      // Create manifest entry
      const entry: CustomSpecEntry = {
        id: specId,
        name: name!,
        version: version!,
        title: processingResult.metadata.title,
        description: processingResult.metadata.description,
        originalFormat: processingResult.originalFormat,
        sourceType: source.startsWith("http") ? "url" : "file",
        sourcePath: source,
        imported: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        fileSize: specContent.length,
        securityScan: processingResult.securityScan,
      };

      // Add to manifest
      this.manifestManager.addSpec(entry);

      console.log(`✅ Successfully imported custom spec: ${specId}`);

      // Trigger cache invalidation and warming if callback is provided
      if (this.onSpecChangeCallback) {
        try {
          await this.onSpecChangeCallback();
        } catch (error) {
          console.warn("Cache invalidation failed after import:", error);
        }
      }

      const warnings: string[] = [];
      if (processingResult.securityScan.issues.length > 0) {
        warnings.push(
          `Security scan found ${processingResult.securityScan.issues.length} issues`,
        );
      }

      return {
        success: true,
        specId,
        message: `Successfully imported ${name}:${version}`,
        securityScan: processingResult.securityScan,
        warnings,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Import failed: ${errorMessage}`);

      return {
        success: false,
        message: `Import failed: ${errorMessage}`,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Remove a custom specification
   */
  async removeSpec(
    nameOrId: string,
    version?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      let specId: string;
      let parsedName: string;
      let parsedVersion: string;

      // Handle both "name:version" and "custom:name:version" formats
      if (nameOrId.includes(":") && !version) {
        // Full ID provided
        if (nameOrId.startsWith("custom:")) {
          specId = nameOrId;
          const parsed = this.manifestManager.parseSpecId(specId);
          if (!parsed) {
            return {
              success: false,
              message: `Invalid spec ID format: ${specId}`,
            };
          }
          parsedName = parsed.name;
          parsedVersion = parsed.version;
        } else {
          // name:version format
          const parts = nameOrId.split(":");
          if (parts.length !== 2) {
            return {
              success: false,
              message: `Invalid name:version format: ${nameOrId}`,
            };
          }
          parsedName = parts[0]!;
          parsedVersion = parts[1]!;
          specId = `custom:${parsedName}:${parsedVersion}`;
        }
      } else {
        // Name and version provided separately
        if (!version) {
          return {
            success: false,
            message: "Version required when providing name only",
          };
        }
        parsedName = nameOrId;
        parsedVersion = version;
        specId = `custom:${parsedName}:${parsedVersion}`;
      }

      // Check if spec exists
      if (!this.manifestManager.hasSpec(specId)) {
        return { success: false, message: `Spec not found: ${specId}` };
      }

      // Remove from manifest
      const removed = this.manifestManager.removeSpec(specId);
      if (!removed) {
        return {
          success: false,
          message: `Failed to remove spec from manifest: ${specId}`,
        };
      }

      // Remove spec file
      const fileRemoved = this.manifestManager.deleteSpecFile(
        parsedName,
        parsedVersion,
      );
      if (!fileRemoved) {
        console.warn(`Warning: Failed to remove spec file for ${specId}`);
      }

      console.log(`✅ Successfully removed custom spec: ${specId}`);

      // Trigger cache invalidation and warming if callback is provided
      if (this.onSpecChangeCallback) {
        try {
          await this.onSpecChangeCallback();
        } catch (error) {
          console.warn("Cache invalidation failed after removal:", error);
        }
      }

      return { success: true, message: `Successfully removed ${specId}` };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Remove failed: ${errorMessage}`);
      return { success: false, message: `Remove failed: ${errorMessage}` };
    }
  }

  /**
   * List all custom specifications
   */
  listSpecs(): Array<{
    id: string;
    name: string;
    version: string;
    title: string;
    description: string;
    imported: string;
    fileSize: number;
    securityIssues: number;
    format: string;
    source: string;
  }> {
    const specs = this.manifestManager.listSpecs();

    return specs.map((spec) => ({
      id: spec.id,
      name: spec.name,
      version: spec.version,
      title: spec.title,
      description:
        spec.description.length > 100
          ? spec.description.substring(0, 100) + "..."
          : spec.description,
      imported: spec.imported,
      fileSize: spec.fileSize,
      securityIssues: spec.securityScan
        ? spec.securityScan.summary.critical +
          spec.securityScan.summary.high +
          spec.securityScan.summary.medium +
          spec.securityScan.summary.low
        : 0,
      format: spec.originalFormat,
      source: spec.sourceType,
    }));
  }

  /**
   * Get detailed information about a specific spec
   */
  getSpecDetails(nameOrId: string, version?: string): CustomSpecEntry | null {
    let specId: string;

    if (nameOrId.startsWith("custom:")) {
      specId = nameOrId;
    } else if (nameOrId.includes(":") && !version) {
      // name:version format
      const parts = nameOrId.split(":");
      if (parts.length !== 2) return null;
      specId = `custom:${parts[0]}:${parts[1]}`;
    } else if (version) {
      specId = `custom:${nameOrId}:${version}`;
    } else {
      return null;
    }

    return this.manifestManager.getSpec(specId) || null;
  }

  /**
   * Rescan security for a specific spec
   */
  async rescanSecurity(
    nameOrId: string,
    version?: string,
  ): Promise<{ success: boolean; message: string; securityScan?: any }> {
    try {
      const spec = this.getSpecDetails(nameOrId, version);
      if (!spec) {
        return { success: false, message: "Spec not found" };
      }

      const parsed = this.manifestManager.parseSpecId(spec.id);
      if (!parsed) {
        return { success: false, message: "Invalid spec ID" };
      }

      // Read and parse the spec file
      const specContent = this.manifestManager.readSpecFile(
        parsed.name,
        parsed.version,
      );
      const specData = JSON.parse(specContent);

      // Get the actual OpenAPI spec from the latest version
      const latestVersion = specData.versions[specData.preferred];
      if (!latestVersion || !latestVersion.spec) {
        return {
          success: false,
          message: "No spec data found for security scan",
        };
      }

      // Run security scan
      console.log(`🔒 Running security scan for ${spec.id}...`);
      const securityScan = await this.specProcessor
        .getSecurityScanner()
        .scanSpec(latestVersion.spec);

      // Update manifest with new security scan
      this.manifestManager.updateSpec(spec.id, {
        securityScan,
        lastModified: new Date().toISOString(),
      });

      console.log(`✅ Security scan completed for ${spec.id}`);

      const scanner = this.specProcessor.getSecurityScanner();
      console.log(scanner.generateReport(securityScan));

      return {
        success: true,
        message: `Security scan completed for ${spec.id}`,
        securityScan,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Security scan failed: ${errorMessage}`);
      return {
        success: false,
        message: `Security scan failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Get statistics about custom specs
   */
  getStats() {
    return this.manifestManager.getStats();
  }

  /**
   * Validate integrity of custom specs
   */
  validateIntegrity() {
    return this.manifestManager.validateIntegrity();
  }

  /**
   * Repair integrity issues
   */
  repairIntegrity() {
    return this.manifestManager.repairIntegrity();
  }

  /**
   * Validate import options
   */
  private validateImportOptions(options: ImportOptions): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!options.source) {
      errors.push("Source path or URL is required");
    }

    if (!options.name) {
      errors.push("Name is required");
    } else if (!/^[a-zA-Z0-9_-]+$/.test(options.name)) {
      errors.push(
        "Name can only contain letters, numbers, hyphens, and underscores",
      );
    }

    if (!options.version) {
      errors.push("Version is required");
    } else if (!/^[a-zA-Z0-9._-]+$/.test(options.version)) {
      errors.push(
        "Version can only contain letters, numbers, dots, hyphens, and underscores",
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Quick validation of a spec without importing
   */
  async quickValidate(
    source: string,
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    return this.specProcessor.quickValidate(source);
  }
}
