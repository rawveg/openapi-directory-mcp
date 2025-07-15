#!/usr/bin/env node

// Direct test without cache manager
process.env.MCP_DISABLE_LOGGING = 'true';

import axios from 'axios';

async function testDirect() {
  console.log('Testing direct secondary API access...\n');
  
  try {
    // Test 1: Get list.json
    console.log('1. Fetching list.json...');
    console.time('list.json');
    const listResponse = await axios.get('https://api.openapidirectory.com/list.json', {
      timeout: 30000
    });
    console.timeEnd('list.json');
    
    const apis = Object.keys(listResponse.data);
    console.log(`✅ Got ${apis.length} APIs`);
    console.log('DataDog API exists:', 'datadoghq.com:main' in listResponse.data);
    
    if ('datadoghq.com:main' in listResponse.data) {
      const datadogInfo = listResponse.data['datadoghq.com:main'];
      console.log('DataDog versions:', Object.keys(datadogInfo.versions));
      console.log('Preferred version:', datadogInfo.preferred);
      console.log('Swagger URL:', datadogInfo.versions[datadogInfo.preferred]?.swaggerUrl);
    }
    
    // Test 2: Get DataDog spec
    console.log('\n2. Fetching DataDog spec...');
    console.time('datadog-spec');
    const specResponse = await axios.get('https://api.openapidirectory.com/specs/datadoghq.com/main/v1.json', {
      timeout: 60000
    });
    console.timeEnd('datadog-spec');
    
    console.log(`✅ Got spec with ${Object.keys(specResponse.data.paths || {}).length} paths`);
    
    // Test 3: Count endpoints
    console.log('\n3. Counting endpoints...');
    let endpointCount = 0;
    if (specResponse.data.paths) {
      for (const [path, pathItem] of Object.entries(specResponse.data.paths)) {
        for (const method of Object.keys(pathItem)) {
          if (method !== 'parameters' && ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
            endpointCount++;
          }
        }
      }
    }
    console.log(`Total endpoints: ${endpointCount}`);
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    if (error.code) console.error('Error code:', error.code);
  }
}

testDirect();