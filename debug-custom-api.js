#!/usr/bin/env node

/**
 * Debug script to check if custom:n8n:v1.1.1 exists and what's going wrong
 */

import { DualSourceApiClient } from './dist/api/dual-source-client.js';
import { CacheManager } from './dist/cache/manager.js';
import { CustomSpecClient } from './dist/custom-specs/custom-spec-client.js';

async function debugCustomAPI() {
  console.log('🔍 Debugging custom:n8n:v1.1.1 API...\n');
  
  const cacheManager = new CacheManager();
  const customClient = new CustomSpecClient(cacheManager);
  const dualClient = new DualSourceApiClient(
    'https://api.apis.guru/v2',
    'https://raw.githubusercontent.com/rawveg/enhanced-api-directory/main',
    cacheManager
  );
  
  try {
    // Check if custom client can find the API directly
    console.log('1. Testing CustomSpecClient directly:');
    const customHasAPI = await customClient.hasAPI('custom:n8n:v1.1.1');
    console.log(`   customClient.hasAPI('custom:n8n:v1.1.1'): ${customHasAPI}`);
    
    // List all custom APIs
    console.log('\n2. Listing all custom APIs:');
    const customAPIs = await customClient.listAPIs();
    const customAPIIds = Object.keys(customAPIs);
    console.log(`   Found ${customAPIIds.length} custom APIs:`);
    customAPIIds.forEach(id => console.log(`     - ${id}`));
    
    // Check if dual source client can find it
    console.log('\n3. Testing DualSourceApiClient:');
    try {
      const allAPIs = await dualClient.listAPIs();
      const hasN8N = 'custom:n8n:v1.1.1' in allAPIs;
      console.log(`   'custom:n8n:v1.1.1' in dualClient.listAPIs(): ${hasN8N}`);
      
      if (hasN8N) {
        console.log('   ✅ API found in dual client - trying getEndpointDetails...');
        const details = await dualClient.getEndpointDetails('custom:n8n:v1.1.1', 'POST', '/credentials');
        console.log('   ✅ getEndpointDetails worked!');
        console.log(`     Method: ${details.method}`);
        console.log(`     Path: ${details.path}`);
      } else {
        console.log('   ❌ API not found in dual client');
      }
    } catch (error) {
      console.log(`   ❌ Error in dual client: ${error.message}`);
    }
    
  } catch (error) {
    console.error(`❌ Debug failed: ${error.message}`);
    console.error(error.stack);
  }
}

debugCustomAPI().catch(console.error);