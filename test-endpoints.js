#!/usr/bin/env node

// Test endpoints retrieval for DataDog API
process.env.MCP_DISABLE_LOGGING = 'true';

import { DualSourceApiClient } from './dist/api/dual-source-client.js';
import { PersistentCacheManager } from './dist/cache/persistent-manager.js';

async function testEndpoints() {
  console.log('Testing DataDog endpoints retrieval...\n');
  
  const cacheManager = new PersistentCacheManager(86400000);
  const apiClient = new DualSourceApiClient(
    'https://api.apis.guru/v2',
    'https://api.openapidirectory.com',
    cacheManager
  );
  
  try {
    console.log('1. Testing getEndpoints for datadoghq.com:main');
    console.time('getEndpoints');
    
    const result = await apiClient.getAPIEndpoints('datadoghq.com:main', 1, 100);
    
    console.timeEnd('getEndpoints');
    console.log(`✅ Success! Got ${result.results.length} endpoints`);
    console.log('First 5 endpoints:', result.results.slice(0, 5).map(e => `${e.method} ${e.path}`));
    console.log('Total endpoints:', result.pagination.total_results);
    console.log('Available tags:', result.available_tags.slice(0, 10));
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  cacheManager.destroy();
  process.exit(0);
}

testEndpoints();