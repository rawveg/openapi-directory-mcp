#!/usr/bin/env node
/**
 * Generate visual status report for triple-source testing
 * Shows each tool's status across Primary, Secondary, and Custom data sources
 */
import fs from 'fs';
import { CacheManager } from '../../dist/cache/manager.js';
import { ApiClient } from '../../dist/api/client.js';
import { SecondaryApiClient } from '../../dist/api/secondary-client.js';
import { CustomSpecClient } from '../../dist/custom-specs/custom-spec-client.js';
import { ToolHandler } from '../../dist/tools/handler.js';

// Rate limiting for testing
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

const SECONDARY_CONFIGURATIONS = {
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
  }
};

const CUSTOM_CONFIGURATIONS = {
  get_provider_apis: { provider: 'custom' },
  get_provider_services: { provider: 'custom' },
  get_provider_stats: { provider: 'custom' },
  get_api: { provider: 'custom', service: 'testapi', api: '1.0.0' },
  get_api_summary: { api_id: 'custom:testapi:1.0.0' },
  get_openapi_spec: { url: 'custom:testapi:1.0.0' },
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
  }
};

const TOOL_CATEGORIES = {
  'Provider Tools': ['get_providers', 'get_provider_apis', 'get_provider_services', 'get_provider_stats'],
  'API Discovery': ['get_api', 'list_all_apis', 'get_api_summary', 'get_metrics'],
  'Search & Discovery': ['search_apis', 'get_popular_apis', 'get_recently_updated', 'analyze_api_categories'],
  'OpenAPI Specs': ['get_openapi_spec'],
  'Endpoint Tools': ['get_endpoints', 'get_endpoint_details', 'get_endpoint_schema', 'get_endpoint_examples'],
  'Cache Tools': ['cache_info', 'cache_stats', 'clear_cache', 'clear_cache_key', 'list_cache_keys']
};

async function testTool(toolName, config, client, cacheManager) {
  const toolHandler = new ToolHandler();
  await toolHandler.listTools();
  
  const context = { apiClient: client, cacheManager };
  
  try {
    // Add delay to prevent overwhelming APIs during batch testing
    await delay(100); // 100ms delay between tool tests
    
    await toolHandler.callTool(toolName, config, context);
    return { status: 'PASS', error: null };
  } catch (error) {
    return { status: 'FAIL', error: error.message };
  }
}

async function generateVisualReport() {
  console.log('🔍 GENERATING VISUAL STATUS REPORT');
  console.log('Testing all tools across Primary, Secondary, and Custom data sources\n');
  
  const cacheManager = new CacheManager();
  
  // Create individual clients
  const primaryClient = new ApiClient('https://api.apis.guru/v2', cacheManager);
  const secondaryClient = new SecondaryApiClient('https://api.openapidirectory.com', cacheManager);
  const customClient = new CustomSpecClient(cacheManager);
  
  const tools = Object.keys(TOOL_CONFIGURATIONS);
  const results = {};
  
  // Test all tools across all sources
  for (const tool of tools) {
    console.log(`Testing ${tool}...`);
    
    const primaryConfig = TOOL_CONFIGURATIONS[tool];
    const secondaryConfig = SECONDARY_CONFIGURATIONS[tool] || TOOL_CONFIGURATIONS[tool];
    const customConfig = CUSTOM_CONFIGURATIONS[tool] || TOOL_CONFIGURATIONS[tool];
    
    const [primaryResult, secondaryResult, customResult] = await Promise.all([
      testTool(tool, primaryConfig, primaryClient, cacheManager),
      testTool(tool, secondaryConfig, secondaryClient, cacheManager),
      testTool(tool, customConfig, customClient, cacheManager)
    ]);
    
    results[tool] = {
      primary: primaryResult,
      secondary: secondaryResult,
      custom: customResult
    };
  }
  
  cacheManager.clear();
  
  // Generate visual report
  generateMarkdownReport(results);
  generateTextReport(results);
  generateJSONReport(results);
  
  return results;
}

