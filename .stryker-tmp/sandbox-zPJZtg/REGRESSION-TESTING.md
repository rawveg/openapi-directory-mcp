# Comprehensive Regression Testing

This document describes the comprehensive regression testing system implemented to prevent quality degradation and ensure all 22 tools work correctly across all 3 data sources.

## Overview

The regression testing system validates that all tools work correctly across the triple-source architecture:
- **Primary Source**: APIs.guru (https://api.apis.guru/v2)
- **Secondary Source**: Enhanced Directory (https://api.openapidirectory.com)  
- **Custom Source**: Local filesystem specs
- **Triple Source**: Combined with precedence (Custom > Secondary > Primary)

## Test Coverage

### Tools Tested (22 total)
1. **Provider Tools** (4): `get_providers`, `get_provider_apis`, `get_provider_services`, `get_provider_stats`
2. **API Discovery** (4): `get_api`, `list_all_apis`, `get_api_summary`, `get_metrics`
3. **Search & Discovery** (4): `search_apis`, `get_popular_apis`, `get_recently_updated`, `analyze_api_categories`
4. **OpenAPI Specs** (1): `get_openapi_spec`
5. **Endpoint Tools** (4): `get_endpoints`, `get_endpoint_details`, `get_endpoint_schema`, `get_endpoint_examples`

### Test Combinations
- **Total test combinations**: 68 (22 tools × 4 sources)
- **Success criteria**: 100% pass rate (68/68 tests passing)
- **Failure threshold**: Any single test failure indicates regression

## Running Tests

### Local Development

```bash
# Run complete regression test suite
npm run test:regression

# Setup test environment only
npm run test:regression:setup

# Run tests only (requires setup first)
npm run test:regression:run

# Full validation including regression tests
npm run validate
```

### Individual Test Components

```bash
# Setup test custom spec
node tests/integration/setup-custom-spec.mjs

# Run comprehensive tests
node tests/integration/triple-source-smoke-test.mjs
```

## CI/CD Integration

### Automatic Execution

The regression tests run automatically on:
1. **Every push** to main, develop, feature/*, bugfix/*, hotfix/* branches
2. **Every pull request** to main branch
3. **Daily schedule** at 2 AM UTC
4. **Manual trigger** via GitHub Actions

### Workflow Files

- **`.github/workflows/ci.yml`**: Includes regression tests in main CI pipeline
- **`.github/workflows/regression-tests.yml`**: Dedicated comprehensive testing

### CI Requirements

All CI checks **must pass** before merging:
1. Code quality (linting, formatting, type checking)
2. Build verification across Node.js 18, 20, 22
3. Plugin architecture validation
4. Security scanning
5. **Regression tests** (100% pass rate required)

## Test Architecture

### Test Structure

```
tests/
├── fixtures/
│   └── test-custom-spec.json          # Test custom API specification
├── integration/
│   ├── setup-custom-spec.mjs          # Sets up test custom spec
│   └── triple-source-smoke-test.mjs   # Main regression test suite
└── unit/                              # Unit tests by category
```

### Test Configuration

The regression tests use different configurations for each source:

```javascript
// Primary/Secondary: googleapis.com APIs
get_api: { provider: 'googleapis.com', service: 'admin', api: 'directory_v1' }

// Custom: local test spec
get_api: { provider: 'custom', service: 'testapi', api: '1.0.0' }
```

### Custom Spec Management

- **Location**: `~/.cache/openapi-directory-mcp/custom-specs/`
- **Format**: ApiGuruAPI-compatible JSON with OpenAPI 3.0 spec
- **Test spec**: Simple REST API with users endpoints for endpoint testing

## Failure Investigation

### When Tests Fail

1. **Check test output** for specific failure patterns:
   ```bash
   node tests/integration/triple-source-smoke-test.mjs
   ```

2. **Common failure categories**:
   - **Tool loading issues**: ToolHandler race conditions
   - **API client errors**: HTTP 404, network timeouts
   - **Configuration errors**: Wrong API IDs, missing endpoints
   - **Custom spec issues**: Missing manifest, invalid spec format

3. **Debug individual sources**:
   ```bash
   # Test primary source only
   node -e "/* test primary client directly */"
   
   # Test secondary source only  
   node -e "/* test secondary client directly */"
   
   # Test custom source only
   node -e "/* test custom client directly */"
   ```

### Expected Output

**Success** (100% pass rate):
```
📈 OVERALL SUMMARY
   🧪 Total test combinations: 68
   ✅ Total passed: 68
   ❌ Total failed: 0
   📊 Success rate: 100.0%

🎉 ALL TESTS PASSED - NO REGRESSIONS DETECTED!
```

**Failure** (any test fails):
```
📈 OVERALL SUMMARY
   🧪 Total test combinations: 68
   ✅ Total passed: XX
   ❌ Total failed: YY
   📊 Success rate: ZZ.Z%

⚠️  YY TESTS FAILED - REGRESSIONS DETECTED!
```

## Performance Monitoring

- **Test execution time**: Should complete within 300 seconds
- **Performance regression detection**: CI fails if tests exceed time limit
- **Caching effectiveness**: Monitor cache hit/miss ratios in output

## Maintenance

### Adding New Tools

When adding new tools:
1. Add tool configuration to `TOOL_CONFIGURATIONS` in test file
2. Add custom-specific configuration to `CUSTOM_CONFIGURATIONS` if needed
3. Update tool count validation in CI (currently expects 22 tools)
4. Update this documentation

### Updating Test Specs

To update test custom spec:
1. Modify `tests/fixtures/test-custom-spec.json`
2. Update test configurations if endpoint paths change
3. Re-run setup: `npm run test:regression:setup`

### Data Source Changes

If primary/secondary API endpoints change:
1. Update `TOOL_CONFIGURATIONS` and `SECONDARY_CONFIGURATIONS`
2. Test locally: `npm run test:regression`
3. Verify all 68 tests still pass

## Quality Assurance

This regression testing system ensures:

✅ **Zero tolerance for regressions** - Any failure blocks deployment  
✅ **Comprehensive coverage** - All tools tested against all sources  
✅ **Automatic validation** - Runs on every code change  
✅ **Performance monitoring** - Detects performance degradation  
✅ **Multi-environment testing** - Validates across Node.js versions  
✅ **Documentation** - Clear failure investigation procedures

The system prevents the quality degradation that was affecting the 40-year professional reputation by catching regressions immediately and requiring 100% pass rates before any code changes are merged.