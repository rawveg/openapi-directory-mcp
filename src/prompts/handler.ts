import { 
  Prompt, 
  PromptMessage 
} from '@modelcontextprotocol/sdk/types.js';
import { ALL_PROMPTS, PromptTemplate } from './templates.js';

export class PromptHandler {
  private prompts: Map<string, PromptTemplate> = new Map();

  constructor() {
    // Register all available prompts
    ALL_PROMPTS.forEach(prompt => {
      this.prompts.set(prompt.name, prompt);
    });
  }

  /**
   * Handle the prompts/list request
   */
  async listPrompts(): Promise<{ prompts: Prompt[] }> {
    const prompts: Prompt[] = Array.from(this.prompts.values()).map(template => ({
      name: template.name,
      description: template.description,
      arguments: template.arguments || []
    }));

    return { prompts };
  }

  /**
   * Handle the prompts/get request
   */
  async getPrompt(request: { name: string; arguments?: Record<string, unknown> }): Promise<{ 
    description: string; 
    messages: PromptMessage[] 
  }> {
    const template = this.prompts.get(request.name);
    if (!template) {
      throw new Error(`Prompt not found: ${request.name}`);
    }

    // Validate required arguments
    if (template.arguments) {
      for (const arg of template.arguments) {
        if (arg.required && (!request.arguments || !(arg.name in request.arguments))) {
          throw new Error(`Missing required argument: ${arg.name}`);
        }
      }
    }

    const messages = template.generateMessages(request.arguments || {});

    return {
      description: template.description,
      messages
    };
  }

  /**
   * Get all prompt names
   */
  getPromptNames(): string[] {
    return Array.from(this.prompts.keys());
  }

  /**
   * Check if a prompt exists
   */
  hasPrompt(name: string): boolean {
    return this.prompts.has(name);
  }

  /**
   * Get prompt template by name
   */
  getPromptTemplate(name: string): PromptTemplate | undefined {
    return this.prompts.get(name);
  }
}