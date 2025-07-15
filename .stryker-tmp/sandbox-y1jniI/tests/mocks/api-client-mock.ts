// @ts-nocheck
import { DualSourceApiClient } from '../../src/api/dual-source-client.js';
import { ICacheManager } from '../../src/cache/types.js';

/**
 * Mock scenarios that can be configured for testing
 */
export type MockScenario = 
  | 'success' 
  | 'network_error'
  | 'rate_limited' 
  | 'malformed_response'
  | 'http_error'
  | 'corrupted_data'
  | 'edge_cases'
  | 'slow_response'
  | 'intermittent_failure';

/**
 * Configuration for mock API client behavior
 */
export interface MockConfig {
  scenario: MockScenario;
  httpErrorType?: 'notFound' | 'unauthorized' | 'forbidden' | 'internalServerError' | 'badGateway' | 'serviceUnavailable';
  networkErrorType?: 'connectionRefused' | 'timeout' | 'dnsError';
  malformedType?: 'invalidJson' | 'unexpectedStructure' | 'nullResponse' | 'emptyResponse' | 'arrayInsteadOfObject';
  corruptedType?: 'providersCorrupted' | 'metricsCorrupted' | 'searchCorrupted' | 'apiDetailsCorrupted';
  edgeCaseType?: 'extremelyLargeResponse' | 'unicodeAndSpecialChars' | 'sqlInjectionAttempt' | 'emptyArrays';
  delayMs?: number;
  failureRate?: number; // 0-1 for intermittent failures
}

/**
 * Creates a mocked DualSourceApiClient that returns predefined responses
 */
export class MockedDualSourceApiClient {
  private config: MockConfig;
  private callCount = 0;
  private realFixtures: any;
  private negativeFixtures: any;
  
  constructor(
    primaryBaseURL: string,
    secondaryBaseURL: string,
    cacheManager: ICacheManager,
    mockConfig: MockConfig = { scenario: 'success' },
    fixtures?: { real: any; negative: any }
  ) {
    this.config = mockConfig;
    this.realFixtures = fixtures?.real || {};
    this.negativeFixtures = fixtures?.negative || this.getDefaultNegativeFixtures();
  }

