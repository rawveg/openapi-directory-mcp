import { CacheManager } from '../dist/cache/manager.js';
import { DualSourceApiClient } from '../dist/api/dual-source-client.js';
import fs from 'fs';
import path from 'path';

/**
 * Script to capture real API responses for use as test fixtures
 * This allows us to mock API calls with real data for reliable testing
 */

const FIXTURES_DIR = './tests/fixtures';
const API_FIXTURES_DIR = path.join(FIXTURES_DIR, 'api-responses');

// Ensure fixtures directory exists
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}
if (!fs.existsSync(API_FIXTURES_DIR)) {
  fs.mkdirSync(API_FIXTURES_DIR, { recursive: true });
}

async function captureApiFixtures() {
  const cacheManager = new CacheManager();
  const apiClient = new DualSourceApiClient(
    'https://api.apis.guru/v2',
    'https://api.apis.guru/v2',
    cacheManager
  );

  const fixtures = {};

  try {
    console.log('🔄 Capturing API response fixtures...');

    // 1. Capture providers response
    console.log('📦 Capturing providers...');
    const providers = await apiClient.getProviders();
    fixtures.providers = providers;
    fs.writeFileSync(
      path.join(API_FIXTURES_DIR, 'providers.json'),
      JSON.stringify(providers, null, 2)
    );

    // 2. Capture metrics response
    console.log('📊 Capturing metrics...');
    const metrics = await apiClient.getMetrics();
    fixtures.metrics = metrics;
    fs.writeFileSync(
      path.join(API_FIXTURES_DIR, 'metrics.json'),
      JSON.stringify(metrics, null, 2)
    );

    // 3. Capture search results for various queries
    console.log('🔍 Capturing search results...');
    const searchQueries = ['google', 'github', 'stripe', 'invalid-query-123', ''];
    fixtures.search = {};
    
    for (const query of searchQueries) {
      console.log(`   - Searching for: "${query}"`);
      const searchResult = await apiClient.searchAPIs(query, undefined, 1, 10);
      fixtures.search[query] = searchResult;
      fs.writeFileSync(
        path.join(API_FIXTURES_DIR, `search-${query || 'empty'}.json`),
        JSON.stringify(searchResult, null, 2)
      );
    }

    // 4. Capture specific API details
    console.log('🔧 Capturing API details...');
    const apiExamples = [
      { provider: 'google.com', api: 'v3' },
      { provider: 'github.com', api: 'v3' },
      { provider: 'stripe.com', api: 'v1' }
    ];
    fixtures.apis = {};

    for (const { provider, api } of apiExamples) {
      try {
        console.log(`   - Getting API: ${provider}:${api}`);
        const apiDetails = await apiClient.getAPI(provider, api);
        fixtures.apis[`${provider}:${api}`] = apiDetails;
        fs.writeFileSync(
          path.join(API_FIXTURES_DIR, `api-${provider.replace('.', '_')}-${api}.json`),
          JSON.stringify(apiDetails, null, 2)
        );
      } catch (error) {
        console.log(`   ❌ Failed to get ${provider}:${api}: ${error.message}`);
        fixtures.apis[`${provider}:${api}`] = { error: error.message };
      }
    }

    // 5. Capture provider-specific data
    console.log('🏢 Capturing provider data...');
    const testProviders = providers.data.slice(0, 3); // First 3 providers
    fixtures.providerApis = {};

    for (const provider of testProviders) {
      try {
        console.log(`   - Getting APIs for provider: ${provider}`);
        const providerApis = await apiClient.getProvider(provider);
        fixtures.providerApis[provider] = providerApis;
        fs.writeFileSync(
          path.join(API_FIXTURES_DIR, `provider-${provider.replace('.', '_')}.json`),
          JSON.stringify(providerApis, null, 2)
        );
      } catch (error) {
        console.log(`   ❌ Failed to get provider ${provider}: ${error.message}`);
        fixtures.providerApis[provider] = { error: error.message };
      }
    }

    // 6. Capture OpenAPI spec examples
    console.log('📋 Capturing OpenAPI specs...');
    fixtures.openApiSpecs = {};
    
    // Get a few swagger URLs from the captured APIs
    const swaggerUrls = [];
    for (const [apiId, apiData] of Object.entries(fixtures.apis)) {
      if (apiData && !apiData.error && apiData.versions) {
        const preferredVersion = apiData.versions[apiData.preferred];
        if (preferredVersion && preferredVersion.swaggerUrl) {
          swaggerUrls.push({
            id: apiId,
            url: preferredVersion.swaggerUrl
          });
        }
      }
    }

    for (const { id, url } of swaggerUrls.slice(0, 2)) { // Capture 2 specs
      try {
        console.log(`   - Getting OpenAPI spec: ${id}`);
        const spec = await apiClient.getOpenAPISpec(url);
        fixtures.openApiSpecs[id] = spec;
        fs.writeFileSync(
          path.join(API_FIXTURES_DIR, `openapi-spec-${id.replace(/[:.]/g, '_')}.json`),
          JSON.stringify(spec, null, 2)
        );
      } catch (error) {
        console.log(`   ❌ Failed to get spec for ${id}: ${error.message}`);
        fixtures.openApiSpecs[id] = { error: error.message };
      }
    }

    // 7. Save complete fixtures file
    fs.writeFileSync(
      path.join(FIXTURES_DIR, 'api-responses.json'),
      JSON.stringify(fixtures, null, 2)
    );

    console.log('✅ API fixtures captured successfully!');
    console.log(`📁 Fixtures saved to: ${FIXTURES_DIR}`);
    console.log(`📊 Captured data includes:`);
    console.log(`   - Providers: ${fixtures.providers?.data?.length || 0} providers`);
    console.log(`   - Metrics: ${JSON.stringify(fixtures.metrics)}`);
    console.log(`   - Search queries: ${Object.keys(fixtures.search).length}`);
    console.log(`   - API details: ${Object.keys(fixtures.apis).length}`);
    console.log(`   - Provider APIs: ${Object.keys(fixtures.providerApis).length}`);
    console.log(`   - OpenAPI specs: ${Object.keys(fixtures.openApiSpecs).length}`);

  } catch (error) {
    console.error('❌ Error capturing fixtures:', error);
  } finally {
    cacheManager.clear();
  }
}

captureApiFixtures();