#!/usr/bin/env node
/**
 * COMPREHENSIVE TRIPLE-SOURCE SMOKE TEST
 * Tests ALL 22 tools against ALL 3 data sources (primary, secondary, custom)
 * This is the test that was explicitly requested to verify every tool against every data source
 */
import { CacheManager } from '../../dist/cache/manager.js';
import { ApiClient } from '../../dist/api/client.js';
import { SecondaryApiClient } from '../../dist/api/secondary-client.js';
import { CustomSpecClient } from '../../dist/custom-specs/custom-spec-client.js';
import { DualSourceApiClient } from '../../dist/api/dual-source-client.js';
import { ToolHandler } from '../../dist/tools/handler.js';

const TOOL_CONFIGURATIONS = {
  // Provider Tools
  get_providers: {},
  get_provider_apis: { provider: 'googleapis.com' },
  get_provider_services: { provider: 'googleapis.com' },
  get_provider_stats: { provider: 'googleapis.com' },
  
  // API Tools  
  get_api: { provider: 'googleapis.com', service: 'admin', api: 'directory_v1' },
  list_all_apis: {},
  get_api_summary: { api_id: 'googleapis.com:admin' },
  
  // Search & Discovery
  search_apis: { query: 'google' },
  get_popular_apis: {},
  get_recently_updated: {},
  analyze_api_categories: {},
  
  // Metrics
  get_metrics: {},
  
  // OpenAPI Specs
  get_openapi_spec: { url: 'https://api.apis.guru/v2/specs/googleapis.com/admin/directory_v1/openapi.json' },
  
  // Endpoints
  get_endpoints: { api_id: 'googleapis.com:admin' },
  get_endpoint_details: { 
    api_id: 'googleapis.com:admin', 
    method: 'GET', 
    path: '/admin/directory/v1/groups' 
  },
  get_endpoint_schema: { 
    api_id: 'googleapis.com:admin', 
    method: 'GET', 
    path: '/admin/directory/v1/groups' 
  },
  get_endpoint_examples: { 
    api_id: 'googleapis.com:admin', 
    method: 'GET', 
    path: '/admin/directory/v1/groups' 
  },
  
  // Cache Tools
  cache_info: {},
  cache_stats: {},
  clear_cache: {},
  clear_cache_key: { key: 'test-key' },
  list_cache_keys: {}
};

const CUSTOM_CONFIGURATIONS = {
  // Provider Tools - custom only has "custom" provider
  get_provider_apis: { provider: 'custom' },
  get_provider_services: { provider: 'custom' },
  get_provider_stats: { provider: 'custom' },
  
  // API Tools - use custom:name:version format
  get_api: { provider: 'custom', service: 'testapi', api: '1.0.0' },
  get_api_summary: { api_id: 'custom:testapi:1.0.0' },
  
  // OpenAPI Specs - use custom spec ID
  get_openapi_spec: { url: 'custom:testapi:1.0.0' },
  
  // Endpoints - use custom API ID format
  get_endpoints: { api_id: 'custom:testapi:1.0.0' },
  get_endpoint_details: { 
    api_id: 'custom:testapi:1.0.0', 
    method: 'GET', 
    path: '/users' 
  },
  get_endpoint_schema: { 
    api_id: 'custom:testapi:1.0.0', 
    method: 'GET', 
    path: '/users' 
  },
  get_endpoint_examples: { 
    api_id: 'custom:testapi:1.0.0', 
    method: 'GET', 
    path: '/users' 
  },
  
  // Cache Tools (same for all sources)
  cache_info: {},
  cache_stats: {},
  clear_cache: {},
  clear_cache_key: { key: 'test-key' },
  list_cache_keys: {}
};