function generateMarkdownReport(results) {
  const timestamp = new Date().toISOString();
  const tools = Object.keys(results);
  
  let report = `# Triple-Source Tool Status Report
  
**Generated:** ${timestamp}  
**Total Tools:** ${tools.length}  
**Data Sources:** Primary (APIs.guru), Secondary (Enhanced Directory), Custom (Local filesystem)

## Status Legend
- ✅ **PASS** - Tool working correctly
- ❌ **FAIL** - Tool has issues
- 🔧 **ERROR** - Tool failed with error

## Summary Matrix

| Tool Name | Primary | Secondary | Custom | Status |
|-----------|---------|-----------|--------|--------|
`;

  const overallStats = { pass: 0, fail: 0 };
  
  for (const [category, categoryTools] of Object.entries(TOOL_CATEGORIES)) {
    report += `| **${category}** | | | | |\n`;
    
    for (const tool of categoryTools) {
      const result = results[tool];
      const primaryIcon = result.primary.status === 'PASS' ? '✅' : '❌';
      const secondaryIcon = result.secondary.status === 'PASS' ? '✅' : '❌';
      const customIcon = result.custom.status === 'PASS' ? '✅' : '❌';
      
      const allPass = result.primary.status === 'PASS' && 
                     result.secondary.status === 'PASS' && 
                     result.custom.status === 'PASS';
      
      const overallIcon = allPass ? '✅ ALL' : '❌ ISSUES';
      
      if (allPass) overallStats.pass++;
      else overallStats.fail++;
      
      report += `| \`${tool}\` | ${primaryIcon} | ${secondaryIcon} | ${customIcon} | ${overallIcon} |\n`;
    }
    report += '| | | | | |\n';
  }
  
  const successRate = ((overallStats.pass / tools.length) * 100).toFixed(1);
  
  report += `
## Overall Statistics

- **Total Tools:** ${tools.length}
- **Fully Working:** ${overallStats.pass} tools
- **With Issues:** ${overallStats.fail} tools  
- **Success Rate:** ${successRate}%

## Detailed Error Information

`;

  // Add error details for failed tools
  for (const [tool, result] of Object.entries(results)) {
    const hasErrors = result.primary.status === 'FAIL' || 
                     result.secondary.status === 'FAIL' || 
                     result.custom.status === 'FAIL';
    
    if (hasErrors) {
      report += `### \`${tool}\` Issues\n\n`;
      
      if (result.primary.status === 'FAIL') {
        report += `**Primary Source Error:**\n\`\`\`\n${result.primary.error}\n\`\`\`\n\n`;
      }
      
      if (result.secondary.status === 'FAIL') {
        report += `**Secondary Source Error:**\n\`\`\`\n${result.secondary.error}\n\`\`\`\n\n`;
      }
      
      if (result.custom.status === 'FAIL') {
        report += `**Custom Source Error:**\n\`\`\`\n${result.custom.error}\n\`\`\`\n\n`;
      }
    }
  }
  
  report += `
## Data Source Details

- **Primary (APIs.guru)**: Official API directory with 3000+ APIs
- **Secondary (Enhanced Directory)**: Extended collection including enterprise APIs  
- **Custom (Local filesystem)**: User-imported OpenAPI specifications

---
*Report generated by openapi-directory-mcp regression testing suite*
`;

  // Write to file
  fs.writeFileSync('test-status-report.md', report);
  console.log('📋 Generated: test-status-report.md');
}

