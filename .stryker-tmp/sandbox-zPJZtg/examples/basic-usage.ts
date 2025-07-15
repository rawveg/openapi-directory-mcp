#!/usr/bin/env tsx
// @ts-nocheck

/**
 * Basic usage example for the OpenAPI Directory MCP Server
 * This demonstrates how to interact with the server programmatically
 */

import { CacheManager } from '../src/cache/manager.js';
import { ApiClient } from '../src/api/client.js';
import { ToolGenerator } from '../src/tools/generator.js';
import { getResourcePrompts } from '../src/prompts/index.js';

async function main() {
  console.log('OpenAPI Directory MCP Server - Basic Usage Example');
  console.log('==================================================\n');

  // Initialize components
  const cacheManager = new CacheManager(86400000); // 24 hour TTL
  const apiClient = new ApiClient('https://api.apis.guru/v2', cacheManager);
  const toolGenerator = new ToolGenerator();

  try {
    // 1. Generate available tools
    console.log('1. Available Tools:');
    const tools = await toolGenerator.generateTools();
    tools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    console.log();

    // 2. Get resource prompts
    console.log('2. Available Resource Prompts:');
    const prompts = getResourcePrompts();
    prompts.forEach(prompt => {
      console.log(`   - ${prompt.name}: ${prompt.description}`);
    });
    console.log();

    // 3. Fetch basic directory information
    console.log('3. Directory Information:');
    
    // Get providers
    console.log('   Fetching providers...');
    const providers = await apiClient.getProviders();
    console.log(`   Total providers: ${providers.data.length}`);
    console.log(`   First 5 providers: ${providers.data.slice(0, 5).join(', ')}`);
    
    // Get metrics
    console.log('   Fetching metrics...');
    const metrics = await apiClient.getMetrics();
    console.log(`   Total APIs: ${metrics.numAPIs}`);
    console.log(`   Total specs: ${metrics.numSpecs}`);
    console.log(`   Total endpoints: ${metrics.numEndpoints}`);
    console.log();

    // 4. Search for APIs
    console.log('4. API Search Examples:');
    
    // Search for Google APIs
    console.log('   Searching for Google APIs...');
    const googleAPIs = await apiClient.searchAPIs('google');
    console.log(`   Found ${Object.keys(googleAPIs).length} Google APIs`);
    
    // Search for payment APIs
    console.log('   Searching for payment APIs...');
    const paymentAPIs = await apiClient.searchAPIs('payment');
    console.log(`   Found ${Object.keys(paymentAPIs).length} payment-related APIs`);
    console.log();

    // 5. Get popular APIs
    console.log('5. Popular APIs:');
    const popularAPIs = await apiClient.getPopularAPIs();
    const popularIds = Object.keys(popularAPIs).slice(0, 5);
    popularIds.forEach(id => {
      const api = popularAPIs[id];
      const preferredVersion = api.versions[api.preferred];
      console.log(`   - ${id}: ${preferredVersion.info.title || 'No title'}`);
    });
    console.log();

    // 6. Provider statistics
    console.log('6. Provider Statistics:');
    const popularProviders = ['googleapis.com', 'azure.com', 'github.com'];
    
    for (const provider of popularProviders) {
      try {
        const stats = await apiClient.getProviderStats(provider);
        console.log(`   ${provider}:`);
        console.log(`     Total APIs: ${stats.totalAPIs}`);
        console.log(`     Total versions: ${stats.totalVersions}`);
        console.log(`     Latest update: ${stats.latestUpdate}`);
      } catch (error) {
        console.log(`   ${provider}: Error fetching stats`);
      }
    }
    console.log();

    // 7. Cache statistics
    console.log('7. Cache Statistics:');
    const cacheStats = cacheManager.getStats();
    console.log(`   Cache size: ${cacheManager.getSize()} entries`);
    console.log(`   Cache hits: ${cacheStats.hits}`);
    console.log(`   Cache misses: ${cacheStats.misses}`);
    console.log(`   Memory usage: ${cacheManager.getMemoryUsage()} bytes`);
    console.log();

    console.log('Example completed successfully!');
    console.log('You can now use the MCP server with MCP-compatible clients.');

  } catch (error) {
    console.error('Error running example:', error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main };