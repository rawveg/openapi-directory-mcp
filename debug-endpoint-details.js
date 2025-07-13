#!/usr/bin/env node

/**
 * Debug the getEndpointDetails implementation specifically
 */

import { CustomSpecClient } from './dist/custom-specs/custom-spec-client.js';
import { CacheManager } from './dist/cache/manager.js';

async function debugEndpointDetails() {
  console.log('🔍 Debugging getEndpointDetails implementation...\n');
  
  const cacheManager = new CacheManager();
  const customClient = new CustomSpecClient(cacheManager);
  
  try {
    console.log('1. Testing API lookup:');
    const apiId = 'custom:n8n:v1.1.1';
    const [, name, version] = apiId.split(':');
    console.log(`   Parsed - name: "${name}", version: "${version}"`);
    
    // Get manifest manager and check the spec
    const manifestManager = customClient.getManifestManager();
    
    console.log('\n2. Testing manifest lookup:');
    const specEntry = manifestManager.getSpec(apiId);
    console.log(`   manifestManager.getSpec("${apiId}"):`, specEntry ? 'Found' : 'Not found');
    
    if (specEntry) {
      console.log(`     ID: ${specEntry.id}`);
      console.log(`     Name: ${specEntry.name}`);
      console.log(`     Version: ${specEntry.version}`);
      console.log(`     Title: ${specEntry.title}`);
    }
    
    console.log('\n3. Testing spec file reading:');
    try {
      const specContent = manifestManager.readSpecFile(name, version);
      const spec = JSON.parse(specContent);
      console.log(`   Spec loaded successfully`);
      console.log(`   Has paths: ${!!spec.paths}`);
      console.log(`   Available paths: ${spec.paths ? Object.keys(spec.paths).length : 0}`);
      
      if (spec.paths) {
        console.log(`   Paths:`);
        Object.keys(spec.paths).slice(0, 5).forEach(path => {
          console.log(`     - ${path}`);
        });
        
        if (spec.paths['/credentials']) {
          console.log(`   ✅ /credentials path exists`);
          const pathItem = spec.paths['/credentials'];
          console.log(`   Available methods: ${Object.keys(pathItem).join(', ')}`);
          
          if (pathItem.post) {
            console.log(`   ✅ POST method exists for /credentials`);
          } else {
            console.log(`   ❌ POST method NOT found for /credentials`);
          }
        } else {
          console.log(`   ❌ /credentials path NOT found`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error reading spec: ${error.message}`);
    }
    
    console.log('\n4. Testing full getEndpointDetails:');
    try {
      const details = await customClient.getEndpointDetails('custom:n8n:v1.1.1', 'POST', '/credentials');
      console.log('   ✅ getEndpointDetails succeeded!');
      console.log(`     Method: ${details.method}`);
      console.log(`     Path: ${details.path}`);
    } catch (error) {
      console.log(`   ❌ getEndpointDetails failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error(`❌ Debug failed: ${error.message}`);
    console.error(error.stack);
  }
}

debugEndpointDetails().catch(console.error);