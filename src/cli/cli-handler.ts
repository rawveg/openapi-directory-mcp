/**
 * CLI handler for custom OpenAPI spec import and management
 * Handles argument parsing and command execution
 */

/* eslint-disable no-console */

import { ImportManager } from "../custom-specs/index.js";
import { PersistentCacheManager } from "../cache/persistent-manager.js";

export interface CLIArgs {
  import?: string | boolean;
  name?: string;
  version?: string;
  "skip-security"?: boolean;
  "strict-security"?: boolean;
  "list-custom"?: boolean;
  "remove-custom"?: string;
  "rescan-security"?: string;
  "validate-integrity"?: boolean;
  "repair-integrity"?: boolean;
  help?: boolean;
}

export class CLIHandler {
  private importManager: ImportManager;
  private cacheManager: PersistentCacheManager;

  constructor() {
    // Create cache manager to handle cache invalidation
    this.cacheManager = new PersistentCacheManager();

    // Create import manager with cache invalidation callback
    this.importManager = new ImportManager(async () => {
      console.log(
        "🔄 Creating cache invalidation flag after spec import/removal...",
      );
      (this.cacheManager as any).createInvalidationFlag();
    });
  }

  /**
   * Parse command line arguments
   */
  parseArgs(args: string[]): CLIArgs {
    const parsed: CLIArgs = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case "--import": {
          const nextArg = args[i + 1];
          if (nextArg && !nextArg.startsWith("--")) {
            parsed.import = nextArg;
            i++; // Skip next argument
          } else {
            parsed.import = true; // Interactive mode
          }
          break;
        }

        case "--name": {
          const nameArg = args[i + 1];
          if (nameArg && !nameArg.startsWith("--")) {
            parsed.name = nameArg;
            i++;
          }
          break;
        }

        case "--version": {
          const versionArg = args[i + 1];
          if (versionArg && !versionArg.startsWith("--")) {
            parsed.version = versionArg;
            i++;
          }
          break;
        }

        case "--skip-security":
          parsed["skip-security"] = true;
          break;

        case "--strict-security":
          parsed["strict-security"] = true;
          break;

        case "--list-custom":
          parsed["list-custom"] = true;
          break;

        case "--remove-custom": {
          const removeArg = args[i + 1];
          if (removeArg && !removeArg.startsWith("--")) {
            parsed["remove-custom"] = removeArg;
            i++;
          }
          break;
        }

        case "--rescan-security": {
          const rescanArg = args[i + 1];
          if (rescanArg && !rescanArg.startsWith("--")) {
            parsed["rescan-security"] = rescanArg;
            i++;
          }
          break;
        }

        case "--validate-integrity":
          parsed["validate-integrity"] = true;
          break;

        case "--repair-integrity":
          parsed["repair-integrity"] = true;
          break;

        case "--help":
        case "-h":
          parsed.help = true;
          break;
      }
    }

    return parsed;
  }

  /**
   * Handle CLI commands
   */
  async handleCommand(args: CLIArgs): Promise<boolean> {
    try {
      // Help command
      if (args.help) {
        this.showHelp();
        return true;
      }

      // List custom specs
      if (args["list-custom"]) {
        await this.listCustomSpecs();
        return true;
      }

      // Remove custom spec
      if (args["remove-custom"]) {
        await this.removeCustomSpec(args["remove-custom"]);
        return true;
      }

      // Rescan security
      if (args["rescan-security"]) {
        await this.rescanSecurity(args["rescan-security"]);
        return true;
      }

      // Validate integrity
      if (args["validate-integrity"]) {
        await this.validateIntegrity();
        return true;
      }

      // Repair integrity
      if (args["repair-integrity"]) {
        await this.repairIntegrity();
        return true;
      }

      // Import command
      if (args.import !== undefined) {
        if (args.import === true) {
          // Interactive mode
          await this.interactiveImport();
        } else {
          // Direct import
          await this.directImport(args.import as string, args);
        }
        return true;
      }

      // No command matched, return false to start normal MCP server
      return false;
    } catch (error) {
      console.error(
        `❌ Command failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    } finally {
      // Clean up cache manager
      this.cacheManager.destroy();
    }
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log(`
📚 OpenAPI Directory MCP - Custom Spec Management

USAGE:
  openapi-directory-mcp [COMMAND] [OPTIONS]

COMMANDS:
  # Import commands
  --import [PATH/URL]     Import a custom OpenAPI spec (interactive if no path)
  --name NAME             Specify name for the imported spec
  --version VERSION       Specify version for the imported spec
  --skip-security         Skip security scanning during import
  --strict-security       Block import on any medium+ security issues

  # Management commands  
  --list-custom           List all imported custom specs
  --remove-custom ID      Remove a custom spec (format: name:version)
  --rescan-security ID    Re-run security scan on a custom spec
  
  # Maintenance commands
  --validate-integrity    Check integrity of custom spec storage
  --repair-integrity      Repair integrity issues in custom spec storage
  
  # General
  --help, -h              Show this help message

EXAMPLES:
  # Interactive import
  openapi-directory-mcp --import
  
  # Direct import from file
  openapi-directory-mcp --import ./my-api.yaml --name my-api --version v1
  
  # Import from URL with strict security
  openapi-directory-mcp --import https://api.example.com/openapi.json --name example-api --version v2 --strict-security
  
  # List all custom specs
  openapi-directory-mcp --list-custom
  
  # Remove a custom spec
  openapi-directory-mcp --remove-custom my-api:v1
  
  # Start normal MCP server (no arguments)
  openapi-directory-mcp

📖 For more information, visit: https://github.com/rawveg/openapi-directory-mcp
`);
  }

  /**
   * Interactive import wizard
   */
  private async interactiveImport(): Promise<void> {
    console.log(`
📋 Custom OpenAPI Spec Import Wizard
${"=".repeat(50)}
`);

    // Import readline for interactive prompts
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (prompt: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(prompt, resolve);
      });
    };

    try {
      // Get source
      const source = await question(
        "📂 Enter the path or URL to your OpenAPI spec: ",
      );
      if (!source.trim()) {
        throw new Error("Source path or URL is required");
      }

      // Quick validation
      console.log("🔍 Validating specification...");
      const validation = await this.importManager.quickValidate(source.trim());
      if (!validation.valid) {
        console.log(`❌ Validation failed:`);
        validation.errors.forEach((error) => console.log(`   • ${error}`));
        throw new Error("Invalid OpenAPI specification");
      }
      console.log("✅ Valid OpenAPI specification detected");

      // Get name
      const name = await question("📝 Enter a name for this API: ");
      if (!name.trim()) {
        throw new Error("Name is required");
      }

      // Get version
      const version = await question("🏷️  Enter a version identifier: ");
      if (!version.trim()) {
        throw new Error("Version is required");
      }

      // Security options
      const securityChoice = await question(
        "🔒 Security scanning? (strict/normal/skip) [normal]: ",
      );
      const securityOption = securityChoice.trim().toLowerCase() || "normal";

      console.log(`
📦 Ready to import:
   Source: ${source.trim()}
   Name: ${name.trim()}
   Version: ${version.trim()}
   Security: ${securityOption}
`);

      const confirm = await question("Proceed with import? (Y/n): ");
      if (confirm.trim().toLowerCase() === "n") {
        console.log("❌ Import cancelled");
        return;
      }

      // Perform import
      const result = await this.importManager.importSpec({
        source: source.trim(),
        name: name.trim(),
        version: version.trim(),
        skipSecurity: securityOption === "skip",
        strictSecurity: securityOption === "strict",
      });

      if (result.success) {
        console.log(`✅ ${result.message}`);
        if (result.warnings && result.warnings.length > 0) {
          console.log("⚠️  Warnings:");
          result.warnings.forEach((warning) => console.log(`   • ${warning}`));
        }
      } else {
        console.log(`❌ ${result.message}`);
        if (result.errors) {
          result.errors.forEach((error) => console.log(`   • ${error}`));
        }
      }
    } finally {
      rl.close();
    }
  }

  /**
   * Direct import with provided arguments
   */
  private async directImport(source: string, args: CLIArgs): Promise<void> {
    if (!args.name || !args.version) {
      throw new Error(
        "Name and version are required for direct import. Use --import without arguments for interactive mode.",
      );
    }

    console.log(`📥 Importing: ${source}`);

    const result = await this.importManager.importSpec({
      source,
      name: args.name,
      version: args.version,
      skipSecurity: args["skip-security"] || false,
      strictSecurity: args["strict-security"] || false,
    });

    if (result.success) {
      console.log(`✅ ${result.message}`);
      if (result.warnings && result.warnings.length > 0) {
        console.log("⚠️  Warnings:");
        result.warnings.forEach((warning) => console.log(`   • ${warning}`));
      }
    } else {
      console.log(`❌ ${result.message}`);
      if (result.errors) {
        result.errors.forEach((error) => console.log(`   • ${error}`));
      }
      throw new Error("Import failed");
    }
  }

  /**
   * List all custom specs
   */
  private async listCustomSpecs(): Promise<void> {
    const specs = this.importManager.listSpecs();

    if (specs.length === 0) {
      console.log("📭 No custom specifications imported");
      return;
    }

    console.log(`
📚 Custom OpenAPI Specifications (${specs.length})
${"=".repeat(60)}
`);

    specs.forEach((spec, index) => {
      const sizeKB = Math.round(spec.fileSize / 1024);
      const importedDate = new Date(spec.imported).toLocaleDateString();
      const securityIcon = spec.securityIssues > 0 ? "⚠️" : "✅";

      console.log(`${index + 1}. ${spec.name}:${spec.version}`);
      console.log(`   📋 ${spec.title}`);
      console.log(`   📄 ${spec.description}`);
      console.log(
        `   📅 Imported: ${importedDate} | 📊 ${sizeKB}KB ${spec.format.toUpperCase()}`,
      );
      console.log(
        `   🔒 Security: ${securityIcon} ${spec.securityIssues} issues | 📦 Source: ${spec.source}`,
      );
      console.log("");
    });

    const stats = this.importManager.getStats();
    console.log(
      `💾 Total: ${stats.totalSpecs} specs, ${Math.round(stats.totalSize / 1024)}KB`,
    );
  }

  /**
   * Remove a custom spec
   */
  private async removeCustomSpec(specId: string): Promise<void> {
    console.log(`🗑️  Removing: ${specId}`);

    const result = await this.importManager.removeSpec(specId);

    if (result.success) {
      console.log(`✅ ${result.message}`);
    } else {
      console.log(`❌ ${result.message}`);
      throw new Error("Remove failed");
    }
  }

  /**
   * Rescan security for a spec
   */
  private async rescanSecurity(specId: string): Promise<void> {
    console.log(`🔒 Rescanning security for: ${specId}`);

    const result = await this.importManager.rescanSecurity(specId);

    if (result.success) {
      console.log(`✅ ${result.message}`);
    } else {
      console.log(`❌ ${result.message}`);
      throw new Error("Security rescan failed");
    }
  }

  /**
   * Validate integrity
   */
  private async validateIntegrity(): Promise<void> {
    console.log("🔍 Validating custom spec integrity...");

    const result = this.importManager.validateIntegrity();

    if (result.valid) {
      console.log("✅ All custom specs are valid and consistent");
    } else {
      console.log(`❌ Found ${result.issues.length} integrity issues:`);
      result.issues.forEach((issue) => console.log(`   • ${issue}`));
    }
  }

  /**
   * Repair integrity
   */
  private async repairIntegrity(): Promise<void> {
    console.log("🔧 Repairing custom spec integrity...");

    const result = this.importManager.repairIntegrity();

    if (result.repaired.length > 0) {
      console.log(`✅ Repaired ${result.repaired.length} issues:`);
      result.repaired.forEach((repair) => console.log(`   • ${repair}`));
    }

    if (result.failed.length > 0) {
      console.log(`❌ Failed to repair ${result.failed.length} issues:`);
      result.failed.forEach((failure) => console.log(`   • ${failure}`));
    }

    if (result.repaired.length === 0 && result.failed.length === 0) {
      console.log("✅ No integrity issues found");
    }
  }
}
