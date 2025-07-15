#!/usr/bin/env node

// Quick test to verify DataDog API works
// Set environment variable to disable MCP logging silencing
process.env.MCP_DISABLE_LOGGING = 'true';
process.argv.push('test'); // Add an argument to disable MCP mode silencing

// Import the dual-source client directly to bypass MCP initialization
import { DualSourceApiClient } from './dist/api/dual-source-client.js';
import { PersistentCacheManager } from './dist/cache/persistent-manager.js';

async function testDataDogAPI() {
  console.log('Testing DataDog API access...\n');
  
  const cacheManager = new PersistentCacheManager(86400000);
  
  // Create DualSourceApiClient directly
  const apiClient = new DualSourceApiClient(
    'https://api.apis.guru/v2',
    'https://api.openapidirectory.com',
    cacheManager
  );
  
  try {
    console.log('1. Testing getAPI for datadoghq.com:main');
    const result = await apiClient.getAPI('datadoghq.com', 'main');
    console.log('✅ Success! Got spec:', {
      info: result.info ? { title: result.info.title, version: result.info.version } : 'No info',
      paths: result.paths ? Object.keys(result.paths).length + ' paths' : 'No paths'
    });
  } catch (error) {
    console.error('❌ Failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  cacheManager.destroy();
  process.exit(0);
}

testDataDogAPI();