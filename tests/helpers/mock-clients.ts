import { ApiClient } from '../../src/api/client.js';
import { SecondaryApiClient } from '../../src/api/secondary-client.js';
import { CustomSpecClient } from '../../src/custom-specs/custom-spec-client.js';
import { DualSourceApiClient } from '../../src/api/dual-source-client.js';
import { CacheManager } from '../../src/cache/manager.js';
import { ICacheManager } from '../../src/cache/types.js';
import { ApiGuruAPI } from '../../src/types/api.js';

/**
 * Mock implementations for testing
 */

export class MockCacheManager implements ICacheManager {
  private store = new Map<string, any>();
  
  get<T>(key: string): T | null {
    return this.store.get(key) || null;
  }
  
  set<T>(key: string, value: T, ttl?: number): void {
    this.store.set(key, value);
  }
  
  del(key: string): boolean {
    return this.store.delete(key);
  }
  
  clear(): void {
    this.store.clear();
  }
  
  has(key: string): boolean {
    return this.store.has(key);
  }
  
  keys(): string[] {
    return Array.from(this.store.keys());
  }
  
  getStats(): any {
    return {
      keys: this.store.size,
      hits: 0,
      misses: 0
    };
  }
  
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let count = 0;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }
  
  invalidateKeys(keys: string[]): void {
    keys.forEach(key => this.store.delete(key));
  }
  
  warmCache<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    return fetchFn().then(value => {
      this.set(key, value, ttl);
      return value;
    });
  }
}

/**
 * Create mock API data for testing
 */
export function createMockAPI(id: string, overrides: Partial<ApiGuruAPI> = {}): ApiGuruAPI {
  return {
    preferred: "1.0.0",
    versions: {
      "1.0.0": {
        added: "2023-01-01T00:00:00Z",
        updated: "2023-01-01T00:00:00Z",
        swaggerUrl: `https://example.com/specs/${id}/1.0.0/swagger.json`,
        swaggerYamlUrl: `https://example.com/specs/${id}/1.0.0/swagger.yaml`,
        info: {
          title: `Test API ${id}`,
          description: `Test API description for ${id}`,
          version: "1.0.0",
          "x-providerName": id.split(':')[0] || "test-provider",
          "x-apisguru-categories": ["test"]
        },
        link: `https://example.com/docs/${id}`,
        ...overrides.versions?.["1.0.0"]
      }
    },
    ...overrides
  };
}

/**
 * Create test fixtures for different data sources
 */
export const TestFixtures = {
  // Primary source (APIs.guru) mock data
  primaryAPIs: {
    "googleapis.com:admin": createMockAPI("googleapis.com:admin", {
      versions: {
        "1.0.0": {
          added: "2023-01-01T00:00:00Z",
          updated: "2023-01-01T00:00:00Z", 
          swaggerUrl: "https://www.googleapis.com/discovery/v1/apis/admin/directory_v1/rest",
          swaggerYamlUrl: "https://www.googleapis.com/discovery/v1/apis/admin/directory_v1/rest",
          info: {
            title: "Admin SDK API",
            description: "Admin SDK lets administrators of enterprise domains to view and manage resources like users, groups in their domain.",
            version: "directory_v1",
            "x-providerName": "googleapis.com",
            "x-apisguru-categories": ["enterprise"]
          },
          link: "https://developers.google.com/admin-sdk/"
        }
      }
    }),
    "azure.com:automation": createMockAPI("azure.com:automation", {
      versions: {
        "1.0.0": {
          added: "2023-01-01T00:00:00Z",
          updated: "2023-01-01T00:00:00Z",
          swaggerUrl: "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/specification/automation/resource-manager/Microsoft.Automation/stable/2020-01-13-preview/automation.json",
          swaggerYamlUrl: "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/specification/automation/resource-manager/Microsoft.Automation/stable/2020-01-13-preview/automation.yaml",
          info: {
            title: "AutomationManagement",
            description: "Azure Automation service API",
            version: "2020-01-13-preview",
            "x-providerName": "azure.com",
            "x-apisguru-categories": ["cloud", "automation"]
          },
          link: "https://docs.microsoft.com/en-us/rest/api/automation/"
        }
      }
    })
  },
  
  // Secondary source mock data
  secondaryAPIs: {
    "enhanced.com:api1": createMockAPI("enhanced.com:api1", {
      versions: {
        "1.0.0": {
          added: "2023-01-01T00:00:00Z",
          updated: "2023-01-01T00:00:00Z",
          swaggerUrl: "https://enhanced.com/api1/v1/openapi.json",
          swaggerYamlUrl: "https://enhanced.com/api1/v1/openapi.yaml", 
          info: {
            title: "Enhanced API 1",
            description: "Additional API from secondary source",
            version: "1.0.0",
            "x-providerName": "enhanced.com",
            "x-apisguru-categories": ["enhanced"]
          },
          link: "https://enhanced.com/api1/docs"
        }
      }
    })
  },
  
  // Custom source mock data  
  customAPIs: {
    "custom:myapi:v1": createMockAPI("custom:myapi:v1", {
      versions: {
        "v1": {
          added: "2023-01-01T00:00:00Z",
          updated: "2023-01-01T00:00:00Z",
          swaggerUrl: "file:///custom/specs/myapi/v1.json",
          swaggerYamlUrl: "file:///custom/specs/myapi/v1.yaml",
          info: {
            title: "My Custom API",
            description: "Custom imported API specification",
            version: "v1",
            "x-providerName": "custom",
            "x-apisguru-categories": ["custom"]
          },
          link: "https://myapi.example.com/docs"
        }
      }
    })
  }
};

/**
 * Mock client factory functions
 */
export function createMockPrimaryClient(cacheManager?: ICacheManager): ApiClient {
  const cache = cacheManager || new MockCacheManager();
  const client = new ApiClient('https://api.apis.guru/v2', cache);
  
  // Mock the HTTP client responses
  jest.spyOn(client as any, 'listAPIs').mockResolvedValue(TestFixtures.primaryAPIs);
  
  return client;
}

export function createMockSecondaryClient(cacheManager?: ICacheManager): SecondaryApiClient {
  const cache = cacheManager || new MockCacheManager();
  const client = new SecondaryApiClient('https://secondary.example.com/v1', cache);
  
  // Mock the HTTP client responses
  jest.spyOn(client as any, 'listAPIs').mockResolvedValue(TestFixtures.secondaryAPIs);
  
  return client;
}

export function createMockCustomClient(cacheManager?: ICacheManager): CustomSpecClient {
  const cache = cacheManager || new MockCacheManager();
  const client = new CustomSpecClient(cache);
  
  // Mock the manifest manager responses
  jest.spyOn(client as any, 'listAPIs').mockResolvedValue(TestFixtures.customAPIs);
  
  return client;
}

export function createMockDualSourceClient(cacheManager?: ICacheManager): DualSourceApiClient {
  const cache = cacheManager || new MockCacheManager();
  return new DualSourceApiClient(
    'https://api.apis.guru/v2',
    'https://secondary.example.com/v1', 
    cache
  );
}