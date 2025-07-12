import axios, { AxiosInstance } from "axios";
import { ICacheManager } from "../cache/types.js";
import { ApiGuruAPI, ApiGuruMetrics, ApiGuruServices } from "../types/api.js";

/**
 * Secondary API client for the enhanced OpenAPI directory
 * Provides same interface as primary ApiClient for seamless merging
 */
export class SecondaryApiClient {
  private http: AxiosInstance;
  private cache: ICacheManager;

  constructor(baseURL: string, cacheManager: ICacheManager) {
    this.http = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        Accept: "application/json",
        "User-Agent": "openapi-directory-mcp/1.0.6-dual-source",
      },
    });

    this.cache = cacheManager;
  }

  private async fetchWithCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = this.cache.get<T>(`secondary:${key}`);
    if (cached) {
      return cached;
    }

    const result = await fetchFn();
    this.cache.set(`secondary:${key}`, result, ttl);
    return result;
  }

  /**
   * List all providers in the secondary directory
   */
  async getProviders(): Promise<{ data: string[] }> {
    return this.fetchWithCache("providers", async () => {
      const response = await this.http.get<{ data: string[] }>(
        "/providers.json",
      );
      return response.data;
    });
  }

  /**
   * List all APIs for a particular provider
   */
  async getProvider(provider: string): Promise<Record<string, ApiGuruAPI>> {
    return this.fetchWithCache(`provider:${provider}`, async () => {
      const response = await this.http.get<Record<string, ApiGuruAPI>>(
        `/${provider}.json`,
      );
      return response.data;
    });
  }

  /**
   * List all serviceNames for a particular provider
   */
  async getServices(provider: string): Promise<ApiGuruServices> {
    return this.fetchWithCache(`services:${provider}`, async () => {
      const response = await this.http.get<ApiGuruServices>(
        `/${provider}/services.json`,
      );
      return response.data;
    });
  }

  /**
   * Retrieve one version of a particular API (without service)
   */
  async getAPI(provider: string, api: string): Promise<ApiGuruAPI> {
    return this.fetchWithCache(`api:${provider}:${api}`, async () => {
      const response = await this.http.get<ApiGuruAPI>(
        `/specs/${provider}/${api}.json`,
      );
      return response.data;
    });
  }

  /**
   * Retrieve one version of a particular API with a serviceName
   */
  async getServiceAPI(
    provider: string,
    service: string,
    api: string,
  ): Promise<ApiGuruAPI> {
    return this.fetchWithCache(
      `api:${provider}:${service}:${api}`,
      async () => {
        const response = await this.http.get<ApiGuruAPI>(
          `/specs/${provider}/${service}/${api}.json`,
        );
        return response.data;
      },
    );
  }

  /**
   * List all APIs in the secondary directory
   */
  async listAPIs(): Promise<Record<string, ApiGuruAPI>> {
    return this.fetchWithCache("all_apis", async () => {
      const response =
        await this.http.get<Record<string, ApiGuruAPI>>("/list.json");
      return response.data;
    });
  }

  /**
   * Get basic metrics for the secondary directory
   */
  async getMetrics(): Promise<ApiGuruMetrics> {
    return this.fetchWithCache("metrics", async () => {
      const response = await this.http.get<ApiGuruMetrics>("/metrics.json");
      return response.data;
    });
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
   * Check if the secondary API has data for a specific provider
   */
  async hasProvider(provider: string): Promise<boolean> {
    try {
      const providers = await this.getProviders();
      return providers.data.includes(provider);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if the secondary API has a specific API
   */
  async hasAPI(apiId: string): Promise<boolean> {
    try {
      const allAPIs = await this.listAPIs();
      return apiId in allAPIs;
    } catch (error) {
      return false;
    }
  }
}
