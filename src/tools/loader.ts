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
      return path.dirname(__filename);
    }
  } catch (error) {
    // Fallback for test environments
  }
  // Fallback for environments where import.meta is not available
  const fallbackPath = path.join(process.cwd(), "src", "tools");
  const distPath = path.join(process.cwd(), "dist", "tools");

  // In test environments, prefer compiled tools in dist directory
  try {
    if (fs.existsSync(distPath)) {
      return distPath;
    }
    if (fs.existsSync(fallbackPath)) {
      return fallbackPath;
    }
    // Alternative fallback using __dirname
    const altPath = path.join(__dirname, "..");
    if (fs.existsSync(altPath)) {
      return altPath;
    }
  } catch {
    // Continue with original fallback
  }
  return fallbackPath;
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
      // Use dynamic import to load the module
      const module = await import(`./${relativePath.replace(/\\/g, "/")}`);

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
