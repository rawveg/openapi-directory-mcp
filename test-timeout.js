#!/usr/bin/env node

// Test to debug the timeout issue
process.env.MCP_DISABLE_LOGGING = 'true';

import { SecondaryApiClient } from './dist/api/secondary-client.js';
import { PersistentCacheManager } from './dist/cache/persistent-manager.js';

async function debugTimeout() {
  console.log('Testing secondary API timeout issue...\n');
  
  const cacheManager = new PersistentCacheManager(86400000);
  const secondaryClient = new SecondaryApiClient(
    'https://api.openapidirectory.com',
    cacheManager
  );
  
  try {
    // Step 1: Test listAPIs
    console.log('1. Testing listAPIs()...');
    console.time('listAPIs');
    const apis = await secondaryClient.listAPIs();
    console.timeEnd('listAPIs');
    console.log(`✅ Got ${Object.keys(apis).length} APIs`);
    console.log('DataDog exists:', 'datadoghq.com:main' in apis);
    
    // Step 2: Test getAPIEndpoints
    console.log('\n2. Testing getAPIEndpoints()...');
    console.time('getAPIEndpoints');
    const endpoints = await secondaryClient.getAPIEndpoints('datadoghq.com:main', 1, 100);
    console.timeEnd('getAPIEndpoints');
    console.log(`✅ Got ${endpoints.results.length} endpoints`);
    console.log('Total endpoints:', endpoints.pagination.total_results);
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  cacheManager.destroy();
  process.exit(0);
}

debugTimeout();