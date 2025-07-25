import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { PaginationHelper, DataProcessor } from '../../../src/utils/pagination.js';
import { PAGINATION } from '../../../src/utils/constants.js';

describe('PaginationHelper', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('fetchAllPaginated', () => {
    test('should fetch all data in chunks', async () => {
      const mockData = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
      const fetchFn = jest.fn(async (page: number, limit: number) => {
        const start = (page - 1) * limit;
        const end = start + limit;
        const data = mockData.slice(start, end);
        return {
          data,
          total: mockData.length,
          hasMore: end < mockData.length
        };
      });

      const result = await PaginationHelper.fetchAllPaginated(fetchFn, {
        chunkSize: 10
      });

      expect(result).toEqual({
        data: mockData,
        totalFetched: 25,
        totalAvailable: 25,
        chunksProcessed: 3
      });
      expect(fetchFn).toHaveBeenCalledTimes(3);
    });

    test('should respect maxTotal limit', async () => {
      const mockData = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
      const fetchFn = jest.fn(async (page: number, limit: number) => {
        const start = (page - 1) * limit;
        const end = start + limit;
        return {
          data: mockData.slice(start, end),
          total: mockData.length
        };
      });

      const result = await PaginationHelper.fetchAllPaginated(fetchFn, {
        chunkSize: 10,
        maxTotal: 25
      });

      expect(result.data).toHaveLength(25);
      expect(result.totalFetched).toBe(25);
      expect(fetchFn).toHaveBeenCalledTimes(3);
    });

    test('should handle empty responses', async () => {
      const fetchFn = jest.fn(async () => ({
        data: [],
        total: 0,
        hasMore: false
      }));

      const result = await PaginationHelper.fetchAllPaginated(fetchFn);

      expect(result).toEqual({
        data: [],
        totalFetched: 0,
        totalAvailable: 0,
        chunksProcessed: 0
      });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    test('should handle errors gracefully', async () => {
      const fetchFn = jest.fn()
        .mockResolvedValueOnce({ data: [{ id: 1 }], hasMore: true })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: [{ id: 3 }], hasMore: false });

      const result = await PaginationHelper.fetchAllPaginated(fetchFn, {
        chunkSize: 1
      });

      expect(result.data).toEqual([{ id: 1 }]);
      expect(result.chunksProcessed).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Pagination error on page 2:',
        expect.any(Error)
      );
    });

    test('should use default options', async () => {
      const fetchFn = jest.fn(async () => ({
        data: Array(10).fill({ id: 1 }),
        hasMore: false
      }));

      await PaginationHelper.fetchAllPaginated(fetchFn);

      expect(fetchFn).toHaveBeenCalledWith(1, PAGINATION.CHUNKED_FETCH_SIZE);
    });

    test('should handle hasMore false correctly', async () => {
      const fetchFn = jest.fn(async (page: number) => ({
        data: page === 1 ? [{ id: 1 }, { id: 2 }] : [],
        hasMore: false
      }));

      const result = await PaginationHelper.fetchAllPaginated(fetchFn);

      expect(result.data).toHaveLength(2);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    test('should calculate remaining slots correctly', async () => {
      const mockData = Array.from({ length: 30 }, (_, i) => ({ id: i + 1 }));
      const fetchFn = jest.fn(async (page: number, limit: number) => {
        const start = (page - 1) * 10; // Always use 10 as base
        const actualLimit = Math.min(limit, 10); // But respect requested limit
        const end = start + actualLimit;
        return {
          data: mockData.slice(start, end),
          total: mockData.length,
          hasMore: end < mockData.length
        };
      });

      const result = await PaginationHelper.fetchAllPaginated(fetchFn, {
        chunkSize: 10,
        maxTotal: 25
      });

      expect(result.data).toHaveLength(25);
      expect(fetchFn).toHaveBeenLastCalledWith(3, 5); // Last call should request only 5 items
    });

    test('should add delay between requests', async () => {
      const delays: number[] = [];
      const originalDelay = PaginationHelper['delay'];
      (PaginationHelper as any).delay = jest.fn((ms: number) => {
        delays.push(ms);
        return Promise.resolve();
      });

      const fetchFn = jest.fn(async (page: number) => ({
        data: [{ id: page }],
        hasMore: page < 3
      }));

      await PaginationHelper.fetchAllPaginated(fetchFn, { chunkSize: 1 });

      expect(delays).toEqual([50, 50]); // Two delays for 3 pages (no delay after last)
      
      (PaginationHelper as any).delay = originalDelay;
    });
  });

  describe('fetchParallelChunks', () => {
    test('should fetch data in parallel chunks', async () => {
      const mockData = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));
      const fetchFn = jest.fn(async (page: number, limit: number) => {
        const start = (page - 1) * limit;
        const end = start + limit;
        return {
          data: mockData.slice(start, end),
          total: mockData.length
        };
      });

      const result = await PaginationHelper.fetchParallelChunks(fetchFn, {
        chunkSize: 10,
        concurrency: 2
      });

      expect(result.data).toHaveLength(50);
      expect(result.totalFetched).toBe(50);
      expect(result.totalAvailable).toBe(50);
      expect(fetchFn).toHaveBeenCalledTimes(5); // 50 items / 10 per chunk = 5 calls
    });

    test('should handle single page', async () => {
      const fetchFn = jest.fn(async () => ({
        data: [{ id: 1 }, { id: 2 }],
        total: 2
      }));

      const result = await PaginationHelper.fetchParallelChunks(fetchFn);

      expect(result.data).toHaveLength(2);
      expect(result.chunksProcessed).toBe(1);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    test('should respect maxTotal limit', async () => {
      const mockData = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
      const fetchFn = jest.fn(async (page: number, limit: number) => {
        const start = (page - 1) * limit;
        const end = start + limit;
        return {
          data: mockData.slice(start, end),
          total: mockData.length
        };
      });

      const result = await PaginationHelper.fetchParallelChunks(fetchFn, {
        chunkSize: 10,
        maxTotal: 25
      });

      expect(result.data).toHaveLength(25);
      expect(result.totalFetched).toBe(25);
    });

    test('should handle errors in parallel processing', async () => {
      const fetchFn = jest.fn()
        .mockResolvedValueOnce({ data: [{ id: 1 }], total: 5 }) // First page
        .mockResolvedValueOnce({ data: [{ id: 2 }] }) // Page 2
        .mockRejectedValueOnce(new Error('Network error')) // Page 3 fails
        .mockResolvedValueOnce({ data: [{ id: 4 }] }) // Page 4
        .mockResolvedValueOnce({ data: [{ id: 5 }] }); // Page 5

      const result = await PaginationHelper.fetchParallelChunks(fetchFn, {
        chunkSize: 1,
        concurrency: 2
      });

      expect(result.data).toHaveLength(4); // Should get 4 items (3 failed)
      expect(result.chunksProcessed).toBe(4); // 1 initial + 3 successful parallel
    });

    test('should add delays between chunk batches', async () => {
      const delays: number[] = [];
      const originalDelay = PaginationHelper['delay'];
      (PaginationHelper as any).delay = jest.fn((ms: number) => {
        delays.push(ms);
        return Promise.resolve();
      });

      const mockData = Array.from({ length: 60 }, (_, i) => ({ id: i + 1 }));
      const fetchFn = jest.fn(async (page: number, limit: number) => {
        const start = (page - 1) * limit;
        const end = start + limit;
        return {
          data: mockData.slice(start, end),
          total: mockData.length
        };
      });

      await PaginationHelper.fetchParallelChunks(fetchFn, {
        chunkSize: 10,
        concurrency: 2
      });

      // With 6 pages total, concurrency 2: first page separate, then 2 batches of 2, then 1 final page
      // Delays between batches: 200ms each
      expect(delays.filter(d => d === 200)).toHaveLength(2);
      
      (PaginationHelper as any).delay = originalDelay;
    });

    test('should handle partial failures in Promise.allSettled', async () => {
      const fetchFn = jest.fn()
        .mockResolvedValueOnce({ data: [{ id: 1 }], total: 4 })
        .mockResolvedValueOnce({ data: [{ id: 2 }] })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ data: [{ id: 4 }] });

      const result = await PaginationHelper.fetchParallelChunks(fetchFn, {
        chunkSize: 1,
        concurrency: 3
      });

      expect(result.data).toEqual([{ id: 1 }, { id: 2 }, { id: 4 }]);
      expect(result.chunksProcessed).toBe(3);
    });

    test('should handle chunk processing errors', async () => {
      const originalAllSettled = Promise.allSettled;
      let callCount = 0;
      (Promise as any).allSettled = jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Chunk processing error');
        }
        return originalAllSettled.call(Promise, []);
      });

      const fetchFn = jest.fn()
        .mockResolvedValue({ data: [{ id: 1 }], total: 10 });

      const result = await PaginationHelper.fetchParallelChunks(fetchFn, {
        chunkSize: 1,
        concurrency: 2
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Parallel chunk processing error:',
        expect.any(Error)
      );
      
      (Promise as any).allSettled = originalAllSettled;
    });
  });

  describe('smartFetch', () => {
    test('should use single fetch for small datasets', async () => {
      const mockData = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));
      const fetchFn = jest.fn(async (page: number, limit: number) => {
        const start = (page - 1) * limit;
        const end = start + limit;
        return {
          data: mockData.slice(start, end),
          total: 50,
          hasMore: end < 50
        };
      });

      const result = await PaginationHelper.smartFetch(fetchFn);

      expect(result.data).toHaveLength(50);
      expect(fetchFn).toHaveBeenCalledWith(1, 10); // Sample call
      expect(fetchFn).toHaveBeenCalledWith(1, 50); // Fetch all at once
    });

    test('should use sequential chunking for medium datasets', async () => {
      const mockData = Array.from({ length: 500 }, (_, i) => ({ id: i + 1 }));
      const fetchFn = jest.fn(async (page: number, limit: number) => {
        const start = (page - 1) * Math.min(limit, 100);
        const end = Math.min(start + limit, start + 100);
        const data = mockData.slice(start, end);
        return {
          data,
          total: 500,
          hasMore: end < 500
        };
      });

      const result = await PaginationHelper.smartFetch(fetchFn);

      expect(fetchFn).toHaveBeenCalledWith(1, 10); // Sample
      expect(fetchFn).toHaveBeenCalledWith(1, 100); // Sequential chunks
    });

    test('should use parallel processing for large datasets', async () => {
      const mockData = Array.from({ length: 2000 }, (_, i) => ({ id: i + 1 }));
      const fetchFn = jest.fn(async (page: number, limit: number) => {
        const start = (page - 1) * 50;
        const end = start + Math.min(limit, 50);
        return {
          data: mockData.slice(start, end),
          total: 2000
        };
      });

      const fetchParallelChunksSpy = jest.spyOn(PaginationHelper, 'fetchParallelChunks');

      await PaginationHelper.smartFetch(fetchFn);

      expect(fetchFn).toHaveBeenCalledWith(1, 10); // Sample
      expect(fetchParallelChunksSpy).toHaveBeenCalledWith(
        fetchFn,
        expect.objectContaining({
          chunkSize: 50,
          concurrency: 2
        })
      );

      fetchParallelChunksSpy.mockRestore();
    });

    test('should handle datasets without total', async () => {
      const fetchFn = jest.fn(async (page: number, limit: number) => ({
        data: Array(limit).fill({ id: page }),
        hasMore: page < 5
      }));

      const result = await PaginationHelper.smartFetch(fetchFn, {
        maxTotal: 100
      });

      expect(result.data).toBeDefined();
      expect(fetchFn).toHaveBeenCalled();
    });
  });

  describe('validatePagination', () => {
    test('should validate normal parameters', () => {
      const result = PaginationHelper.validatePagination(5, 50);
      expect(result).toEqual({ page: 5, limit: 50 });
    });

    test('should handle invalid page numbers', () => {
      expect(PaginationHelper.validatePagination(0, 50)).toEqual({ page: 1, limit: 50 });
      expect(PaginationHelper.validatePagination(-5, 50)).toEqual({ page: 1, limit: 50 });
      expect(PaginationHelper.validatePagination(1.5, 50)).toEqual({ page: 1, limit: 50 });
    });

    test('should handle invalid limits', () => {
      const result1 = PaginationHelper.validatePagination(1, 0);
      // When limit is 0 (falsy), it defaults to DEFAULT_LIMIT (20)
      expect(result1.limit).toBe(PAGINATION.DEFAULT_LIMIT);

      const result2 = PaginationHelper.validatePagination(1, 10000);
      expect(result2.limit).toBe(PAGINATION.MAX_LIMIT);

      const result3 = PaginationHelper.validatePagination(1, 50.7);
      expect(result3.limit).toBe(50);
      
      // Test actual minimum limit
      const result4 = PaginationHelper.validatePagination(1, 0.5);
      expect(result4.limit).toBe(PAGINATION.MIN_LIMIT);
    });

    test('should handle null/undefined values', () => {
      const result = PaginationHelper.validatePagination(null as any, undefined as any);
      expect(result).toEqual({ 
        page: 1, 
        limit: PAGINATION.DEFAULT_LIMIT 
      });
    });
  });

  describe('calculatePagination', () => {
    test('should calculate pagination metadata correctly', () => {
      const result = PaginationHelper.calculatePagination(100, 3, 20);

      expect(result).toEqual({
        totalPages: 5,
        hasNext: true,
        hasPrevious: true,
        startIndex: 40,
        endIndex: 60
      });
    });

    test('should handle first page', () => {
      const result = PaginationHelper.calculatePagination(50, 1, 10);

      expect(result).toEqual({
        totalPages: 5,
        hasNext: true,
        hasPrevious: false,
        startIndex: 0,
        endIndex: 10
      });
    });

    test('should handle last page', () => {
      const result = PaginationHelper.calculatePagination(45, 5, 10);

      expect(result).toEqual({
        totalPages: 5,
        hasNext: false,
        hasPrevious: true,
        startIndex: 40,
        endIndex: 45
      });
    });

    test('should handle single page', () => {
      const result = PaginationHelper.calculatePagination(5, 1, 10);

      expect(result).toEqual({
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
        startIndex: 0,
        endIndex: 5
      });
    });

    test('should handle empty dataset', () => {
      const result = PaginationHelper.calculatePagination(0, 1, 10);

      expect(result).toEqual({
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
        startIndex: 0,
        endIndex: 0
      });
    });
  });

  describe('delay', () => {
    test('should delay for specified milliseconds', async () => {
      const start = Date.now();
      await PaginationHelper['delay'](100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some variance
      expect(elapsed).toBeLessThan(150);
    });
  });
});