  private getDefaultNegativeFixtures() {
    return {
      networkErrors: {
        connectionRefused: { error: { code: 'ECONNREFUSED', message: 'connect ECONNREFUSED 127.0.0.1:80' } },
        timeout: { error: { code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded' } },
        dnsError: { error: { code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND invalid-domain.com' } }
      },
      httpErrors: {
        notFound: { status: 404, statusText: 'Not Found', data: { error: { message: 'Not found', type: 'not_found_error' } } },
        internalServerError: { status: 500, statusText: 'Internal Server Error', data: { error: { message: 'Server error', type: 'server_error' } } },
        unauthorized: { status: 401, statusText: 'Unauthorized', data: { error: { message: 'Auth required', type: 'authentication_error' } } },
        forbidden: { status: 403, statusText: 'Forbidden', data: { error: { message: 'Access denied', type: 'authorization_error' } } },
        serviceUnavailable: { status: 503, statusText: 'Service Unavailable', data: { error: { message: 'Service unavailable', type: 'service_unavailable' } } },
        rateLimited: { status: 429, statusText: 'Too Many Requests', data: { error: { message: 'Rate limit exceeded', type: 'rate_limit_error' } }, headers: { 'retry-after': '60' } }
      },
      malformedResponses: {
        nullResponse: { status: 200, data: null },
        emptyResponse: { status: 200, data: '' },
        unexpectedStructure: { status: 200, data: { completely: 'different', structure: 'than expected' } },
        arrayInsteadOfObject: { status: 200, data: ['should', 'be', 'object', 'not', 'array'] }
      },
      corruptedData: {
        providersCorrupted: { status: 200, data: { data: [null, '', 123, { not: 'a string' }, 'valid-provider.com', undefined] } },
        metricsCorrupted: { status: 200, data: { numSpecs: 'not_a_number', numAPIs: -1, numEndpoints: null } },
        searchCorrupted: { status: 200, data: { results: 'should_be_array', pagination: null, total: 'infinity' } },
        apiDetailsCorrupted: { status: 200, data: { versions: null, preferred: 123, info: 'should_be_object' } }
      },
      edgeCases: {
        emptyArrays: { status: 200, data: { data: [], results: [], pagination: { total_results: 0, page: 1, limit: 10, has_next: false, has_previous: false } } },
        unicodeAndSpecialChars: { status: 200, data: { data: ['api-🚀.com', 'test<script>alert(\'xss\')</script>.com', 'unicode-测试.com', 'emoji-💻.com'] } },
        sqlInjectionAttempt: { status: 200, data: { data: ['\'; DROP TABLE providers; --', 'admin\'--', '1\' OR \'1\'=\'1', 'normal-provider.com'] } },
        extremelyLargeResponse: { status: 200, data: { data: Array(10000).fill('provider-').map((p, i) => `${p}${i}.com`) } }
      }
    };
  }

  private async delay(ms: number = 0): Promise<void> {
    if (ms > 0) {
      await new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  private shouldSimulateFailure(): boolean {
    if (this.config.scenario === 'intermittent_failure' && this.config.failureRate) {
      // Use simple deterministic pattern based on current call count
      // This creates a repeating pattern: FFFFSSSSSFFFFSSSSS... for 0.5 failure rate
      const patternLength = 10;
      const failuresInPattern = Math.floor(this.config.failureRate * patternLength);
      const positionInPattern = this.callCount % patternLength;
      return positionInPattern < failuresInPattern;
    }
    return false;
  }

  private simulateError(errorType: string) {
    const error = this.negativeFixtures.networkErrors[errorType]?.error || 
                  this.negativeFixtures.httpErrors[errorType] ||
                  new Error(`Mock error: ${errorType}`);
    
    if (error.status) {
      // HTTP error
      const httpError = new Error(error.data?.error?.message || 'HTTP Error');
      (httpError as any).response = {
        status: error.status,
        statusText: error.statusText,
        data: error.data,
        headers: error.headers
      };
      throw httpError;
    } else {
      // Network error
      const networkError = new Error(error.message);
      (networkError as any).code = error.code;
      (networkError as any).errno = error.errno;
      throw networkError;
    }
  }

  private getMockResponse(dataType: string, method: string): any {
    this.callCount++;

    // Handle intermittent failures
    if (this.shouldSimulateFailure()) {
      this.simulateError('internalServerError');
    }

    switch (this.config.scenario) {
      case 'network_error':
        this.simulateError(this.config.networkErrorType || 'connectionRefused');
        break;

      case 'rate_limited':
        this.simulateError('rateLimited');
        break;

      case 'http_error':
        this.simulateError(this.config.httpErrorType || 'internalServerError');
        break;

      case 'malformed_response':
        const malformedType = this.config.malformedType || 'invalidJson';
        if (malformedType === 'invalidJson') {
          throw new SyntaxError('Unexpected token in JSON');
        }
        const malformedResponse = this.negativeFixtures.malformedResponses[malformedType];
        return malformedResponse?.data;

      case 'corrupted_data':
        const corruptedType = this.config.corruptedType || `${dataType}Corrupted`;
        return this.negativeFixtures.corruptedData[corruptedType]?.data || {};

      case 'edge_cases':
        const edgeCaseType = this.config.edgeCaseType || 'emptyArrays';
        return this.negativeFixtures.edgeCases[edgeCaseType]?.data || {};

      case 'slow_response':
        // Will be handled by delay in individual methods
        break;

      case 'success':
      default:
        return this.realFixtures[dataType] || this.getDefaultSuccessResponse(dataType);
    }

    // Default to real fixtures for success scenario
    return this.realFixtures[dataType] || this.getDefaultSuccessResponse(dataType);
  }

  private getDefaultSuccessResponse(dataType: string): any {
    switch (dataType) {
      case 'providers':
        return { data: ['test-provider.com', 'another-provider.com'] };
      case 'metrics':
        return { numSpecs: 100, numAPIs: 50, numEndpoints: 1000 };
      case 'search':
        return { results: [], pagination: { page: 1, limit: 10, total_results: 0, has_next: false, has_previous: false } };
      case 'apis':
        return {
          info: { title: 'Test API', version: '1.0.0' },
          versions: { 'v1': { info: { title: 'Test API', version: '1.0.0' }, swaggerUrl: 'https://example.com/swagger.json' } },
          preferred: 'v1'
        };
      case 'providerApis':
        return {
          apis: {
            'test-provider.com:v1': {
              info: { title: 'Test Provider API', version: '1.0.0' },
              versions: { 'v1': { info: { title: 'Test Provider API', version: '1.0.0' }, swaggerUrl: 'https://example.com/swagger.json' } },
              preferred: 'v1'
            }
          }
        };
      default:
        return {};
    }
  }

  async getProviders(): Promise<{ data: string[] }> {
    await this.delay(this.config.delayMs);
    return this.getMockResponse('providers', 'getProviders');
  }

  async getMetrics(): Promise<any> {
    await this.delay(this.config.delayMs);
    return this.getMockResponse('metrics', 'getMetrics');
  }

  async searchAPIs(
    query: string,
    provider?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    await this.delay(this.config.delayMs);
    
    if (this.config.scenario === 'success') {
      // For search, use the appropriate query fixture
      const searchKey = query || 'empty';
      const searchData = this.realFixtures.search?.[searchKey];
      return searchData || this.getDefaultSuccessResponse('search');
    }
    
    return this.getMockResponse('search', 'searchAPIs');
  }

  async getAPI(provider: string, api: string): Promise<any> {
    await this.delay(this.config.delayMs);
    
    if (this.config.scenario === 'success') {
      const apiKey = `${provider}:${api}`;
      const apiData = this.realFixtures.apis?.[apiKey];
      
      // Return fixture data if available, otherwise return default success response
      return apiData || this.getDefaultSuccessResponse('apis');
    }
    
    return this.getMockResponse('apis', 'getAPI');
  }

  async getProvider(provider: string): Promise<any> {
    await this.delay(this.config.delayMs);
    
    if (this.config.scenario === 'success') {
      const providerData = this.realFixtures.providerApis?.[provider];
      
      // Return fixture data if available, otherwise return default success response
      return providerData || this.getDefaultSuccessResponse('providerApis');
    }
    
    return this.getMockResponse('providerApis', 'getProvider');
  }

  async listAPIs(): Promise<any> {
    await this.delay(this.config.delayMs);
    
    if (this.config.scenario === 'success') {
      // Combine all API data for listing
      const allApis = {};
      if (this.realFixtures.apis) {
        for (const [apiId, apiData] of Object.entries(this.realFixtures.apis)) {
          if (!apiData.error) {
            allApis[apiId] = apiData;
          }
        }
      }
      
      // If no fixtures, return default APIs structure that analyze_api_categories expects
      if (Object.keys(allApis).length === 0) {
        return {
          'test-provider.com:api1': {
            versions: {
              'v1': {
                info: {
                  title: 'Test API 1',
                  version: '1.0.0',
                  'x-apisguru-categories': ['test', 'mock']
                },
                swaggerUrl: 'https://example.com/api1/swagger.json'
              }
            },
            preferred: 'v1'
          },
          'test-provider.com:api2': {
            versions: {
              'v1': {
                info: {
                  title: 'Test API 2',
                  version: '2.0.0',
                  'x-apisguru-categories': ['test', 'utility']
                },
                swaggerUrl: 'https://example.com/api2/swagger.json'
              }
            },
            preferred: 'v1'
          }
        };
      }
      
      return allApis;
    }
    
    return this.getMockResponse('apis', 'listAPIs');
  }

  async getOpenAPISpec(url: string): Promise<any> {
    await this.delay(this.config.delayMs);
    
    if (this.config.scenario === 'success') {
      // Return a mock OpenAPI spec structure
      return {
        openapi: "3.0.0",
        info: {
          title: "Mock API",
          version: "1.0.0",
          description: "Mock OpenAPI specification for testing"
        },
        paths: {
          "/test": {
            get: {
              summary: "Test endpoint",
              responses: {
                "200": {
                  description: "Success"
                }
              }
            }
          }
        }
      };
    }
    
    return this.getMockResponse('openApiSpecs', 'getOpenAPISpec');
  }

  async getPaginatedAPIs(page: number = 1, limit: number = 50): Promise<any> {
    await this.delay(this.config.delayMs);
    
    if (this.config.scenario === 'success') {
      const allApis = await this.listAPIs();
      const apiEntries = Object.entries(allApis);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const pageResults = apiEntries.slice(startIndex, endIndex);
      
      return {
        results: pageResults.map(([id, api]: [string, any]) => ({
          id,
          title: api.versions[api.preferred]?.info?.title || 'Untitled API',
          description: api.versions[api.preferred]?.info?.description || '',
          provider: id.split(':')[0],
          preferred: api.preferred,
          categories: api.versions[api.preferred]?.info?.['x-apisguru-categories'] || []
        })),
        pagination: {
          page,
          limit,
          total_results: apiEntries.length,
          total_pages: Math.ceil(apiEntries.length / limit),
          has_next: endIndex < apiEntries.length,
          has_previous: page > 1
        }
      };
    }
    
    return this.getMockResponse('search', 'getPaginatedAPIs');
  }

  // Additional API client methods required by tools
  async getServices(provider: string): Promise<any> {
    await this.delay(this.config.delayMs);
    
    if (this.config.scenario === 'success') {
      return {
        services: [
          { name: 'service1', description: 'Test service 1' },
          { name: 'service2', description: 'Test service 2' }
        ]
      };
    }
    
    return this.getMockResponse('services', 'getServices');
  }

  async getAPIEndpoints(apiId: string, page: number = 1, limit: number = 30, tag?: string): Promise<any> {
    await this.delay(this.config.delayMs);
    
    if (this.config.scenario === 'success') {
      return {
        results: [
          { path: '/test', method: 'GET', summary: 'Test endpoint' },
          { path: '/users/{id}', method: 'GET', summary: 'Get user by ID' },
          { path: '/users', method: 'POST', summary: 'Create user' }
        ],
        pagination: {
          page,
          limit,
          total_results: 3,
          total_pages: 1,
          has_next: false,
          has_previous: false
        }
      };
    }
    
    return this.getMockResponse('endpoints', 'getAPIEndpoints');
  }

  async getEndpointDetails(apiId: string, method: string, path: string): Promise<any> {
    await this.delay(this.config.delayMs);
    
    if (this.config.scenario === 'success') {
      return {
        api_id: apiId,
        method,
        path,
        summary: 'Test endpoint details',
        description: 'Mock endpoint description',
        operationId: 'testOperation',
        parameters: [],
        responses: { '200': { description: 'Success' } }
      };
    }
    
    return this.getMockResponse('endpointDetails', 'getEndpointDetails');
  }

  async getEndpointSchema(apiId: string, method: string, path: string): Promise<any> {
    await this.delay(this.config.delayMs);
    
    if (this.config.scenario === 'success') {
      return {
        api_id: apiId,
        method,
        path,
        request_schema: { type: 'object', properties: {} },
        response_schema: { type: 'object', properties: { id: { type: 'string' } } }
      };
    }
    
    return this.getMockResponse('endpointSchema', 'getEndpointSchema');
  }

  async getEndpointExamples(apiId: string, method: string, path: string): Promise<any> {
    await this.delay(this.config.delayMs);
    
    if (this.config.scenario === 'success') {
      return {
        api_id: apiId,
        method,
        path,
        request_examples: [{ description: 'Example request', value: {} }],
        response_examples: [{ description: 'Example response', value: { id: '123' } }]
      };
    }
    
    return this.getMockResponse('endpointExamples', 'getEndpointExamples');
  }

  async getAPISummaryById(apiId: string): Promise<any> {
    await this.delay(this.config.delayMs);
    
    if (this.config.scenario === 'success') {
      return {
        id: apiId,
        title: 'Mock API Summary',
        description: 'Mock API description',
        provider: apiId.split(':')[0],
        categories: ['test']
      };
    }
    
    return this.getMockResponse('apiSummary', 'getAPISummaryById');
  }

  async getServiceAPI(provider: string, service: string, api: string): Promise<any> {
    await this.delay(this.config.delayMs);
    
    if (this.config.scenario === 'success') {
      return {
        info: { title: 'Service API', version: '1.0.0' },
        versions: { 'v1': { info: { title: 'Service API', version: '1.0.0' }, swaggerUrl: 'https://example.com/swagger.json' } },
        preferred: 'v1'
      };
    }
    
    return this.getMockResponse('serviceAPI', 'getServiceAPI');
  }

  async getProviderStats(provider: string): Promise<any> {
    await this.delay(this.config.delayMs);
    
    if (this.config.scenario === 'success') {
      return {
        provider,
        total_apis: 25,
        total_endpoints: 150,
        categories: ['cloud', 'data'],
        last_updated: new Date().toISOString()
      };
    }
    
    return this.getMockResponse('providerStats', 'getProviderStats');
  }

  async getPopularAPIs(): Promise<any> {
    await this.delay(this.config.delayMs);
    
    if (this.config.scenario === 'success') {
      return {
        data: [
          { id: 'googleapis.com:gmail', title: 'Gmail API', popularity_score: 95 },
          { id: 'github.com', title: 'GitHub API', popularity_score: 90 }
        ]
      };
    }
    
    return this.getMockResponse('popularAPIs', 'getPopularAPIs');
  }

  async getRecentlyUpdatedAPIs(limit: number = 10): Promise<any> {
    await this.delay(this.config.delayMs);
    
    if (this.config.scenario === 'success') {
      return {
        data: [
          { id: 'test.com:api', title: 'Test API', last_updated: new Date().toISOString() }
        ]
      };
    }
    
    return this.getMockResponse('recentAPIs', 'getRecentlyUpdatedAPIs');
  }

  // Utility methods for testing
  getCallCount(): number {
    return this.callCount;
  }

  resetCallCount(): void {
    this.callCount = 0;
  }

  updateConfig(newConfig: Partial<MockConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Factory function to create mocked API clients with different scenarios
 */
export function createMockedApiClient(
  cacheManager: ICacheManager,
  scenario: MockScenario = 'success',
  options: Partial<MockConfig> = {},
  fixtures?: { real: any; negative: any }
): MockedDualSourceApiClient {
  const config: MockConfig = {
    scenario,
    ...options
  };
  
  return new MockedDualSourceApiClient(
    'mock://primary',
    'mock://secondary', 
    cacheManager,
    config,
    fixtures
  );
}

/**
 * Predefined mock configurations for common test scenarios
 */
export const mockConfigs = {
  success: { scenario: 'success' as MockScenario },
  networkError: { scenario: 'network_error' as MockScenario },
  rateLimited: { scenario: 'rate_limited' as MockScenario },
  serverError: { scenario: 'http_error' as MockScenario, httpErrorType: 'internalServerError' as const },
  notFound: { scenario: 'http_error' as MockScenario, httpErrorType: 'notFound' as const },
  malformedJson: { scenario: 'malformed_response' as MockScenario, malformedType: 'invalidJson' as const },
  corruptedProviders: { scenario: 'corrupted_data' as MockScenario, corruptedType: 'providersCorrupted' as const },
  slowResponse: { scenario: 'slow_response' as MockScenario, delayMs: 5000 },
  intermittentFailure: { scenario: 'intermittent_failure' as MockScenario, failureRate: 0.3 },
  unicodeEdgeCase: { scenario: 'edge_cases' as MockScenario, edgeCaseType: 'unicodeAndSpecialChars' as const },
  emptyResults: { scenario: 'edge_cases' as MockScenario, edgeCaseType: 'emptyArrays' as const }
};