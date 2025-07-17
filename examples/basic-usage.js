#!/usr/bin/env node

/**
 * Basic usage example for the OpenAPI Directory MCP Server
 * This demonstrates how to interact with the server programmatically
 */

import { CacheManager } from '../dist/cache/manager.js';
import { ApiClient } from '../dist/api/client.js';
import { ToolHandler } from '../dist/tools/handler.js';
import { PromptHandler } from '../dist/prompts/handler.js';

async function main() {
  console.log('OpenAPI Directory MCP Server - Basic Usage Example');
  console.log('==================================================\n');

  // Initialize components
  const cacheManager = new CacheManager(86400000); // 24 hour TTL
  const apiClient = new ApiClient('https://api.apis.guru/v2', cacheManager);
  const toolHandler = new ToolHandler();
  const promptHandler = new PromptHandler();

  try {
    // 1. List available tools
    console.log('1. Available Tools:');
    const { tools } = await toolHandler.listTools();
    console.log(`   Total tools: ${tools.length}`);
    
    // Show a few tools
    tools.slice(0, 5).forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description.split('.')[0]}`);
    });
    console.log('   ...\n');

    // Example of calling a tool
    console.log('   Example tool call - get_providers:');
    const context = { apiClient, cacheManager };
    const result = await toolHandler.callTool('get_providers', {}, context);
    console.log(`   Found ${result.data.length} providers`);
    console.log(`   First 5: ${result.data.slice(0, 5).join(', ')}...`);
    console.log();

    // 2. Get resource prompts
    console.log('2. Available Resource Prompts:');
    const { prompts } = await promptHandler.listPrompts();
    console.log(`   Total prompts: ${prompts.length}`);
    prompts.slice(0, 3).forEach(prompt => {
      console.log(`   - ${prompt.name}: ${prompt.description}`);
    });
    console.log('   ...\n');

    // 3. Search for APIs using tool
    console.log('3. API Search Example:');
    const searchResult = await toolHandler.callTool('search_apis', 
      { query: 'google' }, 
      context
    );
    console.log(`   Found ${searchResult.results.length} Google APIs`);
    if (searchResult.results.length > 0) {
      console.log(`   First result: ${searchResult.results[0].title}`);
    }
    console.log();

    // 4. Cache statistics
    console.log('4. Cache Statistics:');
    const cacheStats = await toolHandler.callTool('cache_stats', {}, context);
    console.log(`   Total entries: ${cacheStats.keys}`);
    console.log(`   Memory usage: ${((cacheStats.ksize + cacheStats.vsize) / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Hits: ${cacheStats.hits}`);
    console.log(`   Misses: ${cacheStats.misses}`);
    console.log();

    console.log('Example completed successfully!');
    console.log('You can now use the MCP server with MCP-compatible clients.');

  } catch (error) {
    console.error('Error running example:', error);
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);