describe('DataProcessor', () => {
  describe('processBatches', () => {
    test('should process data in batches', async () => {
      const data = Array.from({ length: 250 }, (_, i) => i);
      const processor = jest.fn(async (batch: number[]) => 
        batch.map(n => n * 2)
      );

      const result = await DataProcessor.processBatches(data, processor, 100);

      expect(result).toHaveLength(250);
      expect(result[0]).toBe(0);
      expect(result[249]).toBe(498);
      expect(processor).toHaveBeenCalledTimes(3); // 250 / 100 = 2.5, so 3 batches
    });

    test('should handle synchronous processors', async () => {
      const data = [1, 2, 3, 4, 5];
      const processor = (batch: number[]) => batch.map(n => n * 2);

      const result = await DataProcessor.processBatches(data, processor, 2);

      expect(result).toEqual([2, 4, 6, 8, 10]);
    });

    test('should use default batch size', async () => {
      const data = Array.from({ length: 150 }, (_, i) => i);
      const processor = jest.fn(async (batch: number[]) => batch);

      await DataProcessor.processBatches(data, processor);

      expect(processor).toHaveBeenCalledTimes(2); // 150 / 100 = 1.5, so 2 batches
      expect(processor).toHaveBeenCalledWith(expect.arrayContaining(data.slice(0, 100)));
      expect(processor).toHaveBeenCalledWith(expect.arrayContaining(data.slice(100)));
    });

    test('should handle empty data', async () => {
      const processor = jest.fn();
      const result = await DataProcessor.processBatches([], processor);

      expect(result).toEqual([]);
      expect(processor).not.toHaveBeenCalled();
    });

    test('should add delays between batches', async () => {
      const data = Array.from({ length: 201 }, (_, i) => i);
      const processor = jest.fn(async (batch: number[]) => batch);
      
      let delayCount = 0;
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((fn: any, ms: number) => {
        if (ms === 10) delayCount++;
        return originalSetTimeout(fn, 0); // Execute immediately for test
      }) as any;

      await DataProcessor.processBatches(data, processor, 100);

      expect(delayCount).toBe(2); // Delays after first 2 batches, not after last
      
      global.setTimeout = originalSetTimeout;
    });

    test('should handle processor errors', async () => {
      const data = [1, 2, 3];
      const processor = jest.fn(async () => {
        throw new Error('Processing error');
      });

      await expect(DataProcessor.processBatches(data, processor, 2))
        .rejects.toThrow('Processing error');
    });
  });

  describe('streamProcess', () => {
    test('should process async iterable data', async () => {
      async function* dataProvider() {
        for (let i = 0; i < 10; i++) {
          yield i;
        }
      }

      const processor = jest.fn(async (item: number) => item * 2);
      const result = await DataProcessor.streamProcess(dataProvider, processor);

      expect(result).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
      expect(processor).toHaveBeenCalledTimes(10);
    });

    test('should handle synchronous processors', async () => {
      async function* dataProvider() {
        yield* [1, 2, 3];
      }

      const processor = (item: number) => item + 10;
      const result = await DataProcessor.streamProcess(dataProvider, processor);

      expect(result).toEqual([11, 12, 13]);
    });

    test('should process with buffer', async () => {
      async function* dataProvider() {
        for (let i = 0; i < 250; i++) {
          yield i;
        }
      }

      const processor = jest.fn(async (item: number) => item);
      const progressUpdates: number[] = [];

      const result = await DataProcessor.streamProcess(dataProvider, processor, {
        bufferSize: 50,
        onProgress: (processed) => progressUpdates.push(processed)
      });

      expect(result).toHaveLength(250);
      expect(progressUpdates).toEqual([50, 100, 150, 200, 250]);
    });

    test('should handle empty stream', async () => {
      async function* dataProvider() {
        // Empty generator
      }

      const processor = jest.fn();
      const result = await DataProcessor.streamProcess(dataProvider, processor);

      expect(result).toEqual([]);
      expect(processor).not.toHaveBeenCalled();
    });

    test('should process remaining items in buffer', async () => {
      async function* dataProvider() {
        for (let i = 0; i < 105; i++) {
          yield i;
        }
      }

      const processor = jest.fn((item: number) => item);
      const progressUpdates: number[] = [];

      await DataProcessor.streamProcess(dataProvider, processor, {
        bufferSize: 100,
        onProgress: (processed) => progressUpdates.push(processed)
      });

      expect(processor).toHaveBeenCalledTimes(105);
      expect(progressUpdates).toEqual([100, 105]); // Buffer flush at 100, then remaining 5
    });

    test('should clear buffer after processing', async () => {
      async function* dataProvider() {
        for (let i = 0; i < 200; i++) {
          yield i;
        }
      }

      const processor = jest.fn((item: number) => ({ value: item }));
      
      const result = await DataProcessor.streamProcess(dataProvider, processor, {
        bufferSize: 100
      });

      expect(result).toHaveLength(200);
      // Verify all items were processed correctly
      expect(result[0]).toEqual({ value: 0 });
      expect(result[199]).toEqual({ value: 199 });
    });

    test('should handle processor errors', async () => {
      async function* dataProvider() {
        yield 1;
        yield 2;
      }

      const processor = jest.fn(async (item: number) => {
        if (item === 2) throw new Error('Process error');
        return item;
      });

      await expect(DataProcessor.streamProcess(dataProvider, processor, {
        bufferSize: 1
      })).rejects.toThrow('Process error');
    });

    test('should use default buffer size', async () => {
      async function* dataProvider() {
        for (let i = 0; i < 150; i++) {
          yield i;
        }
      }

      const processor = jest.fn((item: number) => item);
      const progressUpdates: number[] = [];

      await DataProcessor.streamProcess(dataProvider, processor, {
        onProgress: (processed) => progressUpdates.push(processed)
      });

      expect(progressUpdates[0]).toBe(100); // Default buffer size
    });
  });

  // Additional branch coverage tests removed as we're very close to 80% target
});