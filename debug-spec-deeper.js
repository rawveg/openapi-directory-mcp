#!/usr/bin/env node

/**
 * Debug deeper into the spec structure
 */

import { CustomSpecClient } from './dist/custom-specs/custom-spec-client.js';
import { CacheManager } from './dist/cache/manager.js';

async function debugSpecDeeper() {
  console.log('🔍 Digging deeper into spec structure...\n');
  
  const cacheManager = new CacheManager();
  const customClient = new CustomSpecClient(cacheManager);
  const manifestManager = customClient.getManifestManager();
  
  try {
    const specContent = manifestManager.readSpecFile('n8n', 'v1.1.1');
    const spec = JSON.parse(specContent);
    
    const preferredVersion = spec.versions[spec.preferred];
    console.log(`Preferred version structure:`);
    console.log(`   Keys: ${Object.keys(preferredVersion).join(', ')}`);
    
    if (preferredVersion.spec) {
      console.log(`\nFound preferredVersion.spec:`);
      console.log(`   Keys: ${Object.keys(preferredVersion.spec).join(', ')}`);
      
      if (preferredVersion.spec.paths) {
        console.log(`   ✅ Found paths in preferredVersion.spec!`);
        console.log(`   Paths count: ${Object.keys(preferredVersion.spec.paths).length}`);
        
        if (preferredVersion.spec.paths['/credentials']) {
          console.log(`   ✅ /credentials path exists!`);
          const credentialsPath = preferredVersion.spec.paths['/credentials'];
          console.log(`   Available methods: ${Object.keys(credentialsPath).join(', ')}`);
          
          if (credentialsPath.post) {
            console.log(`   ✅ POST method exists for /credentials!`);
            console.log(`   POST operation summary: ${credentialsPath.post.summary || 'N/A'}`);
          }
        } else {
          console.log(`   ❌ /credentials not found in paths`);
          console.log(`   Available paths (first 10):`);
          Object.keys(preferredVersion.spec.paths).slice(0, 10).forEach(path => {
            console.log(`     - ${path}`);
          });
        }
      } else {
        console.log(`   ❌ No paths in preferredVersion.spec`);
      }
    } else {
      console.log(`   ❌ No spec property in preferred version`);
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
  }
}

debugSpecDeeper().catch(console.error);