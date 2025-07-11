import axios, { AxiosInstance } from 'axios';
import { CacheManager } from '../cache/manager.js';
import { ApiGuruAPI, ApiGuruMetrics, ApiGuruServices } from '../types/api.js';

export class ApiClient {
  private http: AxiosInstance;
  private cache: CacheManager;

  constructor(baseURL: string, cacheManager: CacheManager) {
    this.http = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'openapi-directory-mcp/0.1.0',
      },
    });

    this.cache = cacheManager;
  }

  private async fetchWithCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.cache.get<T>(key);
    if (cached) {
      return cached;
    }

    const result = await fetchFn();
    this.cache.set(key, result, ttl);
    return result;
  }

  /**
   * List all providers in the directory
   */
  async getProviders(): Promise<{ data: string[] }> {
    return this.fetchWithCache('providers', async () => {
      const response = await this.http.get<{ data: string[] }>('/providers.json');
      return response.data;
    });
  }

  /**
   * List all APIs for a particular provider
   */
  async getProvider(provider: string): Promise<Record<string, ApiGuruAPI>> {
    return this.fetchWithCache(`provider:${provider}`, async () => {
      const response = await this.http.get<Record<string, ApiGuruAPI>>(`/${provider}.json`);
      return response.data;
    });
  }

  /**
   * List all serviceNames for a particular provider
   */
  async getServices(provider: string): Promise<ApiGuruServices> {
    return this.fetchWithCache(`services:${provider}`, async () => {
      const response = await this.http.get<ApiGuruServices>(`/${provider}/services.json`);
      return response.data;
    });
  }

  /**
   * Retrieve one version of a particular API (without service)
   */
  async getAPI(provider: string, api: string): Promise<ApiGuruAPI> {
    return this.fetchWithCache(`api:${provider}:${api}`, async () => {
      const response = await this.http.get<ApiGuruAPI>(`/specs/${provider}/${api}.json`);
      return response.data;
    });
  }

  /**
   * Retrieve one version of a particular API with a serviceName
   */
  async getServiceAPI(provider: string, service: string, api: string): Promise<ApiGuruAPI> {
    return this.fetchWithCache(`api:${provider}:${service}:${api}`, async () => {
      const response = await this.http.get<ApiGuruAPI>(`/specs/${provider}/${service}/${api}.json`);
      return response.data;
    });
  }

  /**
   * List all APIs in the directory
   */
  async listAPIs(): Promise<Record<string, ApiGuruAPI>> {
    return this.fetchWithCache('all_apis', async () => {
      const response = await this.http.get<Record<string, ApiGuruAPI>>('/list.json');
      return response.data;
    });
  }

  /**
   * Get paginated APIs with minimal data for context efficiency
   */
  async getPaginatedAPIs(page: number = 1, limit: number = 50): Promise<{
    results: Array<{
      id: string;
      title: string;
      description: string;
      provider: string;
      preferred: string;
      categories: string[];
    }>;
    pagination: {
      page: number;
      limit: number;
      total_results: number;
      total_pages: number;
      has_next: boolean;
      has_previous: boolean;
    };
  }> {
    const cacheKey = `paginated_apis:${page}:${limit}`;
    
    return this.fetchWithCache(cacheKey, async () => {
      const allAPIs = await this.listAPIs();
      const apiEntries = Object.entries(allAPIs);
      
      // Calculate pagination
      const total_results = apiEntries.length;
      const total_pages = Math.ceil(total_results / limit);
      const offset = (page - 1) * limit;
      
      // Get page slice and transform to minimal data
      const pageEntries = apiEntries.slice(offset, offset + limit);
      const results = pageEntries.map(([id, api]) => {
        // Get preferred version info
        const preferredVersion = api.versions[api.preferred];
        return {
          id,
          title: preferredVersion?.info.title || 'Untitled API',
          description: (preferredVersion?.info.description || '').substring(0, 200) + 
                      (preferredVersion?.info.description && preferredVersion.info.description.length > 200 ? '...' : ''),
          provider: preferredVersion?.info['x-providerName'] || id.split(':')[0] || 'Unknown',
          preferred: api.preferred,
          categories: preferredVersion?.info['x-apisguru-categories'] || []
        };
      });
      
      return {
        results,
        pagination: {
          page,
          limit,
          total_results,
          total_pages,
          has_next: page < total_pages,
          has_previous: page > 1
        }
      };
    }, 300000); // Cache for 5 minutes
  }

  /**
   * Get API directory summary for overview
   */
  async getAPISummary(): Promise<{
    total_apis: number;
    total_providers: number;
    categories: string[];
    popular_apis: Array<{
      id: string;
      title: string;
      provider: string;
    }>;
    recent_updates: Array<{
      id: string;
      title: string;
      updated: string;
    }>;
  }> {
    return this.fetchWithCache('api_summary', async () => {
      const allAPIs = await this.listAPIs();
      const apiEntries = Object.entries(allAPIs);
      
      // Calculate summary statistics
      const providers = new Set<string>();
      const categories = new Set<string>();
      
      const apisWithScore = apiEntries.map(([id, api]) => {
        const preferredVersion = api.versions[api.preferred];
        const provider = preferredVersion?.info['x-providerName'] || id.split(':')[0] || 'Unknown';
        providers.add(provider);
        
        // Add categories
        (preferredVersion?.info['x-apisguru-categories'] || []).forEach(cat => categories.add(cat));
        
        // Calculate popularity score
        const versionCount = Object.keys(api.versions).length;
        const popularity = preferredVersion?.info['x-apisguru-popularity'] || 0;
        const score = versionCount * 10 + popularity;
        
        const latestUpdate = Math.max(
          ...Object.values(api.versions).map(v => new Date(v.updated).getTime())
        );
        
        return {
          id,
          title: preferredVersion?.info.title || 'Untitled API',
          provider,
          score,
          updated: latestUpdate,
          updatedString: new Date(latestUpdate).toISOString().split('T')[0]
        };
      });
      
      // Get top 10 popular APIs
      const popular_apis = apisWithScore
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(({ id, title, provider }) => ({ id, title, provider }));
      
      // Get 10 recently updated APIs
      const recent_updates = apisWithScore
        .sort((a, b) => b.updated - a.updated)
        .slice(0, 10)
        .map(({ id, title, updatedString }) => ({ id, title, updated: updatedString || 'Unknown' }));
      
      return {
        total_apis: apiEntries.length,
        total_providers: providers.size,
        categories: Array.from(categories).sort(),
        popular_apis,
        recent_updates
      };
    }, 600000); // Cache for 10 minutes
  }

  /**
   * Get basic metrics for the directory
   */
  async getMetrics(): Promise<ApiGuruMetrics> {
    return this.fetchWithCache('metrics', async () => {
      const response = await this.http.get<ApiGuruMetrics>('/metrics.json');
      return response.data;
    });
  }

  /**
   * Search APIs by query string with pagination and minimal data
   */
  async searchAPIs(query: string, provider?: string, page: number = 1, limit: number = 20): Promise<{
    results: Array<{
      id: string;
      title: string;
      description: string;
      provider: string;
      preferred: string;
      categories: string[];
    }>;
    pagination: {
      page: number;
      limit: number;
      total_results: number;
      total_pages: number;
      has_next: boolean;
      has_previous: boolean;
    };
  }> {
    // Ensure limit is within bounds
    limit = Math.min(Math.max(limit, 1), 50);
    
    const cacheKey = `search:${query}:${provider || 'all'}:${page}:${limit}`;
    
    return this.fetchWithCache(cacheKey, async () => {
      const allAPIs = await this.listAPIs();
      const queryLower = query.toLowerCase();
      
      // First, filter APIs based on search criteria
      const matchingAPIs: Array<[string, ApiGuruAPI]> = [];
      
      for (const [apiId, api] of Object.entries(allAPIs)) {
        // If provider filter is specified, check if API matches
        if (provider && !apiId.includes(provider)) {
          continue;
        }
        
        // Search in API ID, title, description, and provider name
        const matches = 
          apiId.toLowerCase().includes(queryLower) ||
          Object.values(api.versions).some(version => 
            version.info.title?.toLowerCase().includes(queryLower) ||
            version.info.description?.toLowerCase().includes(queryLower) ||
            version.info['x-providerName']?.toLowerCase().includes(queryLower)
          );
          
        if (matches) {
          matchingAPIs.push([apiId, api]);
        }
      }
      
      // Sort results by relevance
      matchingAPIs.sort(([idA, apiA], [idB, apiB]) => {
        const versionA = apiA.versions[apiA.preferred];
        const versionB = apiB.versions[apiB.preferred];
        const providerA = versionA?.info['x-providerName']?.toLowerCase() || '';
        const providerB = versionB?.info['x-providerName']?.toLowerCase() || '';
        const titleA = versionA?.info.title?.toLowerCase() || '';
        const titleB = versionB?.info.title?.toLowerCase() || '';
        
        // Score each match based on where the query appears
        const scoreMatch = (id: string, provider: string, title: string): number => {
          // Exact provider match gets highest score
          if (provider === queryLower) return 100;
          // Provider contains query gets high score
          if (provider.includes(queryLower)) return 80;
          // ID starts with query gets good score
          if (id.toLowerCase().startsWith(queryLower)) return 60;
          // ID contains query gets moderate score
          if (id.toLowerCase().includes(queryLower)) return 40;
          // Title contains query gets lower score
          if (title.includes(queryLower)) return 20;
          // Description match gets lowest score
          return 10;
        };
        
        const scoreA = scoreMatch(idA, providerA, titleA);
        const scoreB = scoreMatch(idB, providerB, titleB);
        
        // Sort by score (descending), then by version date (descending), then alphabetically by ID
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        
        // For same relevance score, prioritize newer versions
        const dateA = new Date(versionA?.updated || '1970-01-01').getTime();
        const dateB = new Date(versionB?.updated || '1970-01-01').getTime();
        if (dateA !== dateB) {
          return dateB - dateA; // Newer dates first
        }
        
        return idA.localeCompare(idB);
      });
      
      // Calculate pagination
      const total_results = matchingAPIs.length;
      const total_pages = Math.ceil(total_results / limit);
      const offset = (page - 1) * limit;
      
      // Get page slice and transform to minimal data
      const pageEntries = matchingAPIs.slice(offset, offset + limit);
      const results = pageEntries.map(([id, api]) => {
        // Get preferred version info
        const preferredVersion = api.versions[api.preferred];
        return {
          id,
          title: preferredVersion?.info.title || 'Untitled API',
          description: (preferredVersion?.info.description || '').substring(0, 200) + 
                      (preferredVersion?.info.description && preferredVersion.info.description.length > 200 ? '...' : ''),
          provider: preferredVersion?.info['x-providerName'] || id.split(':')[0] || 'Unknown',
          preferred: api.preferred,
          categories: preferredVersion?.info['x-apisguru-categories'] || []
        };
      });
      
      return {
        results,
        pagination: {
          page,
          limit,
          total_results,
          total_pages,
          has_next: page < total_pages,
          has_previous: page > 1
        }
      };
    }, 300000); // Cache search results for 5 minutes
  }

  /**
   * Get basic summary information for a specific API
   */
  async getAPISummaryById(apiId: string): Promise<{
    id: string;
    title: string;
    description: string;
    provider: string;
    versions: string[];
    preferred_version: string;
    base_url: string;
    categories: string[];
    authentication: {
      type?: string;
      description?: string;
    };
    contact?: {
      name?: string;
      url?: string;
      email?: string;
    };
    license?: {
      name?: string;
      url?: string;
    };
    documentation_url?: string;
    homepage_url?: string;
    updated: string;
    added: string;
  }> {
    return this.fetchWithCache(`api_summary:${apiId}`, async () => {
      const allAPIs = await this.listAPIs();
      const api = allAPIs[apiId];
      
      if (!api) {
        throw new Error(`API not found: ${apiId}`);
      }
      
      const preferredVersion = api.versions[api.preferred];
      
      if (!preferredVersion) {
        throw new Error(`Preferred version not found for API: ${apiId}`);
      }
      
      const info = preferredVersion.info;
      
      const result: any = {
        id: apiId,
        title: info.title || 'Untitled API',
        description: info.description || 'No description available',
        provider: info['x-providerName'] || apiId.split(':')[0] || 'Unknown',
        versions: Object.keys(api.versions),
        preferred_version: api.preferred,
        base_url: preferredVersion.swaggerUrl.replace('/swagger.json', '').replace('/swagger.yaml', ''),
        categories: info['x-apisguru-categories'] || [],
        authentication: {
          type: 'See OpenAPI spec',
          description: 'Authentication details available in the full specification'
        },
        updated: preferredVersion.updated,
        added: preferredVersion.added
      };
      
      // Only include optional properties if they exist
      if (info.contact) {
        result.contact = info.contact;
      }
      
      if (info.license) {
        result.license = info.license;
      }
      
      if (preferredVersion.link || info.contact?.url) {
        result.documentation_url = preferredVersion.link || info.contact?.url;
      }
      
      if (info.contact?.url) {
        result.homepage_url = info.contact.url;
      }
      
      return result;
    }, 600000); // Cache for 10 minutes
  }

  /**
   * Get paginated endpoints for a specific API with minimal information
   */
  async getAPIEndpoints(apiId: string, page: number = 1, limit: number = 30, tag?: string): Promise<{
    results: Array<{
      method: string;
      path: string;
      summary?: string;
      operationId?: string;
      tags: string[];
      deprecated?: boolean;
    }>;
    pagination: {
      page: number;
      limit: number;
      total_results: number;
      total_pages: number;
      has_next: boolean;
      has_previous: boolean;
    };
    available_tags: string[];
  }> {
    // Ensure limit is within bounds
    limit = Math.min(Math.max(limit, 1), 100);
    
    const cacheKey = `endpoints:${apiId}:${page}:${limit}:${tag || 'all'}`;
    
    return this.fetchWithCache(cacheKey, async () => {
      // First get the API info to get the spec URL
      const allAPIs = await this.listAPIs();
      const api = allAPIs[apiId];
      
      if (!api) {
        throw new Error(`API not found: ${apiId}`);
      }
      
      const preferredVersion = api.versions[api.preferred];
      
      if (!preferredVersion) {
        throw new Error(`Preferred version not found for API: ${apiId}`);
      }
      
      // Fetch the OpenAPI spec
      const spec = await this.getOpenAPISpec(preferredVersion.swaggerUrl);
      
      // Extract all endpoints
      const allEndpoints: Array<{
        method: string;
        path: string;
        summary?: string;
        operationId?: string;
        tags: string[];
        deprecated?: boolean;
      }> = [];
      
      const availableTags = new Set<string>();
      
      if (spec.paths) {
        for (const [path, pathItem] of Object.entries(spec.paths)) {
          if (typeof pathItem !== 'object' || pathItem === null) {
            continue;
          }
          
          const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];
          
          for (const method of methods) {
            const operation = (pathItem as any)[method];
            if (operation && typeof operation === 'object') {
              const endpointTags = operation.tags || [];
              
              // Collect all tags
              endpointTags.forEach((t: string) => availableTags.add(t));
              
              const endpoint = {
                method: method.toUpperCase(),
                path,
                summary: operation.summary,
                operationId: operation.operationId,
                tags: endpointTags,
                deprecated: operation.deprecated || false
              };
              
              allEndpoints.push(endpoint);
            }
          }
        }
      }
      
      // Filter by tag if specified
      let filteredEndpoints = allEndpoints;
      if (tag) {
        filteredEndpoints = allEndpoints.filter(endpoint => 
          endpoint.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
        );
      }
      
      // Calculate pagination
      const total_results = filteredEndpoints.length;
      const total_pages = Math.ceil(total_results / limit);
      const offset = (page - 1) * limit;
      
      // Get page slice
      const results = filteredEndpoints.slice(offset, offset + limit);
      
      return {
        results,
        pagination: {
          page,
          limit,
          total_results,
          total_pages,
          has_next: page < total_pages,
          has_previous: page > 1
        },
        available_tags: Array.from(availableTags).sort()
      };
    }, 600000); // Cache for 10 minutes
  }

  /**
   * Get detailed information about a specific API endpoint
   */
  async getEndpointDetails(apiId: string, method: string, path: string): Promise<{
    method: string;
    path: string;
    summary?: string;
    description?: string;
    operationId?: string;
    tags: string[];
    deprecated?: boolean;
    parameters: Array<{
      name: string;
      in: string;
      required: boolean;
      type: string;
      description?: string;
    }>;
    responses: Array<{
      code: string;
      description: string;
      content_types: string[];
    }>;
    consumes: string[];
    produces: string[];
    security?: Array<{
      type: string;
      scopes?: string[];
    }>;
  }> {
    const cacheKey = `endpoint_details:${apiId}:${method.toLowerCase()}:${path}`;
    
    return this.fetchWithCache(cacheKey, async () => {
      // First get the API info to get the spec URL
      const allAPIs = await this.listAPIs();
      const api = allAPIs[apiId];
      
      if (!api) {
        throw new Error(`API not found: ${apiId}`);
      }
      
      const preferredVersion = api.versions[api.preferred];
      
      if (!preferredVersion) {
        throw new Error(`Preferred version not found for API: ${apiId}`);
      }
      
      // Fetch the OpenAPI spec
      const spec = await this.getOpenAPISpec(preferredVersion.swaggerUrl);
      
      // Find the specific endpoint
      const pathItem = spec.paths?.[path];
      if (!pathItem) {
        throw new Error(`Path not found: ${path}`);
      }
      
      const operation = pathItem[method.toLowerCase()];
      if (!operation) {
        throw new Error(`Method ${method} not found for path ${path}`);
      }
      
      // Extract parameters
      const parameters: Array<{
        name: string;
        in: string;
        required: boolean;
        type: string;
        description?: string;
      }> = [];
      
      // Combine path-level and operation-level parameters
      const allParams = [...(pathItem.parameters || []), ...(operation.parameters || [])];
      
      for (const param of allParams) {
        if (param && typeof param === 'object') {
          parameters.push({
            name: param.name || 'unnamed',
            in: param.in || 'query',
            required: param.required || false,
            type: param.type || param.schema?.type || 'string',
            description: param.description
          });
        }
      }
      
      // Extract responses
      const responses: Array<{
        code: string;
        description: string;
        content_types: string[];
      }> = [];
      
      if (operation.responses) {
        for (const [code, response] of Object.entries(operation.responses)) {
          if (response && typeof response === 'object') {
            const contentTypes: string[] = [];
            if ((response as any).content) {
              contentTypes.push(...Object.keys((response as any).content));
            }
            
            responses.push({
              code,
              description: (response as any).description || 'No description',
              content_types: contentTypes
            });
          }
        }
      }
      
      // Extract content types
      const consumes: string[] = [];
      const produces: string[] = [];
      
      if (operation.requestBody?.content) {
        consumes.push(...Object.keys(operation.requestBody.content));
      }
      
      // From responses
      for (const response of responses) {
        produces.push(...response.content_types);
      }
      
      // Extract security requirements
      const security: Array<{
        type: string;
        scopes?: string[];
      }> = [];
      
      const securityReqs = operation.security || spec.security || [];
      for (const secReq of securityReqs) {
        if (secReq && typeof secReq === 'object') {
          for (const [secName, scopes] of Object.entries(secReq)) {
            const secScheme = spec.components?.securitySchemes?.[secName];
            if (secScheme) {
              const secItem: any = {
                type: secScheme.type || 'unknown'
              };
              if (Array.isArray(scopes) && scopes.length > 0) {
                secItem.scopes = scopes;
              }
              security.push(secItem);
            }
          }
        }
      }
      
      const result: any = {
        method: method.toUpperCase(),
        path,
        tags: operation.tags || [],
        deprecated: operation.deprecated || false,
        parameters,
        responses,
        consumes: [...new Set(consumes)],
        produces: [...new Set(produces)]
      };
      
      // Only add optional properties if they exist
      if (operation.summary) result.summary = operation.summary;
      if (operation.description) result.description = operation.description;
      if (operation.operationId) result.operationId = operation.operationId;
      if (security.length > 0) result.security = security;
      
      return result;
    }, 600000); // Cache for 10 minutes
  }

  /**
   * Get request and response schemas for a specific API endpoint
   */
  async getEndpointSchema(apiId: string, method: string, path: string): Promise<{
    method: string;
    path: string;
    request_body?: {
      content_type: string;
      schema: any;
      required: boolean;
    };
    parameters: Array<{
      name: string;
      in: string;
      required: boolean;
      schema: any;
    }>;
    responses: Array<{
      code: string;
      content_type: string;
      schema: any;
    }>;
  }> {
    const cacheKey = `endpoint_schema:${apiId}:${method.toLowerCase()}:${path}`;
    
    return this.fetchWithCache(cacheKey, async () => {
      // First get the API info to get the spec URL
      const allAPIs = await this.listAPIs();
      const api = allAPIs[apiId];
      
      if (!api) {
        throw new Error(`API not found: ${apiId}`);
      }
      
      const preferredVersion = api.versions[api.preferred];
      
      if (!preferredVersion) {
        throw new Error(`Preferred version not found for API: ${apiId}`);
      }
      
      // Fetch the OpenAPI spec
      const spec = await this.getOpenAPISpec(preferredVersion.swaggerUrl);
      
      // Find the specific endpoint
      const pathItem = spec.paths?.[path];
      if (!pathItem) {
        throw new Error(`Path not found: ${path}`);
      }
      
      const operation = pathItem[method.toLowerCase()];
      if (!operation) {
        throw new Error(`Method ${method} not found for path ${path}`);
      }
      
      // Extract request body schema
      let request_body;
      if (operation.requestBody) {
        const content = operation.requestBody.content;
        if (content) {
          const contentType = Object.keys(content)[0]; // Get first content type
          if (contentType && content[contentType]?.schema) {
            request_body = {
              content_type: contentType,
              schema: content[contentType].schema,
              required: operation.requestBody.required || false
            };
          }
        }
      }
      
      // Extract parameter schemas
      const parameters: Array<{
        name: string;
        in: string;
        required: boolean;
        schema: any;
      }> = [];
      
      const allParams = [...(pathItem.parameters || []), ...(operation.parameters || [])];
      
      for (const param of allParams) {
        if (param && typeof param === 'object') {
          parameters.push({
            name: param.name || 'unnamed',
            in: param.in || 'query',
            required: param.required || false,
            schema: param.schema || { type: param.type || 'string' }
          });
        }
      }
      
      // Extract response schemas
      const responses: Array<{
        code: string;
        content_type: string;
        schema: any;
      }> = [];
      
      if (operation.responses) {
        for (const [code, response] of Object.entries(operation.responses)) {
          if (response && typeof response === 'object') {
            const content = (response as any).content;
            if (content) {
              for (const [contentType, contentData] of Object.entries(content)) {
                if ((contentData as any)?.schema) {
                  responses.push({
                    code,
                    content_type: contentType,
                    schema: (contentData as any).schema
                  });
                }
              }
            }
          }
        }
      }
      
      const result: any = {
        method: method.toUpperCase(),
        path,
        parameters,
        responses
      };
      
      // Only add request_body if it exists
      if (request_body) {
        result.request_body = request_body;
      }
      
      return result;
    }, 600000); // Cache for 10 minutes
  }

  /**
   * Get request and response examples for a specific API endpoint
   */
  async getEndpointExamples(apiId: string, method: string, path: string): Promise<{
    method: string;
    path: string;
    request_examples: Array<{
      content_type: string;
      example: any;
      description?: string;
    }>;
    response_examples: Array<{
      code: string;
      content_type: string;
      example: any;
      description?: string;
    }>;
    parameter_examples: Array<{
      name: string;
      example: any;
    }>;
  }> {
    const cacheKey = `endpoint_examples:${apiId}:${method.toLowerCase()}:${path}`;
    
    return this.fetchWithCache(cacheKey, async () => {
      // First get the API info to get the spec URL
      const allAPIs = await this.listAPIs();
      const api = allAPIs[apiId];
      
      if (!api) {
        throw new Error(`API not found: ${apiId}`);
      }
      
      const preferredVersion = api.versions[api.preferred];
      
      if (!preferredVersion) {
        throw new Error(`Preferred version not found for API: ${apiId}`);
      }
      
      // Fetch the OpenAPI spec
      const spec = await this.getOpenAPISpec(preferredVersion.swaggerUrl);
      
      // Find the specific endpoint
      const pathItem = spec.paths?.[path];
      if (!pathItem) {
        throw new Error(`Path not found: ${path}`);
      }
      
      const operation = pathItem[method.toLowerCase()];
      if (!operation) {
        throw new Error(`Method ${method} not found for path ${path}`);
      }
      
      // Extract request examples
      const request_examples: Array<{
        content_type: string;
        example: any;
        description?: string;
      }> = [];
      
      if (operation.requestBody?.content) {
        for (const [contentType, contentData] of Object.entries(operation.requestBody.content)) {
          const data = contentData as any;
          if (data.example) {
            request_examples.push({
              content_type: contentType,
              example: data.example,
              description: data.description
            });
          } else if (data.examples) {
            for (const [exampleName, exampleData] of Object.entries(data.examples)) {
              const example = exampleData as any;
              request_examples.push({
                content_type: contentType,
                example: example.value || example,
                description: example.description || exampleName
              });
            }
          }
        }
      }
      
      // Extract parameter examples
      const parameter_examples: Array<{
        name: string;
        example: any;
      }> = [];
      
      const allParams = [...(pathItem.parameters || []), ...(operation.parameters || [])];
      
      for (const param of allParams) {
        if (param && typeof param === 'object' && param.example !== undefined) {
          parameter_examples.push({
            name: param.name || 'unnamed',
            example: param.example
          });
        }
      }
      
      // Extract response examples
      const response_examples: Array<{
        code: string;
        content_type: string;
        example: any;
        description?: string;
      }> = [];
      
      if (operation.responses) {
        for (const [code, response] of Object.entries(operation.responses)) {
          if (response && typeof response === 'object') {
            const content = (response as any).content;
            if (content) {
              for (const [contentType, contentData] of Object.entries(content)) {
                const data = contentData as any;
                if (data.example) {
                  response_examples.push({
                    code,
                    content_type: contentType,
                    example: data.example,
                    description: (response as any).description
                  });
                } else if (data.examples) {
                  for (const [exampleName, exampleData] of Object.entries(data.examples)) {
                    const example = exampleData as any;
                    response_examples.push({
                      code,
                      content_type: contentType,
                      example: example.value || example,
                      description: example.description || exampleName
                    });
                  }
                }
              }
            }
          }
        }
      }
      
      return {
        method: method.toUpperCase(),
        path,
        request_examples,
        response_examples,
        parameter_examples
      };
    }, 600000); // Cache for 10 minutes
  }

  /**
   * Get OpenAPI specification for a specific API version
   */
  async getOpenAPISpec(url: string): Promise<any> {
    return this.fetchWithCache(`spec:${url}`, async () => {
      const response = await axios.get(url);
      return response.data;
    });
  }

  /**
   * Get popular APIs (top 20 by some heuristic)
   */
  async getPopularAPIs(): Promise<Record<string, ApiGuruAPI>> {
    return this.fetchWithCache('popular_apis', async () => {
      const allAPIs = await this.listAPIs();
      
      // Simple heuristic: prefer APIs with more versions and recent updates
      const apiEntries = Object.entries(allAPIs);
      const scored = apiEntries.map(([id, api]) => {
        const versionCount = Object.keys(api.versions).length;
        const latestUpdate = Math.max(
          ...Object.values(api.versions).map(v => new Date(v.updated).getTime())
        );
        
        const score = versionCount * 10 + (latestUpdate / 1000000); // Simple scoring
        return { id, api, score };
      });
      
      // Sort by score and take top 20
      const popular = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .reduce((acc, { id, api }) => {
          acc[id] = api;
          return acc;
        }, {} as Record<string, ApiGuruAPI>);
      
      return popular;
    }, 3600000); // Cache for 1 hour
  }

  /**
   * Get recently updated APIs
   */
  async getRecentlyUpdatedAPIs(limit: number = 10): Promise<Record<string, ApiGuruAPI>> {
    return this.fetchWithCache(`recent:${limit}`, async () => {
      const allAPIs = await this.listAPIs();
      
      const apiEntries = Object.entries(allAPIs);
      const withLatestUpdate = apiEntries.map(([id, api]) => {
        const latestUpdate = Math.max(
          ...Object.values(api.versions).map(v => new Date(v.updated).getTime())
        );
        return { id, api, updated: latestUpdate };
      });
      
      const recent = withLatestUpdate
        .sort((a, b) => b.updated - a.updated)
        .slice(0, limit)
        .reduce((acc, { id, api }) => {
          acc[id] = api;
          return acc;
        }, {} as Record<string, ApiGuruAPI>);
      
      return recent;
    }, 1800000); // Cache for 30 minutes
  }

  /**
   * Get API statistics for a provider
   */
  async getProviderStats(provider: string): Promise<{
    totalAPIs: number;
    totalVersions: number;
    latestUpdate: string;
    oldestAPI: string;
    newestAPI: string;
  }> {
    return this.fetchWithCache(`stats:${provider}`, async () => {
      const providerAPIs = await this.getProvider(provider);
      
      let totalVersions = 0;
      let latestUpdate = new Date(0);
      let oldestAPI = '';
      let newestAPI = '';
      let oldestDate = new Date();
      let newestDate = new Date(0);
      
      for (const [apiId, api] of Object.entries(providerAPIs)) {
        const versions = Object.values(api.versions);
        totalVersions += versions.length;
        
        for (const version of versions) {
          const updated = new Date(version.updated);
          const added = new Date(version.added);
          
          if (updated > latestUpdate) {
            latestUpdate = updated;
          }
          
          if (added < oldestDate) {
            oldestDate = added;
            oldestAPI = apiId;
          }
          
          if (added > newestDate) {
            newestDate = added;
            newestAPI = apiId;
          }
        }
      }
      
      return {
        totalAPIs: Object.keys(providerAPIs).length,
        totalVersions,
        latestUpdate: latestUpdate.toISOString(),
        oldestAPI,
        newestAPI,
      };
    }, 1800000); // Cache for 30 minutes
  }
}