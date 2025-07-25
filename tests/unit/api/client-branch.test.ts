import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ApiClient } from '../../../src/api/client.js';
import { ICacheManager } from '../../../src/cache/types.js';
import axios, { AxiosError } from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock cache manager
const mockCacheManager: jest.Mocked<ICacheManager> = {
  get: jest.fn(),
  set: jest.fn(),
  has: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  invalidatePattern: jest.fn(),
  getStats: jest.fn(),
  getCacheKeys: jest.fn(),
  getCacheInfo: jest.fn(),
  setPersistent: jest.fn(),
  removePersistent: jest.fn()
};

describe('ApiClient - Branch Coverage', () => {
  let client: ApiClient;
  let mockHttpInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockHttpInstance = {
      get: jest.fn()
    };
    
    mockedAxios.create.mockReturnValue(mockHttpInstance);
    
    client = new ApiClient('https://api.example.com', mockCacheManager);
  });

  describe('fetchWithCache - branch coverage', () => {
    test('should return cached value when available', async () => {
      const cachedData = { data: 'cached' };
      mockCacheManager.get.mockReturnValue(cachedData);
      
      const fetchFn = jest.fn();
      const result = await (client as any).fetchWithCache('test-key', fetchFn);
      
      expect(result).toBe(cachedData);
      expect(fetchFn).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    test('should fetch and cache when no cached value', async () => {
      const freshData = { data: 'fresh' };
      mockCacheManager.get.mockReturnValue(null);
      
      const fetchFn = jest.fn().mockResolvedValue(freshData);
      const result = await (client as any).fetchWithCache('test-key', fetchFn, 5000);
      
      expect(result).toBe(freshData);
      expect(fetchFn).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith('test-key', freshData, 5000);
    });

    test('should fetch and cache without TTL', async () => {
      const freshData = { data: 'fresh' };
      mockCacheManager.get.mockReturnValue(undefined);
      
      const fetchFn = jest.fn().mockResolvedValue(freshData);
      const result = await (client as any).fetchWithCache('test-key', fetchFn);
      
      expect(result).toBe(freshData);
      expect(mockCacheManager.set).toHaveBeenCalledWith('test-key', freshData, undefined);
    });
  });

  describe('getProvider - branch coverage', () => {
    test('should return empty apis object when response has no apis field', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          // No apis field
        }
      });
      
      const result = await client.getProvider('test-provider');
      expect(result).toEqual({});
    });

    test('should return apis when response has apis field', async () => {
      const apis = { 'api1': {}, 'api2': {} };
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: { apis }
      });
      
      const result = await client.getProvider('test-provider');
      expect(result).toEqual(apis);
    });
  });

  describe('getPaginatedAPIs - branch coverage', () => {
    test('should handle API with missing preferred version', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'api1': {
            preferred: 'v1',
            versions: {
              // v1 doesn't exist
            }
          }
        }
      });
      
      const result = await client.getPaginatedAPIs(1, 10);
      expect(result.results[0].title).toBe('Untitled API');
      expect(result.results[0].description).toBe('');
      expect(result.results[0].provider).toBe('api1'); // Takes from ID when no colon
    });

    test('should handle empty provider name in ID split', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          ':api1': { // Empty provider name
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'API 1'
                }
              }
            }
          }
        }
      });
      
      const result = await client.getPaginatedAPIs(1, 10);
      expect(result.results[0].provider).toBe('Unknown');
    });

    test('should truncate long descriptions', async () => {
      const longDescription = 'a'.repeat(250);
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'api1': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Test API',
                  description: longDescription
                }
              }
            }
          }
        }
      });
      
      const result = await client.getPaginatedAPIs(1, 10);
      expect(result.results[0].description).toBe('a'.repeat(200) + '...');
    });

    test('should not truncate short descriptions', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'api1': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Test API',
                  description: 'Short description'
                }
              }
            }
          }
        }
      });
      
      const result = await client.getPaginatedAPIs(1, 10);
      expect(result.results[0].description).toBe('Short description');
    });

    test('should extract provider from x-providerName', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'api1': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  'x-providerName': 'CustomProvider'
                }
              }
            }
          }
        }
      });
      
      const result = await client.getPaginatedAPIs(1, 10);
      expect(result.results[0].provider).toBe('CustomProvider');
    });

    test('should extract provider from ID when x-providerName missing', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'provider1:api1': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Test'
                }
              }
            }
          }
        }
      });
      
      const result = await client.getPaginatedAPIs(1, 10);
      expect(result.results[0].provider).toBe('provider1');
    });

    test('should handle API ID without colon', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'apiwithnocolon': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Test'
                }
              }
            }
          }
        }
      });
      
      const result = await client.getPaginatedAPIs(1, 10);
      expect(result.results[0].provider).toBe('apiwithnocolon'); // Uses full ID when no colon or empty after split
    });

    test('should handle empty categories', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'api1': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Test'
                  // No x-apisguru-categories
                }
              }
            }
          }
        }
      });
      
      const result = await client.getPaginatedAPIs(1, 10);
      expect(result.results[0].categories).toEqual([]);
    });

    test('should handle pagination correctly', async () => {
      const apis: any = {};
      for (let i = 1; i <= 25; i++) {
        apis[`api${i}`] = {
          preferred: 'v1',
          versions: {
            'v1': {
              info: { title: `API ${i}` }
            }
          }
        };
      }
      
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({ data: apis });
      
      const result = await client.getPaginatedAPIs(2, 10);
      expect(result.results).toHaveLength(10);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.total_results).toBe(25);
      expect(result.pagination.total_pages).toBe(3);
      expect(result.pagination.has_next).toBe(true);
      expect(result.pagination.has_previous).toBe(true);
    });

    test('should handle last page correctly', async () => {
      const apis: any = {};
      for (let i = 1; i <= 25; i++) {
        apis[`api${i}`] = {
          preferred: 'v1',
          versions: {
            'v1': {
              info: { title: `API ${i}` }
            }
          }
        };
      }
      
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({ data: apis });
      
      const result = await client.getPaginatedAPIs(3, 10);
      expect(result.results).toHaveLength(5); // Only 5 items on last page
      expect(result.pagination.has_next).toBe(false);
      expect(result.pagination.has_previous).toBe(true);
    });

    test('should handle first page correctly', async () => {
      const apis: any = {};
      for (let i = 1; i <= 15; i++) {
        apis[`api${i}`] = {
          preferred: 'v1',
          versions: {
            'v1': {
              info: { title: `API ${i}` }
            }
          }
        };
      }
      
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({ data: apis });
      
      const result = await client.getPaginatedAPIs(1, 10);
      expect(result.pagination.has_next).toBe(true);
      expect(result.pagination.has_previous).toBe(false);
    });
  });

  describe('getAPISummary - branch coverage', () => {
    test('should handle APIs without x-providerName', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'provider1:api1': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Test API'
                  // No x-providerName
                },
                updated: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummary();
      expect(result.total_providers).toBe(1);
      expect(result.popular_apis[0].provider).toBe('provider1');
    });

    test('should handle APIs without categories', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'api1': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Test API'
                  // No x-apisguru-categories
                },
                updated: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummary();
      expect(result.categories).toEqual([]);
    });

    test('should handle APIs with categories', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'api1': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Test API',
                  'x-apisguru-categories': ['cloud', 'storage']
                },
                updated: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummary();
      expect(result.categories).toEqual(['cloud', 'storage']);
    });

    test('should calculate popularity score with x-apisguru-popularity', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'api1': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Popular API',
                  'x-apisguru-popularity': 100
                },
                updated: '2023-01-01T00:00:00Z'
              },
              'v2': {
                info: { title: 'Popular API v2' },
                updated: '2023-01-02T00:00:00Z'
              }
            }
          },
          'api2': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Less Popular API'
                  // No x-apisguru-popularity (defaults to 0)
                },
                updated: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummary();
      expect(result.popular_apis[0].title).toBe('Popular API');
      expect(result.popular_apis[1].title).toBe('Less Popular API');
    });

    test('should handle missing updated date in recent updates', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'api1': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: { title: 'Test API' },
                updated: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummary();
      expect(result.recent_updates[0].updated).toBe('2023-01-01');
    });

    test('should handle more than 10 APIs for popular and recent', async () => {
      const apis: any = {};
      for (let i = 1; i <= 20; i++) {
        apis[`api${i}`] = {
          preferred: 'v1',
          versions: {
            'v1': {
              info: {
                title: `API ${i}`,
                'x-apisguru-popularity': i // Different popularity scores
              },
              updated: new Date(2023, 0, i).toISOString() // Different dates
            }
          }
        };
      }
      
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({ data: apis });
      
      const result = await client.getAPISummary();
      expect(result.popular_apis).toHaveLength(10);
      expect(result.recent_updates).toHaveLength(10);
    });

    test('should handle API ID without colon in provider extraction', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'nocolonapi': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: { title: 'Test API' },
                updated: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummary();
      expect(result.popular_apis[0].provider).toBe('nocolonapi'); // Uses full ID when no colon or empty after split
    });
  });

  describe('searchAPIs - branch coverage', () => {
    test('should enforce minimum limit of 1', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: { 'api1': { preferred: 'v1', versions: { 'v1': { info: { title: 'Test' } } } } }
      });
      
      const result = await client.searchAPIs('test', undefined, 1, 0);
      expect(result.pagination.limit).toBe(1);
    });

    test('should enforce maximum limit of 50', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: { 'api1': { preferred: 'v1', versions: { 'v1': { info: { title: 'Test' } } } } }
      });
      
      const result = await client.searchAPIs('test', undefined, 1, 100);
      expect(result.pagination.limit).toBe(50);
    });

    test('should filter by provider when specified', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'provider1:api1': {
            preferred: 'v1',
            versions: { 'v1': { info: { title: 'Test API 1' } } }
          },
          'provider2:api2': {
            preferred: 'v1',
            versions: { 'v1': { info: { title: 'Test API 2' } } }
          }
        }
      });
      
      const result = await client.searchAPIs('test', 'provider1', 1, 20);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe('provider1:api1');
    });

    test('should match against API ID case-insensitively', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'TESTAPI': {
            preferred: 'v1',
            versions: { 'v1': { info: { title: 'Different Title' } } }
          }
        }
      });
      
      const result = await client.searchAPIs('testapi', undefined, 1, 20);
      expect(result.results).toHaveLength(1);
    });

    test('should match against title', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'api1': {
            preferred: 'v1',
            versions: { 'v1': { info: { title: 'Test Match Here' } } }
          }
        }
      });
      
      const result = await client.searchAPIs('match', undefined, 1, 20);
      expect(result.results).toHaveLength(1);
    });

    test('should match against description', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'api1': {
            preferred: 'v1',
            versions: { 
              'v1': { 
                info: { 
                  title: 'API',
                  description: 'This is a test match in description'
                } 
              }
            }
          }
        }
      });
      
      const result = await client.searchAPIs('match', undefined, 1, 20);
      expect(result.results).toHaveLength(1);
    });

    test('should match against x-providerName', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'api1': {
            preferred: 'v1',
            versions: { 
              'v1': { 
                info: { 
                  title: 'API',
                  'x-providerName': 'TestProvider'
                } 
              }
            }
          }
        }
      });
      
      const result = await client.searchAPIs('testprovider', undefined, 1, 20);
      expect(result.results).toHaveLength(1);
    });

    test('should handle empty provider name in search', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          ':test-api': { // Empty provider name
            preferred: 'v1',
            versions: { 
              'v1': {
                info: {
                  title: 'Test API'
                }
              }
            }
          }
        }
      });
      
      const result = await client.searchAPIs('test', undefined, 1, 20);
      expect(result.results).toHaveLength(1); // Should still match on ID
      expect(result.results[0].provider).toBe('Unknown');
    });

    test('should score exact provider match highest', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'api1': { // ID contains query
            preferred: 'v1',
            versions: { 'v1': { info: { title: 'API 1', 'x-providerName': 'test' } } } // Exact match
          },
          'test:api2': { // ID starts with query
            preferred: 'v1',
            versions: { 'v1': { info: { title: 'API 2' } } }
          }
        }
      });
      
      const result = await client.searchAPIs('test', undefined, 1, 20);
      expect(result.results[0].id).toBe('api1'); // Exact provider match should be first
    });

    test('should score provider contains query second highest', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'api1': {
            preferred: 'v1',
            versions: { 'v1': { info: { title: 'API 1', 'x-providerName': 'besttestprovider' } } }
          },
          'api2': {
            preferred: 'v1',
            versions: { 'v1': { info: { title: 'Has test in title' } } }
          }
        }
      });
      
      const result = await client.searchAPIs('test', undefined, 1, 20);
      expect(result.results[0].id).toBe('api1'); // Provider contains match should be first
    });

    test('should score ID starts with query third highest', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': { // ID starts with query
            preferred: 'v1',
            versions: { 'v1': { info: { title: 'API 1' } } }
          },
          'api-test': { // ID contains query
            preferred: 'v1',
            versions: { 'v1': { info: { title: 'API 2' } } }
          }
        }
      });
      
      const result = await client.searchAPIs('test', undefined, 1, 20);
      expect(result.results[0].id).toBe('test-api'); // ID starts with should be first
    });

    test('should use updated date for secondary sorting', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test1': {
            preferred: 'v1',
            versions: { 'v1': { 
              info: { title: 'API 1' },
              updated: '2023-01-02T00:00:00Z'
            } }
          },
          'test2': {
            preferred: 'v1',
            versions: { 'v1': { 
              info: { title: 'API 2' },
              updated: '2023-01-01T00:00:00Z'
            } }
          }
        }
      });
      
      const result = await client.searchAPIs('test', undefined, 1, 20);
      expect(result.results[0].id).toBe('test1'); // Newer date should be first
    });

    test('should handle missing updated date as epoch', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test1': {
            preferred: 'v1',
            versions: { 'v1': { 
              info: { title: 'API 1' }
              // No updated field
            } }
          },
          'test2': {
            preferred: 'v1',
            versions: { 'v1': { 
              info: { title: 'API 2' },
              updated: '2023-01-01T00:00:00Z'
            } }
          }
        }
      });
      
      const result = await client.searchAPIs('test', undefined, 1, 20);
      expect(result.results[0].id).toBe('test2'); // API with date should be before one without
    });

    test('should use ID for tertiary sorting', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-b': {
            preferred: 'v1',
            versions: { 'v1': { 
              info: { title: 'API B' },
              updated: '2023-01-01T00:00:00Z'
            } }
          },
          'test-a': {
            preferred: 'v1',
            versions: { 'v1': { 
              info: { title: 'API A' },
              updated: '2023-01-01T00:00:00Z'
            } }
          }
        }
      });
      
      const result = await client.searchAPIs('test', undefined, 1, 20);
      expect(result.results[0].id).toBe('test-a'); // Alphabetically first
    });

    test('should handle empty search results', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'api1': {
            preferred: 'v1',
            versions: { 'v1': { info: { title: 'API 1' } } }
          }
        }
      });
      
      const result = await client.searchAPIs('nomatch', undefined, 1, 20);
      expect(result.results).toHaveLength(0);
      expect(result.pagination.total_results).toBe(0);
      expect(result.pagination.total_pages).toBe(0);
      expect(result.pagination.has_next).toBe(false);
      expect(result.pagination.has_previous).toBe(false);
    });

    test('should handle API without preferred version in results', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              // v1 doesn't exist
            }
          }
        }
      });
      
      const result = await client.searchAPIs('test', undefined, 1, 20);
      expect(result.results[0].title).toBe('Untitled API');
      expect(result.results[0].description).toBe('');
    });

    test('should truncate long descriptions in results', async () => {
      const longDescription = 'a'.repeat(250);
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Test API',
                  description: longDescription
                }
              }
            }
          }
        }
      });
      
      const result = await client.searchAPIs('test', undefined, 1, 20);
      expect(result.results[0].description).toBe('a'.repeat(200) + '...');
    });

    test('should handle empty description without adding ellipsis', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Test API',
                  description: ''
                }
              }
            }
          }
        }
      });
      
      const result = await client.searchAPIs('test', undefined, 1, 20);
      expect(result.results[0].description).toBe('');
    });
  });

  describe('getAPISummaryById - branch coverage', () => {
    test('should throw error when API not found', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {}
      });
      
      await expect(client.getAPISummaryById('nonexistent')).rejects.toThrow('API not found: nonexistent');
    });

    test('should throw error when preferred version not found', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              // v1 doesn't exist
            }
          }
        }
      });
      
      await expect(client.getAPISummaryById('test-api')).rejects.toThrow('Preferred version not found for API: test-api');
    });

    test('should handle API without title', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  // No title
                },
                swaggerUrl: 'https://api.test.com/swagger.json',
                updated: '2023-01-01T00:00:00Z',
                added: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummaryById('test-api');
      expect(result.title).toBe('Untitled API');
    });

    test('should handle API without description', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Test API'
                  // No description
                },
                swaggerUrl: 'https://api.test.com/swagger.json',
                updated: '2023-01-01T00:00:00Z',
                added: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummaryById('test-api');
      expect(result.description).toBe('No description available');
    });

    test('should extract provider from x-providerName', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Test API',
                  'x-providerName': 'CustomProvider'
                },
                swaggerUrl: 'https://api.test.com/swagger.json',
                updated: '2023-01-01T00:00:00Z',
                added: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummaryById('test-api');
      expect(result.provider).toBe('CustomProvider');
    });

    test('should extract provider from API ID', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'provider1:test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Test API'
                },
                swaggerUrl: 'https://api.test.com/swagger.json',
                updated: '2023-01-01T00:00:00Z',
                added: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummaryById('provider1:test-api');
      expect(result.provider).toBe('provider1');
    });

    test('should handle API ID without colon', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'testapi': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Test API'
                },
                swaggerUrl: 'https://api.test.com/swagger.json',
                updated: '2023-01-01T00:00:00Z',
                added: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummaryById('testapi');
      expect(result.provider).toBe('testapi'); // Uses full ID when no colon or empty after split
    });

    test('should extract base URL from swagger.json', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: { title: 'Test API' },
                swaggerUrl: 'https://api.test.com/v1/swagger.json',
                updated: '2023-01-01T00:00:00Z',
                added: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummaryById('test-api');
      expect(result.base_url).toBe('https://api.test.com/v1');
    });

    test('should extract base URL from swagger.yaml', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: { title: 'Test API' },
                swaggerUrl: 'https://api.test.com/docs/swagger.yaml',
                updated: '2023-01-01T00:00:00Z',
                added: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummaryById('test-api');
      expect(result.base_url).toBe('https://api.test.com/docs');
    });

    test('should handle missing categories', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: { title: 'Test API' },
                swaggerUrl: 'https://api.test.com/swagger.json',
                updated: '2023-01-01T00:00:00Z',
                added: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummaryById('test-api');
      expect(result.categories).toEqual([]);
    });

    test('should include contact info when present', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Test API',
                  contact: {
                    name: 'API Support',
                    email: 'support@test.com',
                    url: 'https://support.test.com'
                  }
                },
                swaggerUrl: 'https://api.test.com/swagger.json',
                updated: '2023-01-01T00:00:00Z',
                added: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummaryById('test-api');
      expect(result.contact).toEqual({
        name: 'API Support',
        email: 'support@test.com',
        url: 'https://support.test.com'
      });
    });

    test('should not include contact when missing', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: { title: 'Test API' },
                swaggerUrl: 'https://api.test.com/swagger.json',
                updated: '2023-01-01T00:00:00Z',
                added: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummaryById('test-api');
      expect(result.contact).toBeUndefined();
    });

    test('should include license info when present', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Test API',
                  license: {
                    name: 'MIT',
                    url: 'https://opensource.org/licenses/MIT'
                  }
                },
                swaggerUrl: 'https://api.test.com/swagger.json',
                updated: '2023-01-01T00:00:00Z',
                added: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummaryById('test-api');
      expect(result.license).toEqual({
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      });
    });

    test('should use version link as documentation URL', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: { title: 'Test API' },
                swaggerUrl: 'https://api.test.com/swagger.json',
                link: 'https://docs.test.com',
                updated: '2023-01-01T00:00:00Z',
                added: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummaryById('test-api');
      expect(result.documentation_url).toBe('https://docs.test.com');
    });

    test('should use contact URL as documentation URL when link missing', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: {
                  title: 'Test API',
                  contact: {
                    url: 'https://contact.test.com'
                  }
                },
                swaggerUrl: 'https://api.test.com/swagger.json',
                updated: '2023-01-01T00:00:00Z',
                added: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummaryById('test-api');
      expect(result.documentation_url).toBe('https://contact.test.com');
      expect(result.homepage_url).toBe('https://contact.test.com');
    });

    test('should not include documentation URL when both missing', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                info: { title: 'Test API' },
                swaggerUrl: 'https://api.test.com/swagger.json',
                updated: '2023-01-01T00:00:00Z',
                added: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      });
      
      const result = await client.getAPISummaryById('test-api');
      expect(result.documentation_url).toBeUndefined();
      expect(result.homepage_url).toBeUndefined();
    });
  });

  describe('getAPIEndpoints - branch coverage', () => {
    test('should enforce minimum limit', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: { paths: {} }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getAPIEndpoints('test-api', 1, 0);
      expect(result.pagination.limit).toBe(1);
    });

    test('should enforce maximum limit', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: { paths: {} }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getAPIEndpoints('test-api', 1, 200);
      expect(result.pagination.limit).toBe(100);
    });

    test('should throw error when API not found', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {}
      });
      
      await expect(client.getAPIEndpoints('nonexistent')).rejects.toThrow('API not found: nonexistent');
    });

    test('should throw error when preferred version not found', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {}
          }
        }
      });
      
      await expect(client.getAPIEndpoints('test-api')).rejects.toThrow('Preferred version not found for API: test-api');
    });

    test('should handle spec without paths', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          // No paths field
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getAPIEndpoints('test-api');
      expect(result.results).toEqual([]);
      expect(result.available_tags).toEqual([]);
    });

    test('should skip non-object path items', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          paths: {
            '/test': null,
            '/test2': 'string',
            '/test3': {
              get: {
                summary: 'Valid endpoint'
              }
            }
          }
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getAPIEndpoints('test-api');
      expect(result.results).toHaveLength(1);
    });

    test('should skip non-object operations', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          paths: {
            '/test': {
              get: null,
              post: 'string',
              put: {
                summary: 'Valid endpoint'
              }
            }
          }
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getAPIEndpoints('test-api');
      expect(result.results).toHaveLength(1);
      expect(result.results[0].method).toBe('PUT');
    });

    test('should handle all HTTP methods', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          paths: {
            '/test': {
              get: { summary: 'GET' },
              post: { summary: 'POST' },
              put: { summary: 'PUT' },
              patch: { summary: 'PATCH' },
              delete: { summary: 'DELETE' },
              head: { summary: 'HEAD' },
              options: { summary: 'OPTIONS' },
              trace: { summary: 'TRACE' },
              connect: { summary: 'CONNECT' } // Should be skipped
            }
          }
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getAPIEndpoints('test-api');
      expect(result.results).toHaveLength(8);
      const methods = result.results.map(r => r.method);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('PATCH');
      expect(methods).toContain('DELETE');
      expect(methods).toContain('HEAD');
      expect(methods).toContain('OPTIONS');
      expect(methods).toContain('TRACE');
      expect(methods).not.toContain('CONNECT');
    });

    test('should collect tags from endpoints', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          paths: {
            '/users': {
              get: { tags: ['users', 'public'] },
              post: { tags: ['users', 'admin'] }
            },
            '/products': {
              get: { tags: ['products', 'public'] }
            }
          }
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getAPIEndpoints('test-api');
      expect(result.available_tags).toEqual(['admin', 'products', 'public', 'users']);
    });

    test('should handle endpoints without tags', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          paths: {
            '/test': {
              get: {
                summary: 'No tags'
                // No tags field
              }
            }
          }
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getAPIEndpoints('test-api');
      expect(result.results[0].tags).toEqual([]);
    });

    test('should filter by tag when specified', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          paths: {
            '/users': {
              get: { tags: ['users'] },
              post: { tags: ['admin'] }
            },
            '/admin': {
              get: { tags: ['admin'] }
            }
          }
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getAPIEndpoints('test-api', 1, 30, 'admin');
      expect(result.results).toHaveLength(2);
      expect(result.results.every(r => r.tags.includes('admin'))).toBe(true);
    });

    test('should handle tag filter with partial match', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          paths: {
            '/test1': {
              get: { tags: ['administration'] }
            },
            '/test2': {
              get: { tags: ['user-admin'] }
            },
            '/test3': {
              get: { tags: ['other'] }
            }
          }
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getAPIEndpoints('test-api', 1, 30, 'admin');
      expect(result.results).toHaveLength(2); // Should match 'administration' and 'user-admin'
    });

    test('should handle deprecated endpoints', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          paths: {
            '/old': {
              get: {
                deprecated: true,
                summary: 'Old endpoint'
              }
            },
            '/new': {
              get: {
                deprecated: false,
                summary: 'New endpoint'
              }
            },
            '/current': {
              get: {
                summary: 'Current endpoint'
                // No deprecated field defaults to false
              }
            }
          }
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getAPIEndpoints('test-api');
      expect(result.results[0].deprecated).toBe(true);
      expect(result.results[1].deprecated).toBe(false);
      expect(result.results[2].deprecated).toBe(false);
    });

    test('should paginate results correctly', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Create many endpoints
      const paths: any = {};
      for (let i = 1; i <= 50; i++) {
        paths[`/endpoint${i}`] = {
          get: { summary: `Endpoint ${i}` }
        };
      }
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: { paths }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getAPIEndpoints('test-api', 2, 20);
      expect(result.results).toHaveLength(20);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.total_results).toBe(50);
      expect(result.pagination.total_pages).toBe(3);
      expect(result.pagination.has_next).toBe(true);
      expect(result.pagination.has_previous).toBe(true);
    });

    test('should handle last page with partial results', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Create 25 endpoints
      const paths: any = {};
      for (let i = 1; i <= 25; i++) {
        paths[`/endpoint${i}`] = {
          get: { summary: `Endpoint ${i}` }
        };
      }
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: { paths }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getAPIEndpoints('test-api', 3, 10);
      expect(result.results).toHaveLength(5);
      expect(result.pagination.has_next).toBe(false);
      expect(result.pagination.has_previous).toBe(true);
    });
  });

  describe('getEndpointDetails - branch coverage', () => {
    test('should throw error when API not found', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {}
      });
      
      await expect(client.getEndpointDetails('nonexistent', 'GET', '/test')).rejects.toThrow('API not found: nonexistent');
    });

    test('should throw error when preferred version not found', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {}
          }
        }
      });
      
      await expect(client.getEndpointDetails('test-api', 'GET', '/test')).rejects.toThrow('Preferred version not found for API: test-api');
    });

    test('should throw error when path not found', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          paths: {}
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      await expect(client.getEndpointDetails('test-api', 'GET', '/nonexistent')).rejects.toThrow('Path not found: /nonexistent');
    });

    test('should throw error when method not found for path', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          paths: {
            '/test': {
              post: { summary: 'POST endpoint' }
            }
          }
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      await expect(client.getEndpointDetails('test-api', 'GET', '/test')).rejects.toThrow('Method GET not found for path /test');
    });

    test('should handle parameters from path and operation levels', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          paths: {
            '/test': {
              parameters: [
                {
                  name: 'pathParam',
                  in: 'path',
                  required: true,
                  type: 'string'
                }
              ],
              get: {
                parameters: [
                  {
                    name: 'queryParam',
                    in: 'query',
                    required: false,
                    schema: { type: 'integer' }
                  }
                ],
                responses: {
                  '200': {
                    description: 'Success'
                  }
                }
              }
            }
          }
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getEndpointDetails('test-api', 'GET', '/test');
      expect(result.parameters).toHaveLength(2);
      expect(result.parameters[0].name).toBe('pathParam');
      expect(result.parameters[1].name).toBe('queryParam');
      expect(result.parameters[1].type).toBe('integer');
    });

    test('should handle parameters without type or schema', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          paths: {
            '/test': {
              get: {
                parameters: [
                  {
                    name: 'unknownParam',
                    in: 'query'
                    // No type or schema
                  }
                ],
                responses: {}
              }
            }
          }
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getEndpointDetails('test-api', 'GET', '/test');
      expect(result.parameters[0].type).toBe('string'); // Default fallback
    });

    test('should handle responses with content', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          paths: {
            '/test': {
              get: {
                responses: {
                  '200': {
                    description: 'Success',
                    content: {
                      'application/json': {},
                      'application/xml': {}
                    }
                  },
                  '404': {
                    description: 'Not found'
                    // No content
                  }
                }
              }
            }
          }
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getEndpointDetails('test-api', 'GET', '/test');
      expect(result.responses).toHaveLength(2);
      expect(result.responses[0].content_types).toEqual(['application/json', 'application/xml']);
      expect(result.responses[1].content_types).toEqual([]);
    });

    test('should handle security requirements from operation and spec', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer'
              },
              oauth2: {
                type: 'oauth2'
              }
            }
          },
          security: [
            { oauth2: ['read'] }
          ],
          paths: {
            '/test': {
              get: {
                security: [
                  { bearerAuth: [] }
                ],
                responses: {}
              }
            }
          }
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getEndpointDetails('test-api', 'GET', '/test');
      expect(result.security).toHaveLength(1);
      expect(result.security![0].type).toBe('http');
      // When scopes array is empty, the scopes property is not added
      expect(result.security![0].scopes).toBeUndefined();
    });

    test('should include optional fields only when present', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          paths: {
            '/test': {
              get: {
                summary: 'Test endpoint',
                description: 'Test description',
                operationId: 'testOperation',
                responses: {}
              }
            }
          }
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getEndpointDetails('test-api', 'GET', '/test');
      expect(result.summary).toBe('Test endpoint');
      expect(result.description).toBe('Test description');
      expect(result.operationId).toBe('testOperation');
    });
  });

  describe('getEndpointSchema - branch coverage', () => {
    test('should throw error when API not found', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {}
      });
      
      await expect(client.getEndpointSchema('nonexistent', 'GET', '/test')).rejects.toThrow('API not found: nonexistent');
    });

    test('should throw error when path not found', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: { paths: {} }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      await expect(client.getEndpointSchema('test-api', 'GET', '/nonexistent')).rejects.toThrow('Path not found: /nonexistent');
    });

    test('should handle request body schema', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          paths: {
            '/test': {
              post: {
                requestBody: {
                  required: true,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' }
                        }
                      }
                    }
                  }
                },
                responses: {}
              }
            }
          }
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getEndpointSchema('test-api', 'POST', '/test');
      expect(result.request_body).toBeDefined();
      expect(result.request_body!.content_type).toBe('application/json');
      expect(result.request_body!.required).toBe(true);
    });

    test('should handle missing request body', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          paths: {
            '/test': {
              get: {
                responses: {}
              }
            }
          }
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getEndpointSchema('test-api', 'GET', '/test');
      expect(result.request_body).toBeUndefined();
    });

    test('should handle response schemas for multiple content types', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockHttpInstance.get.mockResolvedValue({
        data: {
          'test-api': {
            preferred: 'v1',
            versions: {
              'v1': {
                swaggerUrl: 'https://api.test.com/swagger.json'
              }
            }
          }
        }
      });
      
      // Mock axios.get for spec fetch
      const mockAxiosGet = jest.fn().mockResolvedValue({
        data: {
          paths: {
            '/test': {
              get: {
                responses: {
                  '200': {
                    content: {
                      'application/json': {
                        schema: { type: 'object' }
                      },
                      'application/xml': {
                        schema: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
      (axios.get as jest.Mock) = mockAxiosGet;
      
      const result = await client.getEndpointSchema('test-api', 'GET', '/test');
      expect(result.responses).toHaveLength(2);
      expect(result.responses.some(r => r.content_type === 'application/json')).toBe(true);
      expect(result.responses.some(r => r.content_type === 'application/xml')).toBe(true);
    });
  });
});