import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PromptTemplate } from "./types.js";

// ES module compatibility - avoid conflicts in test environments
const getPromptsDir = (): string => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.url) {
      const __filename = fileURLToPath(import.meta.url);
      return path.dirname(__filename);
    }
  } catch (error) {
    // Fallback for test environments
  }
  // Fallback for environments where import.meta is not available
  return path.join(process.cwd(), "src", "prompts");
};

export interface PromptCategory {
  name: string;
  prompts: PromptTemplate[];
}

export class PromptRegistry {
  private categories: Map<string, PromptTemplate[]> = new Map();
  private promptsByName: Map<string, PromptTemplate> = new Map();
  private allPrompts: PromptTemplate[] = [];

  register(category: string, prompt: PromptTemplate): void {
    // Add to category
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category)!.push(prompt);

    // Add to name lookup
    this.promptsByName.set(prompt.name, prompt);

    // Add to all prompts
    this.allPrompts.push(prompt);
  }

  getPrompt(name: string): PromptTemplate | undefined {
    return this.promptsByName.get(name);
  }

  getCategory(name: string): PromptTemplate[] {
    return this.categories.get(name) || [];
  }

  getAllPrompts(): PromptTemplate[] {
    return [...this.allPrompts];
  }

  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  getCategoryMap(): Map<string, PromptTemplate[]> {
    return new Map(this.categories);
  }

  clear(): void {
    this.categories.clear();
    this.promptsByName.clear();
    this.allPrompts = [];
  }
}

export class PromptLoader {
  private registry: PromptRegistry = new PromptRegistry();
  private loaded: boolean = false;

  async loadAllPrompts(): Promise<PromptTemplate[]> {
    if (!this.loaded) {
      await this.scanAndLoadCategories();
      this.loaded = true;
    }
    return this.registry.getAllPrompts();
  }

  private async scanAndLoadCategories(): Promise<void> {
    const promptsDir = getPromptsDir();

    try {
      const entries = fs.readdirSync(promptsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && this.isValidCategoryName(entry.name)) {
          await this.loadCategory(entry.name);
        }
      }
    } catch (error) {
      console.error("Error scanning prompts directory:", error);
      throw new Error(`Failed to scan prompts directory: ${error}`);
    }
  }

  private async loadCategory(categoryName: string): Promise<void> {
    const categoryPath = path.join(getPromptsDir(), categoryName);

    try {
      const files = fs
        .readdirSync(categoryPath)
        .filter((file) => file.endsWith(".js") && !file.endsWith(".d.ts"))
        .filter((file) => file !== "index.js"); // Skip index files

      for (const file of files) {
        await this.loadPromptFile(categoryName, categoryPath, file);
      }
    } catch (error) {
      console.error(`Error loading category ${categoryName}:`, error);
      // Don't throw - continue loading other categories
    }
  }

  private async loadPromptFile(
    categoryName: string,
    categoryPath: string,
    filename: string,
  ): Promise<void> {
    const filePath = path.join(categoryPath, filename);
    const relativePath = path.relative(getPromptsDir(), filePath);

    try {
      // Use dynamic import to load the module
      const module = await import(`./${relativePath.replace(/\\/g, "/")}`);

      let prompt: PromptTemplate | undefined;

      // Try different export patterns
      if (module.default && this.isValidPrompt(module.default)) {
        prompt = module.default;
      } else if (module.prompt && this.isValidPrompt(module.prompt)) {
        prompt = module.prompt;
      } else {
        // Look for any named export that's a valid prompt
        for (const value of Object.values(module)) {
          if (this.isValidPrompt(value)) {
            prompt = value as PromptTemplate;
            break;
          }
        }
      }

      if (prompt) {
        this.registry.register(categoryName, prompt);
      } else {
        // No valid prompt found - skip file
      }
    } catch (error) {
      console.error(`Error loading prompt file ${relativePath}:`, error);
      // Don't throw - continue loading other files
    }
  }

  private isValidPrompt(obj: any): obj is PromptTemplate {
    return (
      obj &&
      typeof obj === "object" &&
      typeof obj.name === "string" &&
      obj.name.length > 0 &&
      typeof obj.description === "string" &&
      obj.description.length > 0 &&
      typeof obj.generateMessages === "function" &&
      (obj.arguments === undefined || Array.isArray(obj.arguments))
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

  getRegistry(): PromptRegistry {
    return this.registry;
  }

  async getCategories(): Promise<PromptCategory[]> {
    if (!this.loaded) {
      await this.scanAndLoadCategories();
      this.loaded = true;
    }

    return this.registry.getCategories().map((categoryName) => ({
      name: categoryName,
      prompts: this.registry.getCategory(categoryName),
    }));
  }

  async getPromptsByCategory(categoryName: string): Promise<PromptTemplate[]> {
    if (!this.loaded) {
      await this.scanAndLoadCategories();
      this.loaded = true;
    }
    return this.registry.getCategory(categoryName);
  }

  async getPrompt(name: string): Promise<PromptTemplate | undefined> {
    if (!this.loaded) {
      await this.scanAndLoadCategories();
      this.loaded = true;
    }
    return this.registry.getPrompt(name);
  }
}

// Create a singleton instance for easy access
export const promptLoader = new PromptLoader();
export const promptRegistry = promptLoader.getRegistry();
