#!/usr/bin/env node

/**
 * Test backwards compatibility - ensure regular APIs like PayPal still work
 */

import { DualSourceApiClient } from './dist/api/dual-source-client.js';
import { CacheManager } from './dist/cache/manager.js';

async function testBackwardsCompatibility() {
  console.log('🔍 Testing backwards compatibility with regular APIs...\n');
  
  const cacheManager = new CacheManager();
  const dualClient = new DualSourceApiClient(
    'https://api.apis.guru/v2',
    'https://raw.githubusercontent.com/rawveg/enhanced-api-directory/main',
    cacheManager
  );
  
  try {
    // Test 1: List APIs and find PayPal
    console.log('1. Testing API listing:');
    const allAPIs = await dualClient.listAPIs();
    const paypalKeys = Object.keys(allAPIs).filter(key => key.includes('paypal'));
    console.log(`   Found ${paypalKeys.length} PayPal APIs:`);
    paypalKeys.forEach(key => console.log(`     - ${key}`));
    
    if (paypalKeys.length === 0) {
      console.log('   ❌ No PayPal APIs found - testing with another provider...');
      
      // Look for any regular API to test with
      const regularAPIs = Object.keys(allAPIs).filter(key => !key.startsWith('custom:'));
      if (regularAPIs.length > 0) {
        const testAPI = regularAPIs[0];
        console.log(`   Using ${testAPI} for testing instead`);
        
        // Try to get endpoints for this API
        try {
          const endpoints = await dualClient.getAPIEndpoints(testAPI, 1, 5);
          console.log(`   ✅ Got ${endpoints.results?.length || 0} endpoints for ${testAPI}`);
          
          if (endpoints.results && endpoints.results.length > 0) {
            const firstEndpoint = endpoints.results[0];
            console.log(`   Testing endpoint details for: ${firstEndpoint.method} ${firstEndpoint.path}`);
            
            const details = await dualClient.getEndpointDetails(testAPI, firstEndpoint.method, firstEndpoint.path);
            console.log(`   ✅ getEndpointDetails worked for regular API!`);
            console.log(`     Method: ${details.method}`);
            console.log(`     Path: ${details.path}`);
            console.log(`     Summary: ${details.summary || 'N/A'}`);
          }
        } catch (error) {
          console.log(`   ❌ Error with regular API: ${error.message}`);
        }
      }
    } else {
      // Test with PayPal if available
      const paypalAPI = paypalKeys[0];
      console.log(`\n2. Testing PayPal API: ${paypalAPI}`);
      
      try {
        const endpoints = await dualClient.getAPIEndpoints(paypalAPI, 1, 5);
        console.log(`   ✅ Got ${endpoints.results?.length || 0} endpoints`);
        
        if (endpoints.results && endpoints.results.length > 0) {
          const firstEndpoint = endpoints.results[0];
          console.log(`   Testing endpoint: ${firstEndpoint.method} ${firstEndpoint.path}`);
          
          const details = await dualClient.getEndpointDetails(paypalAPI, firstEndpoint.method, firstEndpoint.path);
          console.log(`   ✅ getEndpointDetails worked for PayPal!`);
          console.log(`     Method: ${details.method}`);
          console.log(`     Path: ${details.path}`);
          console.log(`     Summary: ${details.summary || 'N/A'}`);
        }
      } catch (error) {
        console.log(`   ❌ Error with PayPal API: ${error.message}`);
      }
    }
    
    // Test 3: Compare custom vs regular API behavior
    console.log('\n3. Testing mixed API types:');
    console.log('   Custom APIs:');
    Object.keys(allAPIs).filter(key => key.startsWith('custom:')).forEach(key => {
      console.log(`     - ${key}`);
    });
    
    console.log('   Regular APIs (first 5):');
    Object.keys(allAPIs).filter(key => !key.startsWith('custom:')).slice(0, 5).forEach(key => {
      console.log(`     - ${key}`);
    });
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
  }
}

testBackwardsCompatibility().catch(console.error);