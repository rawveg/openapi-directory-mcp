import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { tool } from '../../../src/tools/endpoint-tools/get-endpoints.js';
import { ToolContext } from '../../../src/tools/types.js';

describe('get_endpoints tool', () => {
  let mockContext: ToolContext;
  let mockGetAPIEndpoints: jest.Mock;

  beforeEach(() => {
    mockGetAPIEndpoints = jest.fn();
    mockContext = {
      apiClient: {
        getAPIEndpoints: mockGetAPIEndpoints
      },
      cacheManager: {} as any
    } as ToolContext;
  });

  test('should have correct metadata', () => {
    expect(tool.name).toBe('get_endpoints');
    expect(tool.description).toContain('paginated list of endpoints');
    expect(tool.inputSchema.required).toContain('api_id');
  });

  test('should call getAPIEndpoints with correct parameters', async () => {
    const mockResponse = {
      results: [
        {
          method: 'GET',
          path: '/api/v1/users',
          summary: 'List users',
          tags: ['users']
        }
      ],
      pagination: {
        page: 1,
        limit: 30,
        total_results: 100,
        total_pages: 4,
        has_next: true,
        has_previous: false
      },
      available_tags: ['users', 'admin']
    };

    mockGetAPIEndpoints.mockResolvedValue(mockResponse);

    const result = await tool.execute(
      { api_id: 'googleapis.com:admin' },
      mockContext
    );

    expect(mockGetAPIEndpoints).toHaveBeenCalledWith(
      'googleapis.com:admin',
      1,
      30,
      undefined
    );
    expect(result).toEqual(mockResponse);
  });

  test('should handle pagination parameters', async () => {
    await tool.execute(
      { 
        api_id: 'test.com:api',
        page: 2,
        limit: 50,
        tag: 'users'
      },
      mockContext
    );

    expect(mockGetAPIEndpoints).toHaveBeenCalledWith(
      'test.com:api',
      2,
      50,
      'users'
    );
  });

  test('should handle API not found error', async () => {
    mockGetAPIEndpoints.mockRejectedValue(
      new Error('API not found: invalid:api')
    );

    await expect(
      tool.execute({ api_id: 'invalid:api' }, mockContext)
    ).rejects.toThrow('API not found: invalid:api');
  });

  test('should validate required api_id parameter', async () => {
    await expect(
      tool.execute({}, mockContext)
    ).rejects.toThrow();
  });

  test('should handle real API identifiers', async () => {
    // Test with various real API ID formats
    const testCases = [
      'googleapis.com:admin',
      'github.com',
      'stripe.com',
      'twilio.com:api',
      'azure.com:containerregistry'
    ];

    for (const apiId of testCases) {
      mockGetAPIEndpoints.mockResolvedValue({ results: [] });
      
      await tool.execute({ api_id: apiId }, mockContext);
      
      expect(mockGetAPIEndpoints).toHaveBeenCalledWith(
        apiId,
        1,
        30,
        undefined
      );
    }
  });
});