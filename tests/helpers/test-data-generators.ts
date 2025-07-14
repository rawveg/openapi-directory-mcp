import { ApiGuruAPI, ApiGuruMetrics, ApiGuruServices } from '../../src/types/api.js';

/**
 * Utility functions to generate test data
 */

export class TestDataGenerator {
  /**
   * Generate test API data with realistic structure
   */
  static generateAPI(providerId: string, apiName: string, version: string = "1.0.0"): ApiGuruAPI {
    const apiId = `${providerId}:${apiName}`;
    
    return {
      preferred: version,
      versions: {
        [version]: {
          added: "2023-01-01T00:00:00Z",
          updated: "2023-06-01T00:00:00Z",
          swaggerUrl: `https://${providerId}/specs/${apiName}/${version}/openapi.json`,
          swaggerYamlUrl: `https://${providerId}/specs/${apiName}/${version}/openapi.yaml`,
          info: {
            title: `${apiName} API`,
            description: `API for ${apiName} service by ${providerId}`,
            version: version,
            "x-providerName": providerId,
            "x-apisguru-categories": ["test", "generated"],
            "x-apisguru-popularity": Math.floor(Math.random() * 10),
            contact: {
              name: `${providerId} Support`,
              url: `https://${providerId}/support`,
              email: `support@${providerId}`
            },
            license: {
              name: "MIT",
              url: "https://opensource.org/licenses/MIT"
            }
          },
          link: `https://${providerId}/docs/${apiName}`
        }
      }
    };
  }

  /**
   * Generate a collection of APIs for testing
   */
  static generateAPICollection(count: number = 10): Record<string, ApiGuruAPI> {
    const apis: Record<string, ApiGuruAPI> = {};
    const providers = ['example.com', 'test.org', 'api.sample.net'];
    const services = ['users', 'orders', 'products', 'billing', 'analytics', 'auth', 'notifications'];
    
    for (let i = 0; i < count; i++) {
      const provider = providers[i % providers.length];
      const service = services[i % services.length];
      const apiId = `${provider}:${service}`;
      
      apis[apiId] = this.generateAPI(provider, service, "1.0.0");
    }
    
    return apis;
  }

  /**
   * Generate test metrics data
   */
  static generateMetrics(numSpecs: number = 100, numAPIs: number = 80, numEndpoints: number = 500): ApiGuruMetrics {
    return {
      numSpecs,
      numAPIs,
      numEndpoints
    };
  }

  /**
   * Generate test services data
   */
  static generateServices(serviceNames: string[]): ApiGuruServices {
    return {
      data: serviceNames.sort()
    };
  }

  /**
   * Generate OpenAPI spec with realistic endpoints
   */
  static generateOpenAPISpec(apiName: string) {
    return {
      openapi: "3.0.0",
      info: {
        title: `${apiName} API`,
        version: "1.0.0",
        description: `OpenAPI specification for ${apiName}`
      },
      servers: [
        {
          url: `https://api.${apiName.toLowerCase()}.com/v1`,
          description: "Production server"
        }
      ],
      paths: {
        [`/${apiName.toLowerCase()}`]: {
          get: {
            summary: `List ${apiName} items`,
            operationId: `list${apiName}`,
            tags: [apiName],
            responses: {
              "200": {
                description: "Successful response",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          post: {
            summary: `Create ${apiName} item`,
            operationId: `create${apiName}`,
            tags: [apiName],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" }
                    },
                    required: ["name"]
                  }
                }
              }
            },
            responses: {
              "201": {
                description: "Created successfully",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        [`/${apiName.toLowerCase()}/{id}`]: {
          get: {
            summary: `Get ${apiName} by ID`,
            operationId: `get${apiName}ById`,
            tags: [apiName],
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: {
                  type: "string"
                }
              }
            ],
            responses: {
              "200": {
                description: "Successful response",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" }
                      }
                    }
                  }
                }
              },
              "404": {
                description: "Not found"
              }
            }
          },
          put: {
            summary: `Update ${apiName} by ID`,
            operationId: `update${apiName}ById`,
            tags: [apiName],
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: {
                  type: "string"
                }
              }
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" }
                    }
                  }
                }
              }
            },
            responses: {
              "200": {
                description: "Updated successfully"
              },
              "404": {
                description: "Not found"
              }
            }
          },
          delete: {
            summary: `Delete ${apiName} by ID`,
            operationId: `delete${apiName}ById`,
            tags: [apiName],
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: {
                  type: "string"
                }
              }
            ],
            responses: {
              "204": {
                description: "Deleted successfully"
              },
              "404": {
                description: "Not found"
              }
            }
          }
        }
      },
      components: {
        schemas: {
          [`${apiName}Item`]: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" }
            },
            required: ["id", "name"]
          }
        }
      }
    };
  }

  /**
   * Generate paginated response structure
   */
  static generatePaginatedResponse<T>(
    items: T[], 
    page: number, 
    limit: number, 
    totalItems?: number
  ) {
    const total = totalItems || items.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const results = items.slice(startIndex, endIndex);
    
    return {
      results,
      pagination: {
        page,
        limit,
        total_results: total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1
      }
    };
  }

  /**
   * Generate provider statistics
   */
  static generateProviderStats(provider: string, apiCount: number = 5) {
    return {
      provider,
      total_apis: apiCount,
      total_versions: apiCount * 2,
      categories: ["test", "generated"],
      last_updated: "2023-06-01T00:00:00Z",
      avg_popularity: 5.5
    };
  }
}