const SECONDARY_CONFIGURATIONS = {
  // Use secondary-specific APIs that exist in secondary but not primary
  get_provider_apis: { provider: 'datadoghq.com' },
  get_provider_services: { provider: 'datadoghq.com' },
  get_provider_stats: { provider: 'datadoghq.com' },
  get_api: { provider: 'datadoghq.com', service: 'main', api: 'v1' },
  get_api_summary: { api_id: 'datadoghq.com:main' },
  get_endpoints: { api_id: 'datadoghq.com:main' },
  get_endpoint_details: { 
    api_id: 'datadoghq.com:main', 
    method: 'GET', 
    path: '/api/v2/actions/app_key_registrations' 
  },
  get_endpoint_schema: { 
    api_id: 'datadoghq.com:main', 
    method: 'GET', 
    path: '/api/v2/actions/app_key_registrations' 
  },
  get_endpoint_examples: { 
    api_id: 'datadoghq.com:main', 
    method: 'GET', 
    path: '/api/v2/actions/app_key_registrations' 
  },
  
  // Cache Tools (same for all sources)
  cache_info: {},
  cache_stats: {},
  clear_cache: {},
  clear_cache_key: { key: 'test-key' },
  list_cache_keys: {}
};

async function testTripleSource() {
  console.log('🚀 COMPREHENSIVE TRIPLE-SOURCE SMOKE TEST');
  console.log('Testing ALL 22 tools against ALL 3 data sources\n');
  
  const cacheManager = new CacheManager();
  
  // Create individual clients for isolated testing
  const primaryClient = new ApiClient('https://api.apis.guru/v2', cacheManager);
  const secondaryClient = new SecondaryApiClient('https://api.openapidirectory.com', cacheManager);
  const customClient = new CustomSpecClient(cacheManager);
  const dualSourceClient = new DualSourceApiClient(
    'https://api.apis.guru/v2',
    'https://api.openapidirectory.com', 
    cacheManager
  );
  
  const toolHandler = new ToolHandler();
  await toolHandler.listTools();
  
  const results = {
    primary: { passed: 0, failed: 0, errors: [] },
    secondary: { passed: 0, failed: 0, errors: [] },
    custom: { passed: 0, failed: 0, errors: [] },
    triple: { passed: 0, failed: 0, errors: [] }
  };
  
  const tools = Object.keys(TOOL_CONFIGURATIONS);
  
  console.log(`📊 Total tools to test: ${tools.length}`);
  console.log(`📊 Total test combinations: ${tools.length * 4} (tools × 4 sources)\n`);
  
  // Test against PRIMARY source
  console.log('=' .repeat(60));
  console.log('🎯 TESTING PRIMARY SOURCE (APIs.guru)');
  console.log('=' .repeat(60));
  
  for (const tool of tools) {
    const config = TOOL_CONFIGURATIONS[tool];
    const context = { apiClient: primaryClient, cacheManager };
    
    try {
      console.log(`Testing ${tool} (primary)...`);
      const result = await toolHandler.callTool(tool, config, context);
      results.primary.passed++;
      console.log(`✅ ${tool} - PRIMARY: SUCCESS`);
    } catch (error) {
      results.primary.failed++;
      results.primary.errors.push({ tool, error: error.message });
      console.log(`❌ ${tool} - PRIMARY: ${error.message}`);
    }
  }
  
  // Test against SECONDARY source  
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 TESTING SECONDARY SOURCE (Enhanced Directory)');
  console.log('=' .repeat(60));
  
  for (const tool of tools) {
    const config = SECONDARY_CONFIGURATIONS[tool] || TOOL_CONFIGURATIONS[tool];
    const context = { apiClient: secondaryClient, cacheManager };
    
    try {
      console.log(`Testing ${tool} (secondary)...`);
      const result = await toolHandler.callTool(tool, config, context);
      results.secondary.passed++;
      console.log(`✅ ${tool} - SECONDARY: SUCCESS`);
    } catch (error) {
      results.secondary.failed++;
      results.secondary.errors.push({ tool, error: error.message });
      console.log(`❌ ${tool} - SECONDARY: ${error.message}`);
    }
  }
  
  // Test against CUSTOM source
  console.log('\n' + '=' .repeat(60)); 
  console.log('🎯 TESTING CUSTOM SOURCE (Local filesystem)');
  console.log('=' .repeat(60));
  
  for (const tool of tools) {
    const config = CUSTOM_CONFIGURATIONS[tool] || TOOL_CONFIGURATIONS[tool];
    const context = { apiClient: customClient, cacheManager };
    
    try {
      console.log(`Testing ${tool} (custom)...`);
      const result = await toolHandler.callTool(tool, config, context);
      results.custom.passed++;
      console.log(`✅ ${tool} - CUSTOM: SUCCESS`);
    } catch (error) {
      results.custom.failed++;
      results.custom.errors.push({ tool, error: error.message });
      console.log(`❌ ${tool} - CUSTOM: ${error.message}`);
    }
  }
  
  // Test against TRIPLE source (combined)
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 TESTING TRIPLE SOURCE (Combined with precedence)');
  console.log('=' .repeat(60));
  
  for (const tool of tools) {
    const config = TOOL_CONFIGURATIONS[tool];
    const context = { apiClient: dualSourceClient, cacheManager };
    
    try {
      console.log(`Testing ${tool} (triple)...`);
      const result = await toolHandler.callTool(tool, config, context);
      results.triple.passed++;
      console.log(`✅ ${tool} - TRIPLE: SUCCESS`);
    } catch (error) {
      results.triple.failed++;
      results.triple.errors.push({ tool, error: error.message });
      console.log(`❌ ${tool} - TRIPLE: ${error.message}`);
    }
  }
  
  // Print comprehensive results
  console.log('\n' + '=' .repeat(80));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('=' .repeat(80));
  
  console.log(`\n🎯 PRIMARY SOURCE (APIs.guru)`);
  console.log(`   ✅ Passed: ${results.primary.passed}/${tools.length}`);
  console.log(`   ❌ Failed: ${results.primary.failed}/${tools.length}`);
  if (results.primary.errors.length > 0) {
    console.log(`   Errors:`);
    results.primary.errors.forEach(e => console.log(`     - ${e.tool}: ${e.error}`));
  }
  
  console.log(`\n🎯 SECONDARY SOURCE (Enhanced Directory)`);
  console.log(`   ✅ Passed: ${results.secondary.passed}/${tools.length}`);
  console.log(`   ❌ Failed: ${results.secondary.failed}/${tools.length}`);
  if (results.secondary.errors.length > 0) {
    console.log(`   Errors:`);
    results.secondary.errors.forEach(e => console.log(`     - ${e.tool}: ${e.error}`));
  }
  
  console.log(`\n🎯 CUSTOM SOURCE (Local filesystem)`);
  console.log(`   ✅ Passed: ${results.custom.passed}/${tools.length}`);
  console.log(`   ❌ Failed: ${results.custom.failed}/${tools.length}`);
  if (results.custom.errors.length > 0) {
    console.log(`   Errors:`);
    results.custom.errors.forEach(e => console.log(`     - ${e.tool}: ${e.error}`));
  }
  
  console.log(`\n🎯 TRIPLE SOURCE (Combined with precedence)`);
  console.log(`   ✅ Passed: ${results.triple.passed}/${tools.length}`);
  console.log(`   ❌ Failed: ${results.triple.failed}/${tools.length}`);
  if (results.triple.errors.length > 0) {
    console.log(`   Errors:`);
    results.triple.errors.forEach(e => console.log(`     - ${e.tool}: ${e.error}`));
  }
  
  const totalTests = tools.length * 4;
  const totalPassed = results.primary.passed + results.secondary.passed + results.custom.passed + results.triple.passed;
  const totalFailed = results.primary.failed + results.secondary.failed + results.custom.failed + results.triple.failed;
  
  console.log(`\n📈 OVERALL SUMMARY`);
  console.log(`   🧪 Total test combinations: ${totalTests}`);
  console.log(`   ✅ Total passed: ${totalPassed}`);
  console.log(`   ❌ Total failed: ${totalFailed}`);
  console.log(`   📊 Success rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
  
  cacheManager.clear();
  
  if (totalFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED - NO REGRESSIONS DETECTED!');
    return true;
  } else {
    console.log(`\n⚠️  ${totalFailed} TESTS FAILED - REGRESSIONS DETECTED!`);
    return false;
  }
}

testTripleSource()
  .then(success => {
    if (success) {
      console.log('\n✅ Triple-source smoke test completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ Triple-source smoke test failed - regressions detected');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Triple-source smoke test crashed:', error);
    process.exit(1);
  });