function generateTextReport(results) {
  const tools = Object.keys(results);
  let report = '';
  
  report += '═'.repeat(80) + '\n';
  report += '                    TRIPLE-SOURCE TOOL STATUS REPORT\n';
  report += '═'.repeat(80) + '\n';
  report += `Generated: ${new Date().toISOString()}\n`;
  report += `Total Tools: ${tools.length}\n`;
  report += '═'.repeat(80) + '\n\n';
  
  // Create visual matrix
  const maxToolNameLength = Math.max(...tools.map(t => t.length));
  const toolWidth = Math.max(maxToolNameLength, 20);
  
  report += 'Tool Name'.padEnd(toolWidth) + ' │ Primary │Secondary│ Custom  │ Overall\n';
  report += '─'.repeat(toolWidth) + '─┼─────────┼─────────┼─────────┼─────────\n';
  
  let totalPass = 0;
  
  for (const [category, categoryTools] of Object.entries(TOOL_CATEGORIES)) {
    report += `\n${category.toUpperCase()}\n`;
    
    for (const tool of categoryTools) {
      const result = results[tool];
      const primaryStatus = result.primary.status === 'PASS' ? '   ✅   ' : '   ❌   ';
      const secondaryStatus = result.secondary.status === 'PASS' ? '   ✅   ' : '   ❌   ';
      const customStatus = result.custom.status === 'PASS' ? '   ✅   ' : '   ❌   ';
      
      const allPass = result.primary.status === 'PASS' && 
                     result.secondary.status === 'PASS' && 
                     result.custom.status === 'PASS';
      
      const overallStatus = allPass ? '   ✅   ' : '   ❌   ';
      
      if (allPass) totalPass++;
      
      report += `${tool.padEnd(toolWidth)} │${primaryStatus}│${secondaryStatus}│${customStatus}│${overallStatus}\n`;
    }
  }
  
  const successRate = ((totalPass / tools.length) * 100).toFixed(1);
  
  report += '\n' + '═'.repeat(80) + '\n';
  report += `SUMMARY: ${totalPass}/${tools.length} tools fully working (${successRate}%)\n`;
  report += '═'.repeat(80) + '\n';
  
  // Write to file
  fs.writeFileSync('test-status-report.txt', report);
  console.log('📋 Generated: test-status-report.txt');
  
  // Also print to console
  console.log('\n' + report);
}

function generateJSONReport(results) {
  const timestamp = new Date().toISOString();
  const tools = Object.keys(results);
  
  const jsonReport = {
    generated: timestamp,
    total_tools: tools.length,
    data_sources: ['primary', 'secondary', 'custom'],
    results: results,
    summary: {
      by_source: {
        primary: {
          pass: Object.values(results).filter(r => r.primary.status === 'PASS').length,
          fail: Object.values(results).filter(r => r.primary.status === 'FAIL').length
        },
        secondary: {
          pass: Object.values(results).filter(r => r.secondary.status === 'PASS').length,
          fail: Object.values(results).filter(r => r.secondary.status === 'FAIL').length
        },
        custom: {
          pass: Object.values(results).filter(r => r.custom.status === 'PASS').length,
          fail: Object.values(results).filter(r => r.custom.status === 'FAIL').length
        }
      },
      overall: {
        fully_working: Object.values(results).filter(r => 
          r.primary.status === 'PASS' && 
          r.secondary.status === 'PASS' && 
          r.custom.status === 'PASS'
        ).length,
        with_issues: Object.values(results).filter(r => 
          r.primary.status === 'FAIL' || 
          r.secondary.status === 'FAIL' || 
          r.custom.status === 'FAIL'
        ).length
      }
    }
  };
  
  jsonReport.summary.overall.success_rate = 
    ((jsonReport.summary.overall.fully_working / tools.length) * 100).toFixed(1) + '%';
  
  // Write to file
  fs.writeFileSync('test-status-report.json', JSON.stringify(jsonReport, null, 2));
  console.log('📋 Generated: test-status-report.json');
}

generateVisualReport()
  .then((results) => {
    const tools = Object.keys(results);
    const fullyWorking = Object.values(results).filter(r => 
      r.primary.status === 'PASS' && 
      r.secondary.status === 'PASS' && 
      r.custom.status === 'PASS'
    ).length;
    
    console.log(`\n✅ Visual report generation completed`);
    console.log(`📊 ${fullyWorking}/${tools.length} tools fully working across all sources`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Report generation failed:', error);
    process.exit(1);
  });