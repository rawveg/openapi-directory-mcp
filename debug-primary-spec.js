#!/usr/bin/env node

/**
 * Debug what the primary client actually gets for a regular API spec
 */

import { ApiClient } from './dist/api/client.js';
import { CacheManager } from './dist/cache/manager.js';

async function debugPrimarySpec() {
  console.log('🔍 Debugging primary client spec loading...\n');
  
  const cacheManager = new CacheManager();
  const primaryClient = new ApiClient('https://api.apis.guru/v2', cacheManager);
  
  try {
    const apiId = 'adyen.com:AccountService';
    console.log(`Testing API: ${apiId}`);
    
    // Get the API info first
    const apis = await primaryClient.listAPIs();
    const apiInfo = apis[apiId];
    
    if (apiInfo) {
      console.log('\nAPI Info:');
      console.log(`  Preferred version: ${apiInfo.preferred}`);
      console.log(`  Available versions: ${Object.keys(apiInfo.versions).join(', ')}`);
      
      const preferredVersion = apiInfo.versions[apiInfo.preferred];
      console.log(`  Spec URL: ${preferredVersion.swaggerUrl}`);
      console.log(`  Title: ${preferredVersion.info.title}`);
    }
    
    // Manually fetch the spec to see its structure
    console.log('\nFetching spec directly...');
    const specUrl = 'https://api.apis.guru/v2/specs/adyen.com/AccountService/6/openapi.json';
    
    const response = await fetch(specUrl);
    const spec = await response.json();
    
    console.log('\nSpec structure:');
    console.log(`  OpenAPI version: ${spec.openapi || spec.swagger}`);
    console.log(`  Has paths: ${!!spec.paths}`);
    
    if (spec.paths) {
      const pathKeys = Object.keys(spec.paths);
      console.log(`  Number of paths: ${pathKeys.length}`);
      console.log(`  First 5 paths:`);
      pathKeys.slice(0, 5).forEach(path => {
        const methods = Object.keys(spec.paths[path]);
        console.log(`    ${path} - methods: ${methods.join(', ')}`);
      });
      
      // Test one path manually
      if (pathKeys.length > 0) {
        const firstPath = pathKeys[0];
        const pathItem = spec.paths[firstPath];
        const methods = Object.keys(pathItem).filter(m => ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(m.toLowerCase()));
        console.log(`\nTesting path manually: ${firstPath}`);
        console.log(`  HTTP methods found: ${methods.join(', ')}`);
        
        if (methods.length > 0) {
          const firstMethod = methods[0];
          const operation = pathItem[firstMethod];
          console.log(`  ${firstMethod.toUpperCase()} operation:`);
          console.log(`    Summary: ${operation.summary || 'N/A'}`);
          console.log(`    Description: ${operation.description || 'N/A'}`);
        }
      }
    } else {
      console.log('  ❌ No paths found in spec');
    }
    
  } catch (error) {
    console.error(`❌ Debug failed: ${error.message}`);
    console.error(error.stack);
  }
}

debugPrimarySpec().catch(console.error);