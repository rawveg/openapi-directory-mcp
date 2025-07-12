import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { toolLoader, ToolLoader } from './loader.js';
import { ToolDefinition, ToolContext, toMcpTool } from './types.js';

export class ToolHandler {
  private loader: ToolLoader;
  private initialized: boolean = false;

  constructor(loader?: ToolLoader) {
    this.loader = loader || toolLoader;
    // Initialize tools asynchronously
    this.initializeTools().catch(console.error);
  }

  private async initializeTools(): Promise<void> {
    await this.loader.loadAllTools();
    this.initialized = true;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeTools();
    }
  }

  /**
   * Handle the tools/list request
   */
  async listTools(): Promise<{ tools: Tool[] }> {
    await this.ensureInitialized();
    const toolDefinitions = await this.loader.loadAllTools();
    
    const tools: Tool[] = toolDefinitions.map(toMcpTool);
    return { tools };
  }

  /**
   * Handle the tools/call request
   */
  async callTool(name: string, args: any, context: ToolContext): Promise<any> {
    await this.ensureInitialized();
    
    const tool = await this.loader.getTool(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    try {
      const result = await tool.execute(args, context);
      return result;
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all tool names
   */
  async getToolNames(): Promise<string[]> {
    await this.ensureInitialized();
    const tools = await this.loader.loadAllTools();
    return tools.map(tool => tool.name);
  }

  /**
   * Check if a tool exists
   */
  async hasTool(name: string): Promise<boolean> {
    await this.ensureInitialized();
    const tool = await this.loader.getTool(name);
    return tool !== undefined;
  }

  /**
   * Get tool definition by name
   */
  async getToolDefinition(name: string): Promise<ToolDefinition | undefined> {
    await this.ensureInitialized();
    return await this.loader.getTool(name);
  }

  /**
   * Get tools by category
   */
  async getToolsByCategory(categoryName: string): Promise<ToolDefinition[]> {
    await this.ensureInitialized();
    return await this.loader.getToolsByCategory(categoryName);
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    await this.ensureInitialized();
    const categories = await this.loader.getCategories();
    return categories.map(cat => cat.name);
  }

  /**
   * Get tool statistics
   */
  async getStats(): Promise<{ totalTools: number; totalCategories: number; categorizedTools: { [category: string]: number } }> {
    await this.ensureInitialized();
    const categories = await this.loader.getCategories();
    
    const categorizedTools: { [category: string]: number } = {};
    let totalTools = 0;
    
    for (const category of categories) {
      categorizedTools[category.name] = category.tools.length;
      totalTools += category.tools.length;
    }

    return {
      totalTools,
      totalCategories: categories.length,
      categorizedTools
    };
  }
}