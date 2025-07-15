// @ts-nocheck
import { PromptMessage } from "@modelcontextprotocol/sdk/types.js";

export interface PromptTemplate {
  name: string;
  description: string;
  template: string;
  category: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
  generateMessages: (args: Record<string, unknown>) => PromptMessage[];
}
