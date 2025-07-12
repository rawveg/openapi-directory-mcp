import { PromptTemplate } from './types.js';
import { PromptLoader } from './loader.js';

// Re-export the PromptTemplate type for backward compatibility
export { PromptTemplate } from './types.js';

// Create a global loader instance
const loader = new PromptLoader();

// Load all prompts using the plugin architecture
let allPrompts: PromptTemplate[] = [];
let promptsLoaded = false;

async function ensurePromptsLoaded(): Promise<void> {
  if (!promptsLoaded) {
    allPrompts = await loader.loadAllPrompts();
    promptsLoaded = true;
  }
}

// Combined export of all prompts - now dynamically loaded
export async function getAllPrompts(): Promise<PromptTemplate[]> {
  await ensurePromptsLoaded();
  return allPrompts;
}

// Export prompts by category
export async function getCoreDiscoveryPrompts(): Promise<PromptTemplate[]> {
  return loader.getPromptsByCategory('core-discovery');
}

export async function getActionOrientedPrompts(): Promise<PromptTemplate[]> {
  return loader.getPromptsByCategory('action-oriented');
}

export async function getAuthenticationPrompts(): Promise<PromptTemplate[]> {
  return loader.getPromptsByCategory('authentication');
}

// Get individual prompts by name
export async function getPromptByName(name: string): Promise<PromptTemplate | undefined> {
  await ensurePromptsLoaded();
  return allPrompts.find(prompt => prompt.name === name);
}

// Backward compatibility: synchronous export (will be empty until loaded)
export const ALL_PROMPTS: PromptTemplate[] = allPrompts;

// Initialize prompts when module is imported
ensurePromptsLoaded().catch(console.error);