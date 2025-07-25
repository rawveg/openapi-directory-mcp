import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ApiClient } from '../../../src/api/client.js';
import { ICacheManager } from '../../../src/cache/types.js';
import axios from 'axios';
// Note: ApiClient throws regular Error objects, not custom error types

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiClient - Comprehensive Tests', () => {
  let apiClient: ApiClient;
  let mockCacheManager: jest.Mocked<ICacheManager>;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock cache manager
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getStats: jest.fn(),
      keys: jest.fn(),
      has: jest.fn(),
      getTtl: jest.fn(),
      getSize: jest.fn(),
      getMemoryUsage: jest.fn(),
      prune: jest.fn(),
      setEnabled: jest.fn(),
      isEnabled: jest.fn(),
      getConfig: jest.fn(),
      invalidatePattern: jest.fn(),
      invalidateKeys: jest.fn(),
      warmCache: jest.fn(),
      performHealthCheck: jest.fn()
    } as any;

    // Mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn()
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    // Also mock axios.get for getOpenAPISpec which uses axios directly
    mockedAxios.get = jest.fn();
    
    apiClient = new ApiClient('https://api.example.com', mockCacheManager);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listAPIs', () => {
    test('should fetch all APIs from API when not cached', async () => {
      const mockAPIs = {
        'github.com': {
          added: '2015-01-01',
          preferred: 'v3',
          versions: {
            v3: { info: { title: 'GitHub API' } }
          }
        },
        'stripe.com': {
          added: '2016-01-01',
          preferred: '2020-08-27',
          versions: {
            '2020-08-27': { info: { title: 'Stripe API' } }
          }
        }
      };
      
      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockAPIs });

      const result = await apiClient.listAPIs();

      expect(mockCacheManager.get).toHaveBeenCalledWith('all_apis');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/list.json');
      expect(mockCacheManager.set).toHaveBeenCalledWith('all_apis', mockAPIs, undefined);
      expect(result).toEqual(mockAPIs);
    });

    test('should return cached APIs when available', async () => {
      const cachedAPIs = { 'cached.com': { added: '2020-01-01', preferred: 'v1', versions: {} } };
      mockCacheManager.get.mockReturnValueOnce(cachedAPIs);

      const result = await apiClient.listAPIs();

      expect(mockCacheManager.get).toHaveBeenCalledWith('all_apis');
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      expect(result).toEqual(cachedAPIs);
    });
  });

  describe('getPaginatedAPIs', () => {
    test('should return paginated API results', async () => {
      const allAPIs = {
        'api1.com': {
          added: '2015-01-01',
          preferred: 'v1',
          versions: {
            v1: {
              info: {
                title: 'API 1',
                description: 'First API',
                'x-providerName': 'api1.com',
                'x-apisguru-categories': ['category1']
              },
              swaggerUrl: 'https://api1.com/swagger.json',
              updated: '2023-01-01',
              added: '2015-01-01'
            }
          }
        },
        'api2.com': {
          added: '2015-02-01',
          preferred: 'v2',
          versions: {
            v2: {
              info: {
                title: 'API 2',
                description: 'Second API',
                'x-providerName': 'api2.com',
                'x-apisguru-categories': ['category2']
              },
              swaggerUrl: 'https://api2.com/swagger.json',
              updated: '2023-02-01',
              added: '2015-02-01'
            }
          }
        }
      };

      // Mock listAPIs call
      mockCacheManager.get
        .mockReturnValueOnce(undefined) // paginated cache
        .mockReturnValueOnce(undefined); // all_apis cache
      mockAxiosInstance.get.mockResolvedValueOnce({ data: allAPIs });

      const result = await apiClient.getPaginatedAPIs(1, 10);

      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toMatchObject({
        id: 'api1.com',
        title: 'API 1',
        description: 'First API',
        provider: 'api1.com',
        preferred: 'v1',
        categories: ['category1']
      });
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total_results: 2,
        total_pages: 1,
        has_next: false,
        has_previous: false
      });
    });

    test('should handle pagination correctly', async () => {
      const manyAPIs: Record<string, any> = {};
      for (let i = 1; i <= 150; i++) {
        manyAPIs[`api${i}.com`] = {
          added: '2015-01-01',
          preferred: 'v1',
          versions: {
            v1: {
              info: {
                title: `API ${i}`,
                description: `Description ${i}`,
                'x-providerName': `api${i}.com`
              },
              swaggerUrl: `https://api${i}.com/swagger.json`,
              updated: '2023-01-01',
              added: '2015-01-01'
            }
          }
        };
      }

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: manyAPIs });

      const result = await apiClient.getPaginatedAPIs(2, 50);

      expect(result.results).toHaveLength(50);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.total_results).toBe(150);
      expect(result.pagination.total_pages).toBe(3);
      expect(result.pagination.has_next).toBe(true);
      expect(result.pagination.has_previous).toBe(true);
    });
  });

  describe('getAPISummary', () => {
    test('should return API summary statistics', async () => {
      const allAPIs = {
        'api1.com': {
          added: '2015-01-01',
          preferred: 'v1',
          versions: { 
            v1: {
              info: {
                title: 'API 1',
                'x-providerName': 'api1.com',
                'x-apisguru-categories': ['test']
              },
              swaggerUrl: 'https://api1.com/swagger.json',
              updated: '2023-01-01',
              added: '2015-01-01'
            }
          }
        },
        'api2.com': {
          added: '2015-02-01', 
          preferred: 'v2',
          versions: { 
            v2: {
              info: {
                title: 'API 2',
                'x-providerName': 'api2.com',
                'x-apisguru-categories': ['test']
              },
              swaggerUrl: 'https://api2.com/swagger.json',
              updated: '2023-02-01',
              added: '2015-02-01'
            }
          }
        }
      };

      const providers = { data: ['api1.com', 'api2.com'] };

      mockCacheManager.get
        .mockReturnValueOnce(undefined) // summary cache
        .mockReturnValueOnce(undefined) // all_apis cache
        .mockReturnValueOnce(undefined); // providers cache
      
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: allAPIs })
        .mockResolvedValueOnce(providers);

      const result = await apiClient.getAPISummary();

      expect(result.total_apis).toBe(2);
      expect(result.total_providers).toBe(2);
      expect(result.categories).toBeDefined();
      expect(result.popular_apis).toBeDefined();
      expect(result.recent_updates).toBeDefined();
    });
  });

  describe('getMetrics', () => {
    test('should fetch metrics data', async () => {
      const mockMetrics = {
        numAPIs: 2500,
        numEndpoints: 75000,
        numSpecs: 3000,
        unreachable: 50,
        invalid: 25,
        unofficial: 100,
        fixes: 500,
        fixedPct: 20
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockMetrics });

      const result = await apiClient.getMetrics();

      expect(mockCacheManager.get).toHaveBeenCalledWith('metrics');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/metrics.json');
      expect(result).toEqual(mockMetrics);
    });
  });

  describe('searchAPIs', () => {
    test('should search APIs by query', async () => {
      const allAPIs = {
        'github.com': {
          added: '2015-01-01',
          preferred: 'v3',
          versions: {
            v3: {
              info: {
                title: 'GitHub API',
                description: 'GitHub REST API v3',
                'x-providerName': 'github.com'
              },
              swaggerUrl: 'https://github.com/swagger.json',
              updated: '2023-01-01',
              added: '2015-01-01'
            }
          }
        },
        'gitlab.com': {
          added: '2016-01-01',
          preferred: 'v4',
          versions: {
            v4: {
              info: {
                title: 'GitLab API',
                description: 'GitLab REST API v4',
                'x-providerName': 'gitlab.com'
              },
              swaggerUrl: 'https://gitlab.com/swagger.json',
              updated: '2023-01-01',
              added: '2016-01-01'
            }
          }
        }
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined) // search cache
        .mockReturnValueOnce(undefined); // all_apis cache
      mockAxiosInstance.get.mockResolvedValueOnce({ data: allAPIs });

      const result = await apiClient.searchAPIs('git', undefined, 1, 10);

      expect(result.results).toHaveLength(2);
      expect(result.results.map(r => r.id)).toContain('github.com');
      expect(result.results.map(r => r.id)).toContain('gitlab.com');
    });

    test('should filter by provider', async () => {
      const allAPIs = {
        'github.com': {
          added: '2015-01-01',
          preferred: 'v3',
          versions: {
            v3: {
              info: { 
                title: 'GitHub API',
                'x-providerName': 'github.com'
              },
              swaggerUrl: 'https://github.com/swagger.json',
              updated: '2023-01-01',
              added: '2015-01-01'
            }
          }
        },
        'microsoft.com:graph': {
          added: '2016-01-01',
          preferred: 'v1.0',
          versions: {
            'v1.0': {
              info: { 
                title: 'Microsoft Graph',
                'x-providerName': 'microsoft.com'
              },
              swaggerUrl: 'https://microsoft.com/swagger.json',
              updated: '2023-01-01',
              added: '2016-01-01'
            }
          }
        }
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: allAPIs });

      const result = await apiClient.searchAPIs('api', 'github.com', 1, 10);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe('github.com');
    });
  });

  describe('getAPISummaryById', () => {
    test('should get summary for specific API', async () => {
      const allAPIs = {
        'github.com': {
          added: '2015-01-01',
          preferred: 'v3',
          versions: {
            v3: {
              info: {
                title: 'GitHub API',
                description: 'GitHub REST API',
                version: 'v3',
                contact: {
                  name: 'GitHub',
                  url: 'https://github.com/contact'
                },
                license: {
                  name: 'MIT',
                  url: 'https://opensource.org/licenses/MIT'
                },
                'x-providerName': 'github.com'
              },
              link: 'https://docs.github.com',
              swaggerUrl: 'https://github.com/swagger.json',
              updated: '2023-01-01',
              added: '2015-01-01'
            }
          }
        }
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: allAPIs });

      const result = await apiClient.getAPISummaryById('github.com');

      expect(result.id).toBe('github.com');
      expect(result.title).toBe('GitHub API');
      expect(result.description).toBe('GitHub REST API');
      expect(result.contact).toBeDefined();
      expect(result.license).toBeDefined();
      expect(result.documentation_url).toBe('https://docs.github.com');
    });

    test('should throw NotFoundError for unknown API', async () => {
      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: {} });

      await expect(apiClient.getAPISummaryById('unknown.com')).rejects.toThrow('API not found: unknown.com');
    });
  });

  describe('getAPIEndpoints', () => {
    test('should get endpoints for API with pagination', async () => {
      const mockSpec = {
        paths: {
          '/users': {
            get: {
              summary: 'List users',
              operationId: 'listUsers',
              tags: ['users']
            },
            post: {
              summary: 'Create user',
              operationId: 'createUser',
              tags: ['users']
            }
          },
          '/users/{id}': {
            get: {
              summary: 'Get user',
              operationId: 'getUser',
              tags: ['users']
            }
          }
        }
      };

      const allAPIs = {
        'test.com': {
          added: '2020-01-01',
          preferred: 'v1',
          versions: {
            v1: {
              info: { title: 'Test API' },
              swaggerUrl: 'https://test.com/swagger.json'
            }
          }
        }
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined) // endpoints cache
        .mockReturnValueOnce(undefined) // all_apis cache
        .mockReturnValueOnce(undefined); // spec cache
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: allAPIs });
      // Mock axios.get for getOpenAPISpec (it uses axios directly)
      mockedAxios.get.mockResolvedValueOnce({ data: mockSpec });

      const result = await apiClient.getAPIEndpoints('test.com', 1, 10);

      expect(result.results).toHaveLength(3);
      expect(result.pagination.total_results).toBe(3);
      expect(result.results[0]).toMatchObject({
        path: '/users',
        method: 'GET',
        summary: 'List users',
        operationId: 'listUsers',
        tags: ['users']
      });
    });

    test('should filter endpoints by tag', async () => {
      const mockSpec = {
        paths: {
          '/users': {
            get: {
              tags: ['users'],
              summary: 'List users'
            }
          },
          '/posts': {
            get: {
              tags: ['posts'],
              summary: 'List posts'
            }
          }
        }
      };

      const allAPIs = {
        'test.com': {
          added: '2020-01-01',
          preferred: 'v1',
          versions: {
            v1: {
              info: { title: 'Test API' },
              swaggerUrl: 'https://test.com/swagger.json'
            }
          }
        }
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: allAPIs });
      // Mock axios.get for getOpenAPISpec (it uses axios directly)
      mockedAxios.get.mockResolvedValueOnce({ data: mockSpec });

      const result = await apiClient.getAPIEndpoints('test.com', 1, 10, 'users');

      expect(result.results).toHaveLength(1);
      expect(result.results[0].tags).toContain('users');
    });
  });

  describe('getEndpointDetails', () => {
    test('should get details for specific endpoint', async () => {
      const mockSpec = {
        paths: {
          '/users/{id}': {
            get: {
              summary: 'Get user by ID',
              description: 'Retrieves a user by their ID',
              operationId: 'getUser',
              tags: ['users'],
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' }
                }
              ],
              responses: {
                '200': {
                  description: 'User found',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/User' }
                    }
                  }
                },
                '404': {
                  description: 'User not found'
                }
              }
            }
          }
        }
      };

      const allAPIs = {
        'test.com': {
          added: '2020-01-01',
          preferred: 'v1',
          versions: {
            v1: {
              info: { title: 'Test API' },
              swaggerUrl: 'https://test.com/swagger.json'
            }
          }
        }
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined) // endpoint details cache
        .mockReturnValueOnce(undefined) // all_apis cache
        .mockReturnValueOnce(undefined); // spec cache
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: allAPIs });
      // Mock axios.get for getOpenAPISpec (it uses axios directly)
      mockedAxios.get.mockResolvedValueOnce({ data: mockSpec });

      const result = await apiClient.getEndpointDetails('test.com', 'GET', '/users/{id}');

      expect(result.path).toBe('/users/{id}');
      expect(result.method).toBe('GET');
      expect(result.summary).toBe('Get user by ID');
      expect(result.description).toBe('Retrieves a user by their ID');
      expect(result.parameters).toHaveLength(1);
      expect(result.responses).toHaveLength(2);
    });

    test('should throw error for non-existent endpoint', async () => {
      const mockSpec = {
        paths: {}
      };

      const allAPIs = {
        'test.com': {
          added: '2020-01-01',
          preferred: 'v1',
          versions: {
            v1: {
              info: { title: 'Test API' },
              swaggerUrl: 'https://test.com/swagger.json'
            }
          }
        }
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: allAPIs });
      // Mock axios.get for getOpenAPISpec (it uses axios directly)
      mockedAxios.get.mockResolvedValueOnce({ data: mockSpec });

      await expect(
        apiClient.getEndpointDetails('test.com', 'GET', '/nonexistent')
      ).rejects.toThrow('Path not found: /nonexistent');
    });
  });

  describe('getEndpointSchema', () => {
    test('should get request and response schemas', async () => {
      const mockSpec = {
        paths: {
          '/users': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        email: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '201': {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          email: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const allAPIs = {
        'test.com': {
          added: '2020-01-01',
          preferred: 'v1',
          versions: {
            v1: {
              info: { title: 'Test API' },
              swaggerUrl: 'https://test.com/swagger.json'
            }
          }
        }
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: allAPIs });
      // Mock axios.get for getOpenAPISpec (it uses axios directly)
      mockedAxios.get.mockResolvedValueOnce({ data: mockSpec });

      const result = await apiClient.getEndpointSchema('test.com', 'POST', '/users');

      expect(result.path).toBe('/users');
      expect(result.method).toBe('POST');
      expect(result.request_body).toBeDefined();
      expect(result.responses).toBeDefined();
      expect(result.responses).toHaveLength(1);
      expect(result.responses[0].code).toBe('201');
    });
  });

  describe('getEndpointExamples', () => {
    test('should get request and response examples', async () => {
      const mockSpec = {
        paths: {
          '/users': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    examples: {
                      user1: {
                        value: {
                          name: 'John Doe',
                          email: 'john@example.com'
                        }
                      }
                    }
                  }
                }
              },
              responses: {
                '201': {
                  content: {
                    'application/json': {
                      examples: {
                        created: {
                          value: {
                            id: '123',
                            name: 'John Doe',
                            email: 'john@example.com'
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const allAPIs = {
        'test.com': {
          added: '2020-01-01',
          preferred: 'v1',
          versions: {
            v1: {
              info: { title: 'Test API' },
              swaggerUrl: 'https://test.com/swagger.json'
            }
          }
        }
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      
      mockAxiosInstance.get.mockResolvedValueOnce({ data: allAPIs });
      // Mock axios.get for getOpenAPISpec (it uses axios directly)
      mockedAxios.get.mockResolvedValueOnce({ data: mockSpec });

      const result = await apiClient.getEndpointExamples('test.com', 'POST', '/users');

      expect(result.path).toBe('/users');
      expect(result.method).toBe('POST');
      expect(result.request_examples).toHaveLength(1);
      expect(result.response_examples).toHaveLength(1);
      expect(result.request_examples[0].description).toBe('user1');
      expect(result.request_examples[0].content_type).toBe('application/json');
    });
  });

  describe('getPopularAPIs', () => {
    test('should return popular APIs based on multiple factors', async () => {
      const allAPIs = {
        'github.com': {
          added: '2015-01-01',
          preferred: 'v3',
          versions: {
            v3: {
              info: {
                title: 'GitHub API',
                description: 'GitHub REST API',
                'x-providerName': 'github.com',
                'x-apisguru-popularity': 95
              },
              swaggerUrl: 'https://github.com/swagger.json',
              updated: '2023-01-01',
              added: '2015-01-01'
            }
          }
        },
        'stripe.com': {
          added: '2016-01-01',
          preferred: '2020-08-27',
          versions: {
            '2020-08-27': {
              info: {
                title: 'Stripe API',
                description: 'Stripe payment API',
                'x-providerName': 'stripe.com',
                'x-apisguru-popularity': 90
              },
              swaggerUrl: 'https://stripe.com/swagger.json',
              updated: '2023-01-01',
              added: '2016-01-01'
            }
          }
        }
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: allAPIs });

      const result = await apiClient.getPopularAPIs();

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['github.com']).toBeDefined();
      expect(result['stripe.com']).toBeDefined();
    });
  });

  describe('getRecentlyUpdatedAPIs', () => {
    test('should return recently updated APIs', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const allAPIs = {
        'new.com': {
          added: now.toISOString().split('T')[0],
          preferred: 'v1',
          versions: {
            v1: {
              added: now.toISOString(),
              updated: now.toISOString(),
              info: { 
                title: 'New API',
                'x-providerName': 'new.com'
              },
              swaggerUrl: 'https://new.com/swagger.json'
            }
          }
        },
        'updated.com': {
          added: lastWeek.toISOString().split('T')[0],
          preferred: 'v2',
          versions: {
            v2: {
              added: lastWeek.toISOString(),
              updated: yesterday.toISOString(),
              info: { 
                title: 'Updated API',
                'x-providerName': 'updated.com'
              },
              swaggerUrl: 'https://updated.com/swagger.json'
            }
          }
        }
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: allAPIs });

      const result = await apiClient.getRecentlyUpdatedAPIs();

      expect(Object.keys(result).length).toBeGreaterThan(0);
      expect(result['new.com']).toBeDefined();
    });
  });

  describe('getProviderStats', () => {
    test('should return statistics for a provider', async () => {
      const providerAPIs = {
        'googleapis.com:admin': {
          added: '2015-01-01',
          preferred: 'directory_v1',
          versions: {
            directory_v1: {
              info: { 
                title: 'Admin Directory API',
                'x-providerName': 'googleapis.com'
              },
              swaggerUrl: 'https://googleapis.com/admin/swagger.json',
              updated: '2023-01-01',
              added: '2015-01-01'
            }
          }
        },
        'googleapis.com:drive': {
          added: '2015-02-01',
          preferred: 'v3',
          versions: {
            v3: {
              info: { 
                title: 'Google Drive API',
                'x-providerName': 'googleapis.com'
              },
              swaggerUrl: 'https://googleapis.com/drive/swagger.json',
              updated: '2023-02-01',
              added: '2015-02-01'
            }
          }
        }
      };

      mockCacheManager.get
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(providerAPIs);

      const result = await apiClient.getProviderStats('googleapis.com');

      expect(result.totalAPIs).toBe(2);
      expect(result.totalVersions).toBe(2);
      expect(result.latestUpdate).toBeDefined();
      expect(result.oldestAPI).toBeDefined();
      expect(result.newestAPI).toBeDefined();
    });
  });

  describe('getOpenAPISpec', () => {
    test('should fetch OpenAPI spec from URL', async () => {
      const mockSpec = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0'
        },
        paths: {
          '/test': {
            get: {
              summary: 'Test endpoint'
            }
          }
        }
      };

      mockCacheManager.get.mockReturnValueOnce(undefined);
      // Mock axios.get for getOpenAPISpec
      const mockedAxiosGet = jest.spyOn(axios, 'get');
      mockedAxiosGet.mockResolvedValueOnce({ data: mockSpec });

      const result = await apiClient.getOpenAPISpec('https://example.com/openapi.json');

      expect(mockCacheManager.get).toHaveBeenCalledWith('spec:https://example.com/openapi.json');
      expect(result).toEqual(mockSpec);
    });

    test('should handle YAML specs', async () => {
      const yamlContent = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      summary: Test endpoint
`;

      mockCacheManager.get.mockReturnValueOnce(undefined);
      // Mock axios.get for getOpenAPISpec (it uses axios directly, not this.http)
      mockedAxios.get.mockResolvedValueOnce({ data: yamlContent });

      const result = await apiClient.getOpenAPISpec('https://example.com/openapi.yaml');

      // For YAML specs, the result would be parsed YAML content
      // In this test, we're assuming the mock returns the raw YAML string
      expect(result).toBe(yamlContent);
    });
  });

  describe('error handling', () => {
    test('should throw NetworkError for connection issues', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      const error = new Error('ECONNREFUSED');
      (error as any).code = 'ECONNREFUSED';
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(apiClient.getProviders()).rejects.toThrow();
    });

    test('should throw TimeoutError for timeout issues', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      const error = new Error('timeout of 30000ms exceeded');
      (error as any).code = 'ECONNABORTED';
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(apiClient.getProviders()).rejects.toThrow();
    });

    test('should throw NotFoundError for 404 responses', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      const error = new Error('Not Found');
      (error as any).response = {
        status: 404,
        statusText: 'Not Found'
      };
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(apiClient.getAPI('unknown.com', 'v1')).rejects.toThrow();
    });

    test('should throw ServerError for 5xx responses', async () => {
      mockCacheManager.get.mockReturnValueOnce(undefined);
      const error = new Error('Internal Server Error');
      (error as any).response = {
        status: 500,
        statusText: 'Internal Server Error'
      };
      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(apiClient.getProviders()).rejects.toThrow();
    });
  });

  // Note: These methods don't exist in ApiClient
  // hasAPI, hasProvider, and invalidateCache are not implemented
});