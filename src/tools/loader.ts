import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ToolDefinition, ToolCategory } from "./types.js";
import { ToolRegistry } from "./registry.js";

// ES module compatibility - avoid conflicts in test environments
const getToolsDir = (): string => {
  try {
    // Use dynamic evaluation to avoid Jest parsing issues with import.meta
    const importMeta = eval("import.meta");
    if (typeof importMeta !== "undefined" && importMeta.url) {
      const __filename = fileURLToPath(importMeta.url);
      const toolsDir = path.dirname(__filename);
      return toolsDir;
    }
  } catch (error) {
    // Fallback for test environments
  }

  // Try multiple paths to find the tools directory
  const projectRoot = findProjectRoot();

  const possiblePaths = [
    // Current working directory variations
    path.join(process.cwd(), "dist", "tools"),
    path.join(process.cwd(), "src", "tools"),
    // Search up the directory tree for package.json
    projectRoot && path.join(projectRoot, "dist", "tools"),
    projectRoot && path.join(projectRoot, "src", "tools"),
  ].filter(Boolean) as string[];

  // Find the first existing path that contains tool directories
  for (const testPath of possiblePaths) {
    try {
      if (fs.existsSync(testPath) && fs.statSync(testPath).isDirectory()) {
        // Check if it contains expected tool category directories
        const entries = fs.readdirSync(testPath, { withFileTypes: true });
        const hasToolDirs = entries.some(
          (entry) =>
            entry.isDirectory() &&
            [
              "provider",
              "api",
              "search",
              "openapi",
              "endpoint",
              "cache",
            ].includes(entry.name),
        );
        if (hasToolDirs) {
          return testPath;
        }
      }
    } catch {
      // Continue to next path
    }
  }

  // Last resort fallback
  const fallback = path.join(process.cwd(), "dist", "tools");
  return fallback;
};

// Helper function to find project root by looking for package.json
const findProjectRoot = (): string | null => {
  let currentDir = process.cwd();

  // Limit search to prevent infinite loops
  for (let i = 0; i < 10; i++) {
    const packageJsonPath = path.join(currentDir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf-8"),
        );
        // Verify it's our project by checking the name
        if (packageJson.name === "openapi-directory-mcp") {
          return currentDir;
        }
      } catch {
        // Continue searching
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached root directory
      break;
    }
    currentDir = parentDir;
  }

  return null;
};

export class ToolLoader {
  private registry: ToolRegistry = new ToolRegistry();
  private loaded: boolean = false;

  async loadAllTools(): Promise<ToolDefinition[]> {
    if (!this.loaded) {
      await this.scanAndLoadCategories();
      this.loaded = true;
    }
    return this.registry.getAllTools();
  }

  private async scanAndLoadCategories(): Promise<void> {
    const toolsDir = getToolsDir();

    try {
      const entries = fs.readdirSync(toolsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && this.isValidCategoryName(entry.name)) {
          await this.loadCategory(entry.name);
        }
      }
    } catch (error) {
      console.error("Error scanning tools directory:", error);
      throw new Error(`Failed to scan tools directory: ${error}`);
    }
  }

  private async loadCategory(categoryName: string): Promise<void> {
    const categoryPath = path.join(getToolsDir(), categoryName);

    try {
      const files = fs
        .readdirSync(categoryPath)
        .filter((file) => file.endsWith(".js") && !file.endsWith(".d.ts"))
        .filter((file) => file !== "index.js"); // Skip index files

      for (const file of files) {
        await this.loadToolFile(categoryName, categoryPath, file);
      }
    } catch (error) {
      console.error(`Error loading category ${categoryName}:`, error);
      // Don't throw - continue loading other categories
    }
  }

  private async loadToolFile(
    categoryName: string,
    categoryPath: string,
    filename: string,
  ): Promise<void> {
    const filePath = path.join(categoryPath, filename);
    const relativePath = path.relative(getToolsDir(), filePath);

    try {
      // Use absolute file path or file:// URL for dynamic import
      // This ensures the import works regardless of the current working directory
      const absolutePath = path.resolve(filePath);
      const fileUrl = `file://${absolutePath.replace(/\\/g, "/")}`;
      const module = await import(fileUrl);

      let tool: ToolDefinition | undefined;

      // Try different export patterns
      if (module.default && this.isValidTool(module.default)) {
        tool = module.default;
      } else if (module.tool && this.isValidTool(module.tool)) {
        tool = module.tool;
      } else {
        // Look for any named export that's a valid tool
        for (const value of Object.values(module)) {
          if (this.isValidTool(value)) {
            tool = value as ToolDefinition;
            break;
          }
        }
      }

      if (tool) {
        this.registry.register(categoryName, tool);
        // Tool loaded successfully
      } else {
        // No valid tool found - skip file
      }
    } catch (error) {
      console.error(`Error loading tool file ${relativePath}:`, error);
      // Don't throw - continue loading other files
    }
  }

  private isValidTool(obj: any): obj is ToolDefinition {
    return (
      obj &&
      typeof obj === "object" &&
      typeof obj.name === "string" &&
      obj.name.length > 0 &&
      typeof obj.description === "string" &&
      obj.description.length > 0 &&
      typeof obj.execute === "function" &&
      obj.inputSchema !== undefined
    );
  }

  private isValidCategoryName(name: string): boolean {
    // Skip hidden directories, node_modules, etc.
    return (
      !name.startsWith(".") &&
      !name.startsWith("_") &&
      name !== "node_modules" &&
      name !== "dist" &&
      name !== "build"
    );
  }

  getRegistry(): ToolRegistry {
    return this.registry;
  }

  async getCategories(): Promise<ToolCategory[]> {
    if (!this.loaded) {
      await this.scanAndLoadCategories();
      this.loaded = true;
    }

    return this.registry.getCategories().map((categoryName) => ({
      name: categoryName,
      tools: this.registry.getCategory(categoryName),
    }));
  }

  async getToolsByCategory(categoryName: string): Promise<ToolDefinition[]> {
    if (!this.loaded) {
      await this.scanAndLoadCategories();
      this.loaded = true;
    }
    return this.registry.getCategory(categoryName);
  }

  async getTool(name: string): Promise<ToolDefinition | undefined> {
    if (!this.loaded) {
      await this.scanAndLoadCategories();
      this.loaded = true;
    }
    return this.registry.getTool(name);
  }
}

// Create a singleton instance for easy access
export const toolLoader = new ToolLoader();
export const toolRegistry = toolLoader.getRegistry();
