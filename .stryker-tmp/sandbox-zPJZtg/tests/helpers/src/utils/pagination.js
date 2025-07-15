// @ts-nocheck
"use strict";
/**
 * Pagination utilities for handling large data fetches efficiently
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataProcessor = exports.PaginationHelper = void 0;
const constants_js_1 = require("./constants.js");
/**
 * Fetch data in chunks to avoid overwhelming APIs and memory
 */
class PaginationHelper {
    /**
     * Fetch all data using chunked pagination
     */
    static async fetchAllPaginated(fetchFn, options = {}) {
        const { chunkSize = constants_js_1.PAGINATION.CHUNKED_FETCH_SIZE, maxTotal = constants_js_1.PAGINATION.LARGE_FETCH_LIMIT, } = options;
        const allData = [];
        let page = 1;
        let totalAvailable;
        let hasMore = true;
        let chunksProcessed = 0;
        while (hasMore && allData.length < maxTotal) {
            try {
                // Calculate how many items we can still fetch
                const remainingSlots = maxTotal - allData.length;
                const currentChunkSize = Math.min(chunkSize, remainingSlots);
                const result = await fetchFn(page, currentChunkSize);
                if (result.data && result.data.length > 0) {
                    allData.push(...result.data);
                    chunksProcessed++;
                    // Update total if provided
                    if (result.total !== undefined) {
                        totalAvailable = result.total;
                    }
                    // Check if we have more data
                    hasMore =
                        result.hasMore !== false &&
                            result.data.length === currentChunkSize &&
                            allData.length < (totalAvailable || maxTotal);
                }
                else {
                    hasMore = false;
                }
                page++;
                // Add small delay between requests to be respectful
                if (hasMore) {
                    await PaginationHelper.delay(50);
                }
            }
            catch (error) {
                console.error(`Pagination error on page ${page}:`, error);
                hasMore = false;
            }
        }
        return {
            data: allData,
            totalFetched: allData.length,
            totalAvailable: totalAvailable || 0,
            chunksProcessed,
        };
    }
    /**
     * Fetch data with parallel chunk processing (use with caution)
     */
    static async fetchParallelChunks(fetchFn, options = {}) {
        const { chunkSize = constants_js_1.PAGINATION.CHUNKED_FETCH_SIZE, maxTotal = constants_js_1.PAGINATION.LARGE_FETCH_LIMIT, concurrency = 2, // Reduced for safety
         } = options;
        // First, get the first chunk to determine total
        const firstResult = await fetchFn(1, chunkSize);
        const totalAvailable = firstResult.total || maxTotal;
        const totalPages = Math.ceil(Math.min(totalAvailable, maxTotal) / chunkSize);
        const allData = [...firstResult.data];
        let chunksProcessed = 1;
        if (totalPages > 1) {
            // Create chunks for parallel processing
            const pageChunks = [];
            for (let i = 2; i <= totalPages; i += concurrency) {
                const chunk = [];
                for (let j = 0; j < concurrency && i + j - 1 < totalPages; j++) {
                    chunk.push(i + j);
                }
                pageChunks.push(chunk);
            }
            // Process chunks in parallel with controlled concurrency
            for (const chunk of pageChunks) {
                try {
                    const promises = chunk.map((page) => fetchFn(page, chunkSize));
                    const results = await Promise.allSettled(promises);
                    for (const result of results) {
                        if (result.status === "fulfilled" && result.value.data) {
                            allData.push(...result.value.data);
                            chunksProcessed++;
                        }
                    }
                    // Respect rate limits between chunk batches
                    if (pageChunks.indexOf(chunk) < pageChunks.length - 1) {
                        await PaginationHelper.delay(200);
                    }
                }
                catch (error) {
                    console.error(`Parallel chunk processing error:`, error);
                }
            }
        }
        return {
            data: allData.slice(0, maxTotal), // Ensure we don't exceed maxTotal
            totalFetched: Math.min(allData.length, maxTotal),
            totalAvailable,
            chunksProcessed,
        };
    }
    /**
     * Smart pagination that chooses the best strategy based on estimated data size
     */
    static async smartFetch(fetchFn, options = {}) {
        const { maxTotal = constants_js_1.PAGINATION.LARGE_FETCH_LIMIT } = options;
        // Get a small sample to estimate total size
        const sample = await fetchFn(1, 10);
        const estimatedTotal = sample.total || maxTotal;
        // Choose strategy based on estimated size
        if (estimatedTotal <= 100) {
            // Small dataset - fetch all at once
            return PaginationHelper.fetchAllPaginated(fetchFn, {
                ...options,
                chunkSize: estimatedTotal,
            });
        }
        else if (estimatedTotal <= 1000) {
            // Medium dataset - use sequential chunking
            return PaginationHelper.fetchAllPaginated(fetchFn, {
                ...options,
                chunkSize: 100,
            });
        }
        else {
            // Large dataset - use parallel processing with smaller chunks
            return PaginationHelper.fetchParallelChunks(fetchFn, {
                ...options,
                chunkSize: 50,
                concurrency: 2,
            });
        }
    }
    /**
     * Validate pagination parameters
     */
    static validatePagination(page, limit) {
        const validatedPage = Math.max(1, Math.floor(page || 1));
        const validatedLimit = Math.max(constants_js_1.PAGINATION.MIN_LIMIT, Math.min(constants_js_1.PAGINATION.MAX_LIMIT, Math.floor(limit || constants_js_1.PAGINATION.DEFAULT_LIMIT)));
        return { page: validatedPage, limit: validatedLimit };
    }
    /**
     * Calculate pagination metadata
     */
    static calculatePagination(totalItems, page, limit) {
        const totalPages = Math.ceil(totalItems / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = Math.min(startIndex + limit, totalItems);
        return {
            totalPages,
            hasNext: page < totalPages,
            hasPrevious: page > 1,
            startIndex,
            endIndex,
        };
    }
    /**
     * Simple delay utility
     */
    static delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.PaginationHelper = PaginationHelper;
/**
 * Memory-efficient data processor for large datasets
 */
class DataProcessor {
    /**
     * Process data in batches to avoid memory issues
     */
    static async processBatches(data, processor, batchSize = 100) {
        const results = [];
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            const batchResults = await processor(batch);
            results.push(...batchResults);
            // Allow garbage collection between batches
            if (i + batchSize < data.length) {
                await new Promise((resolve) => setTimeout(resolve, 10));
            }
        }
        return results;
    }
    /**
     * Stream-like processing for very large datasets
     */
    static async streamProcess(dataProvider, processor, options = {}) {
        const { bufferSize = 100, onProgress } = options;
        const results = [];
        const buffer = [];
        let processed = 0;
        for await (const item of dataProvider()) {
            buffer.push(Promise.resolve(processor(item)));
            if (buffer.length >= bufferSize) {
                const batchResults = await Promise.all(buffer);
                results.push(...batchResults);
                buffer.length = 0; // Clear buffer
                processed += batchResults.length;
                if (onProgress) {
                    onProgress(processed);
                }
            }
        }
        // Process remaining items in buffer
        if (buffer.length > 0) {
            const finalResults = await Promise.all(buffer);
            results.push(...finalResults);
            processed += finalResults.length;
            if (onProgress) {
                onProgress(processed);
            }
        }
        return results;
    }
}
exports.DataProcessor = DataProcessor;
