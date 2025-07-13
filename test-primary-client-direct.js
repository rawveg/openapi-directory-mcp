#!/usr/bin/env node

/**
 * Test the primary client directly to see if it can handle regular APIs
 */

import { ApiClient } from './dist/api/client.js';
import { CacheManager } from './dist/cache/manager.js';

async function testPrimaryClientDirect() {
  console.log('🔍 Testing primary client directly with regular APIs...\n');
  
  const cacheManager = new CacheManager();
  const primaryClient = new ApiClient('https://api.apis.guru/v2', cacheManager);
  
  try {
    // Get a simple API to test
    console.log('1. Getting all APIs from primary client:');
    const apis = await primaryClient.listAPIs();
    const apiIds = Object.keys(apis);
    console.log(`   Found ${apiIds.length} APIs`);
    
    // Find an API that might have endpoints
    const testAPIId = '1password.com:events';
    console.log(`\n2. Testing ${testAPIId}:`);
    
    try {
      const endpoints = await primaryClient.getAPIEndpoints(testAPIId, 1, 5);
      console.log(`   Endpoints: ${endpoints.endpoints?.length || 0}`);
      
      if (endpoints.endpoints && endpoints.endpoints.length > 0) {
        const firstEndpoint = endpoints.endpoints[0];
        console.log(`   First endpoint: ${firstEndpoint.method} ${firstEndpoint.path}`);
        
        // Test getEndpointDetails
        const details = await primaryClient.getEndpointDetails(testAPIId, firstEndpoint.method, firstEndpoint.path);
        console.log(`   ✅ Primary client getEndpointDetails works!`);
        console.log(`     Method: ${details.method}`);
        console.log(`     Path: ${details.path}`);
      } else {
        console.log(`   No endpoints found for ${testAPIId}`);
        
        // Try another API
        const adyenAPI = 'adyen.com:AccountService';
        console.log(`\n   Trying ${adyenAPI}:`);
        const adyenEndpoints = await primaryClient.getAPIEndpoints(adyenAPI, 1, 5);
        console.log(`   Adyen endpoints: ${adyenEndpoints.endpoints?.length || 0}`);
        
        if (adyenEndpoints.endpoints && adyenEndpoints.endpoints.length > 0) {
          const firstEndpoint = adyenEndpoints.endpoints[0];
          console.log(`   First Adyen endpoint: ${firstEndpoint.method} ${firstEndpoint.path}`);
          
          const details = await primaryClient.getEndpointDetails(adyenAPI, firstEndpoint.method, firstEndpoint.path);
          console.log(`   ✅ Primary client works with Adyen!`);
          console.log(`     Method: ${details.method}`);
          console.log(`     Path: ${details.path}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
  }
}

testPrimaryClientDirect().catch(console.error);