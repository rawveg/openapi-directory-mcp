// @ts-nocheck
import { ToolDefinition } from "./types.js";

export class ToolRegistry {
  private categories: Map<string, ToolDefinition[]> = new Map();
  private toolsByName: Map<string, ToolDefinition> = new Map();
  private allTools: ToolDefinition[] = [];

  register(category: string, tool: ToolDefinition): void {
    // Check for duplicate names
    if (this.toolsByName.has(tool.name)) {
      // Tool already registered, skipping duplicate
      return;
    }

    // Add to category
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category)!.push(tool);

    // Add to name lookup
    this.toolsByName.set(tool.name, tool);

    // Add to all tools
    this.allTools.push(tool);

    // Set category on the tool
    tool.category = category;
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.toolsByName.get(name);
  }

  getCategory(name: string): ToolDefinition[] {
    return this.categories.get(name) || [];
  }

  getAllTools(): ToolDefinition[] {
    return [...this.allTools];
  }

  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  getCategoryCount(): number {
    return this.categories.size;
  }

  getToolCount(): number {
    return this.allTools.length;
  }

  clear(): void {
    this.categories.clear();
    this.toolsByName.clear();
    this.allTools = [];
  }
}
