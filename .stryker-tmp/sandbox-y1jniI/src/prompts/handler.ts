// @ts-nocheck
import { Prompt, PromptMessage } from "@modelcontextprotocol/sdk/types.js";
import { getAllPrompts, PromptTemplate } from "./templates.js";

export class PromptHandler {
  private prompts: Map<string, PromptTemplate> = new Map();
  private initialized: boolean = false;

  constructor() {
    // Initialize prompts asynchronously
    this.initializePrompts().catch(console.error);
  }

  private async initializePrompts(): Promise<void> {
    const allPrompts = await getAllPrompts();
    allPrompts.forEach((prompt) => {
      this.prompts.set(prompt.name, prompt);
    });
    this.initialized = true;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializePrompts();
    }
  }

  /**
   * Handle the prompts/list request
   */
  async listPrompts(): Promise<{ prompts: Prompt[] }> {
    await this.ensureInitialized();
    const prompts: Prompt[] = Array.from(this.prompts.values()).map(
      (template) => ({
        name: template.name,
        description: template.description,
        arguments: template.arguments || [],
      }),
    );

    return { prompts };
  }

  /**
   * Handle the prompts/get request
   */
  async getPrompt(request: {
    name: string;
    arguments?: Record<string, unknown>;
  }): Promise<{
    description: string;
    messages: PromptMessage[];
  }> {
    await this.ensureInitialized();
    const template = this.prompts.get(request.name);
    if (!template) {
      throw new Error(`Prompt not found: ${request.name}`);
    }

    // Validate required arguments
    if (template.arguments) {
      for (const arg of template.arguments) {
        if (
          arg.required &&
          (!request.arguments || !(arg.name in request.arguments))
        ) {
          throw new Error(`Missing required argument: ${arg.name}`);
        }
      }
    }

    const messages = template.generateMessages(request.arguments || {});

    return {
      description: template.description,
      messages,
    };
  }

  /**
   * Get all prompt names
   */
  async getPromptNames(): Promise<string[]> {
    await this.ensureInitialized();
    return Array.from(this.prompts.keys());
  }

  /**
   * Check if a prompt exists
   */
  async hasPrompt(name: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.prompts.has(name);
  }

  /**
   * Get prompt template by name
   */
  async getPromptTemplate(name: string): Promise<PromptTemplate | undefined> {
    await this.ensureInitialized();
    return this.prompts.get(name);
  }
}
