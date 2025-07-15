#!/usr/bin/env node

// Test simulating the exact MCP call
process.env.MCP_DISABLE_LOGGING = 'true';
process.argv.push('test'); // Add argument to disable MCP mode

import { OpenAPIDirectoryServer } from './dist/index.js';

async function testMCPCall() {
  console.log('Testing MCP call for get_endpoints...\n');
  
  const server = new OpenAPIDirectoryServer();
  
  try {
    console.time('get_endpoints');
    // Access the apiClient directly since callTool is private
    const result = await server.apiClient.getAPIEndpoints('datadoghq.com:main', 1, 100);
    console.timeEnd('get_endpoints');
    
    console.log(`✅ Success! Got ${result.results.length} endpoints`);
    console.log('Total endpoints:', result.pagination.total_results);
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testMCPCall();