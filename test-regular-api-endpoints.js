#!/usr/bin/env node

/**
 * Test a regular API that should have endpoints to ensure backwards compatibility
 */

import { DualSourceApiClient } from './dist/api/dual-source-client.js';
import { CacheManager } from './dist/cache/manager.js';

async function testRegularAPIEndpoints() {
  console.log('🔍 Testing regular API endpoints functionality...\n');
  
  const cacheManager = new CacheManager();
  const dualClient = new DualSourceApiClient(
    'https://api.apis.guru/v2',
    'https://raw.githubusercontent.com/rawveg/enhanced-api-directory/main',
    cacheManager
  );
  
  try {
    // Get all APIs and find one that should have endpoints
    const allAPIs = await dualClient.listAPIs();
    const regularAPIs = Object.keys(allAPIs).filter(key => !key.startsWith('custom:'));
    
    console.log(`Found ${regularAPIs.length} regular APIs to test`);
    
    // Test with a few different APIs to find one with endpoints
    const testAPIs = regularAPIs.slice(0, 10);
    
    for (const apiId of testAPIs) {
      console.log(`\nTesting API: ${apiId}`);
      
      try {
        const endpoints = await dualClient.getAPIEndpoints(apiId, 1, 5);
        const endpointCount = endpoints.results?.length || 0;
        console.log(`   Endpoints found: ${endpointCount}`);
        
        if (endpointCount > 0) {
          console.log(`   ✅ Found endpoints! Testing first endpoint...`);
          const firstEndpoint = endpoints.results[0];
          console.log(`   First endpoint: ${firstEndpoint.method} ${firstEndpoint.path}`);
          
          // Test getEndpointDetails on this endpoint
          try {
            const details = await dualClient.getEndpointDetails(apiId, firstEndpoint.method, firstEndpoint.path);
            console.log(`   ✅ getEndpointDetails succeeded for regular API!`);
            console.log(`     Method: ${details.method}`);
            console.log(`     Path: ${details.path}`);
            console.log(`     Summary: ${details.summary || 'N/A'}`);
            console.log(`     Parameters: ${details.parameters?.length || 0}`);
            console.log(`     Responses: ${details.responses?.length || 0}`);
            
            // This proves backwards compatibility works
            break;
          } catch (detailsError) {
            console.log(`   ❌ getEndpointDetails failed: ${detailsError.message}`);
          }
        } else {
          console.log(`   No endpoints for ${apiId}`);
        }
      } catch (endpointsError) {
        console.log(`   ❌ getAPIEndpoints failed: ${endpointsError.message}`);
      }
    }
    
    // Also test that custom APIs still work
    console.log('\n📋 Verifying custom APIs still work:');
    try {
      const customDetails = await dualClient.getEndpointDetails('custom:n8n:v1.1.1', 'POST', '/credentials');
      console.log(`   ✅ Custom API getEndpointDetails still works: ${customDetails.method} ${customDetails.path}`);
    } catch (error) {
      console.log(`   ❌ Custom API failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
  }
}

testRegularAPIEndpoints().catch(console.error);