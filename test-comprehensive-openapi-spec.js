#!/usr/bin/env node

/**
 * Comprehensive test of get_openapi_spec for both custom and regular APIs
 */

import { DualSourceApiClient } from './dist/api/dual-source-client.js';
import { CacheManager } from './dist/cache/manager.js';

async function testComprehensive() {
  console.log('🔍 Comprehensive test of get_openapi_spec functionality...\n');
  
  const cacheManager = new CacheManager();
  const dualClient = new DualSourceApiClient(
    'https://api.apis.guru/v2',
    'https://raw.githubusercontent.com/rawveg/enhanced-api-directory/main',
    cacheManager
  );
  
  try {
    // Test 1: Custom API - detailed validation
    console.log('1. Testing custom API (custom:n8n:v1.1.1):');
    const customSpec = await dualClient.getOpenAPISpec('custom:n8n:v1.1.1');
    console.log(`   ✅ Loaded custom spec`);
    console.log(`   OpenAPI version: ${customSpec.openapi || customSpec.swagger}`);
    console.log(`   Title: ${customSpec.info?.title}`);
    console.log(`   Description: ${customSpec.info?.description?.substring(0, 80)}...`);
    console.log(`   Paths count: ${customSpec.paths ? Object.keys(customSpec.paths).length : 0}`);
    console.log(`   Has /credentials: ${!!customSpec.paths?.['/credentials']}`);
    console.log(`   Has components: ${!!customSpec.components}`);
    console.log(`   Has security: ${!!customSpec.security}`);
    
    // Test 2: Regular API by getting a real API first
    console.log('\n2. Testing regular API (finding a working one):');
    const allAPIs = await dualClient.listAPIs();
    const regularAPIIds = Object.keys(allAPIs).filter(id => !id.startsWith('custom:'));
    
    let testedRegular = false;
    for (const apiId of regularAPIIds.slice(0, 5)) { // Test first 5
      try {
        const api = allAPIs[apiId];
        const preferredVersion = api.versions[api.preferred];
        const specUrl = preferredVersion.swaggerUrl;
        
        console.log(`   Trying ${apiId} with URL: ${specUrl}`);
        const regularSpec = await dualClient.getOpenAPISpec(specUrl);
        
        console.log(`   ✅ Loaded regular spec for ${apiId}`);
        console.log(`   OpenAPI version: ${regularSpec.openapi || regularSpec.swagger}`);
        console.log(`   Title: ${regularSpec.info?.title}`);
        console.log(`   Paths count: ${regularSpec.paths ? Object.keys(regularSpec.paths).length : 0}`);
        testedRegular = true;
        break;
      } catch (error) {
        console.log(`   ❌ Failed for ${apiId}: ${error.message}`);
      }
    }
    
    if (!testedRegular) {
      console.log('   ❌ Could not test any regular API successfully');
    }
    
    // Test 3: Compare endpoint details integration
    console.log('\n3. Testing integration with getEndpointDetails:');
    
    // Custom API endpoint details
    try {
      const customEndpoint = await dualClient.getEndpointDetails('custom:n8n:v1.1.1', 'POST', '/credentials');
      console.log(`   ✅ Custom getEndpointDetails works: ${customEndpoint.method} ${customEndpoint.path}`);
    } catch (error) {
      console.log(`   ❌ Custom getEndpointDetails failed: ${error.message}`);
    }
    
    // Regular API endpoint details (if we found a working one)
    if (testedRegular) {
      const testAPI = 'adyen.com:AccountService';
      try {
        const regularEndpoint = await dualClient.getEndpointDetails(testAPI, 'POST', '/checkAccountHolder');
        console.log(`   ✅ Regular getEndpointDetails works: ${regularEndpoint.method} ${regularEndpoint.path}`);
      } catch (error) {
        console.log(`   ❌ Regular getEndpointDetails failed: ${error.message}`);
      }
    }
    
    // Test 4: Error scenarios
    console.log('\n4. Testing error scenarios:');
    
    // Invalid custom API
    try {
      await dualClient.getOpenAPISpec('custom:invalid:v1.0.0');
      console.log('   ❌ Should have failed for invalid custom API');
    } catch (error) {
      console.log(`   ✅ Correctly rejected invalid custom API: ${error.message}`);
    }
    
    // Invalid URL
    try {
      await dualClient.getOpenAPISpec('https://invalid-url-that-does-not-exist.com/spec.json');
      console.log('   ❌ Should have failed for invalid URL');
    } catch (error) {
      console.log(`   ✅ Correctly rejected invalid URL: ${error.message}`);
    }
    
    console.log('\n✅ Comprehensive test completed successfully!');
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
  }
}

testComprehensive().catch(console.error);