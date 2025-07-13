#!/usr/bin/env node

/**
 * Debug the actual return format of getAPIEndpoints
 */

import { ApiClient } from './dist/api/client.js';
import { CacheManager } from './dist/cache/manager.js';

async function debugEndpointReturnFormat() {
  console.log('🔍 Debugging getAPIEndpoints return format...\n');
  
  const cacheManager = new CacheManager();
  const primaryClient = new ApiClient('https://api.apis.guru/v2', cacheManager);
  
  try {
    const apiId = 'adyen.com:AccountService';
    console.log(`Testing API: ${apiId}`);
    
    const result = await primaryClient.getAPIEndpoints(apiId, 1, 5);
    
    console.log('\ngetAPIEndpoints return structure:');
    console.log(`  Type: ${typeof result}`);
    console.log(`  Keys: ${Object.keys(result).join(', ')}`);
    
    if (result.results) {
      console.log(`  results length: ${result.results.length}`);
      if (result.results.length > 0) {
        console.log(`  First result: ${JSON.stringify(result.results[0], null, 2)}`);
      }
    }
    
    if (result.endpoints) {
      console.log(`  endpoints length: ${result.endpoints.length}`);
    }
    
    if (result.pagination) {
      console.log(`  pagination: ${JSON.stringify(result.pagination, null, 2)}`);
    }
    
    if (result.available_tags) {
      console.log(`  available_tags: ${result.available_tags.slice(0, 5).join(', ')} (first 5)`);
    }
    
  } catch (error) {
    console.error(`❌ Debug failed: ${error.message}`);
    console.error(error.stack);
  }
}

debugEndpointReturnFormat().catch(console.error);