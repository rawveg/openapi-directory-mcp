#!/usr/bin/env node

/**
 * Debug the actual structure of the n8n spec file
 */

import { CustomSpecClient } from './dist/custom-specs/custom-spec-client.js';
import { CacheManager } from './dist/cache/manager.js';

async function debugSpecStructure() {
  console.log('🔍 Debugging n8n spec file structure...\n');
  
  const cacheManager = new CacheManager();
  const customClient = new CustomSpecClient(cacheManager);
  const manifestManager = customClient.getManifestManager();
  
  try {
    const specContent = manifestManager.readSpecFile('n8n', 'v1.1.1');
    const spec = JSON.parse(specContent);
    
    console.log('📄 Spec file structure:');
    console.log(`   Top-level keys: ${Object.keys(spec).join(', ')}`);
    
    // Check common OpenAPI 3.x structure
    if (spec.openapi) {
      console.log(`   OpenAPI version: ${spec.openapi}`);
    } else if (spec.swagger) {
      console.log(`   Swagger version: ${spec.swagger}`);
    }
    
    if (spec.info) {
      console.log(`   Title: ${spec.info.title}`);
      console.log(`   Version: ${spec.info.version}`);
    }
    
    // Check for paths
    if (spec.paths) {
      console.log(`   Direct paths found: ${Object.keys(spec.paths).length}`);
      console.log(`   First 5 paths:`);
      Object.keys(spec.paths).slice(0, 5).forEach(path => {
        console.log(`     - ${path}`);
      });
    } else {
      console.log(`   ❌ No 'paths' property found`);
      
      // Maybe it's wrapped differently - check for nested structure
      if (spec.spec && spec.spec.paths) {
        console.log(`   Found paths in spec.spec.paths: ${Object.keys(spec.spec.paths).length}`);
      } else if (spec.versions) {
        console.log(`   Found 'versions' property - checking structure...`);
        console.log(`   Versions keys: ${Object.keys(spec.versions).join(', ')}`);
        
        // Check the preferred version
        if (spec.preferred && spec.versions[spec.preferred]) {
          const preferredSpec = spec.versions[spec.preferred];
          console.log(`   Preferred version: ${spec.preferred}`);
          console.log(`   Preferred spec keys: ${Object.keys(preferredSpec).join(', ')}`);
          
          if (preferredSpec.openApiSpec && preferredSpec.openApiSpec.paths) {
            console.log(`   ✅ Found paths in preferred version openApiSpec!`);
            console.log(`   Paths count: ${Object.keys(preferredSpec.openApiSpec.paths).length}`);
            
            if (preferredSpec.openApiSpec.paths['/credentials']) {
              console.log(`   ✅ /credentials path exists in openApiSpec`);
            } else {
              console.log(`   ❌ /credentials not found, available paths:`);
              Object.keys(preferredSpec.openApiSpec.paths).slice(0, 10).forEach(path => {
                console.log(`     - ${path}`);
              });
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
  }
}

debugSpecStructure().catch(console.error);