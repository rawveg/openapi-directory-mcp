#!/usr/bin/env node

/**
 * Test the get_openapi_spec functionality with custom API IDs
 */

import { DualSourceApiClient } from './dist/api/dual-source-client.js';
import { CacheManager } from './dist/cache/manager.js';

async function testGetOpenAPISpec() {
  console.log('🔍 Testing get_openapi_spec with custom API IDs...\n');
  
  const cacheManager = new CacheManager();
  const dualClient = new DualSourceApiClient(
    'https://api.apis.guru/v2',
    'https://raw.githubusercontent.com/rawveg/enhanced-api-directory/main',
    cacheManager
  );
  
  try {
    // Test 1: Custom API ID
    console.log('1. Testing custom API ID: custom:n8n:v1.1.1');
    try {
      const customSpec = await dualClient.getOpenAPISpec('custom:n8n:v1.1.1');
      console.log('   ✅ Custom API spec loaded successfully!');
      console.log(`   OpenAPI version: ${customSpec.openapi || customSpec.swagger}`);
      console.log(`   Title: ${customSpec.info?.title}`);
      console.log(`   Paths: ${customSpec.paths ? Object.keys(customSpec.paths).length : 0}`);
      
      if (customSpec.paths && customSpec.paths['/credentials']) {
        console.log('   ✅ /credentials path found in spec!');
      } else {
        console.log('   ❌ /credentials path not found');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Test 2: Regular URL (should still work)
    console.log('\n2. Testing regular URL spec loading:');
    try {
      const regularSpec = await dualClient.getOpenAPISpec('https://api.apis.guru/v2/specs/1forge.com/0.0.1/swagger.json');
      console.log('   ✅ Regular URL spec loaded successfully!');
      console.log(`   OpenAPI version: ${regularSpec.openapi || regularSpec.swagger}`);
      console.log(`   Title: ${regularSpec.info?.title}`);
      console.log(`   Paths: ${regularSpec.paths ? Object.keys(regularSpec.paths).length : 0}`);
    } catch (error) {
      console.log(`   ❌ Error with regular URL: ${error.message}`);
    }
    
    // Test 3: Invalid custom API ID
    console.log('\n3. Testing invalid custom API ID:');
    try {
      await dualClient.getOpenAPISpec('custom:nonexistent:v1.0.0');
      console.log('   ❌ Should have failed but did not');
    } catch (error) {
      console.log(`   ✅ Correctly failed: ${error.message}`);
    }
    
    // Test 4: Malformed custom API ID
    console.log('\n4. Testing malformed custom API ID:');
    try {
      await dualClient.getOpenAPISpec('custom:invalid');
      console.log('   ❌ Should have failed but did not');
    } catch (error) {
      console.log(`   ✅ Correctly failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
  }
}

testGetOpenAPISpec().catch(console.error);