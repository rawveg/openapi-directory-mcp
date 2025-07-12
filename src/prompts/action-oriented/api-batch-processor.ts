import { PromptTemplate } from "../types.js";

export const prompt: PromptTemplate = {
  name: "api_batch_processor",
  description: "Generate batch processing code for bulk API operations",
  template:
    "Generate batch processing code for the {{api_name}} API with batch size {{batch_size}}, concurrency {{concurrency}}, and error strategy {{error_strategy}}",
  category: "action-oriented",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to create batch processing for",
      required: true,
    },
    {
      name: "batch_size",
      description: "Number of items per batch (default: auto-detect)",
      required: false,
    },
    {
      name: "concurrency",
      description: "Number of concurrent batches (default: 5)",
      required: false,
    },
    {
      name: "error_strategy",
      description: "Error handling strategy (continue, stop, retry)",
      required: false,
    },
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Generate batch processing code for the ${args.api_name} API.

${args.batch_size ? `Batch size: ${args.batch_size}` : "Auto-detect optimal batch size"}
${args.concurrency ? `Concurrency: ${args.concurrency}` : "Use 5 concurrent batches"}
${args.error_strategy ? `Error strategy: ${args.error_strategy}` : "Continue processing on errors"}

Please create comprehensive batch processing:

**Phase 1: API Batch Analysis**
1. Use 'search_apis' to find the ${args.api_name} API
2. Use 'get_endpoints' to identify bulk/batch operations
3. Use 'get_endpoint_details' to understand rate limits
4. Analyze which operations can be batched efficiently

**Phase 2: Batch Strategy Design**
5. Determine optimal batch sizes per operation
6. Plan concurrency and rate limit compliance
7. Design error handling and retry strategies
8. Create progress tracking and monitoring

**Phase 3: Implementation Generation**
9. Generate batch processor classes
10. Create queue management system
11. Add progress tracking and reporting
12. Implement error recovery mechanisms
13. Add performance monitoring

**Batch Processing Features:**

**1. Intelligent Batching:**
- Auto-detect API batch capabilities
- Optimize batch sizes for rate limits
- Handle mixed operation types
- Adaptive batch sizing based on performance

**2. Concurrency Management:**
${args.concurrency ? `- ${args.concurrency} concurrent batch workers` : "- 5 concurrent batch workers by default"}
- Rate limit aware scheduling
- Backpressure handling
- Resource usage monitoring

**3. Error Handling Strategies:**
${
  args.error_strategy === "continue" || !args.error_strategy
    ? `
**Continue Strategy:**
- Log errors but continue processing
- Collect failed items for later retry
- Maintain overall progress
- Generate detailed error reports
`
    : ""
}
${
  args.error_strategy === "stop"
    ? `
**Stop Strategy:**
- Halt processing on first error
- Preserve processing state
- Allow manual intervention
- Resume from failure point
`
    : ""
}
${
  args.error_strategy === "retry"
    ? `
**Retry Strategy:**
- Automatic retry with exponential backoff
- Maximum retry attempts per item
- Dead letter queue for permanent failures
- Smart retry scheduling
`
    : ""
}

**4. Progress Tracking:**
- Real-time progress updates
- ETA calculations
- Throughput monitoring
- Success/failure statistics

**Generated Components:**
\`\`\`
batch-processor/
├── processor/        # Main batch processing logic
├── queue/           # Item queue management
├── workers/         # Concurrent processing workers
├── tracking/        # Progress and metrics
├── errors/          # Error handling and recovery
└── config/          # Batch configuration
\`\`\`

**Usage Example:**
\`\`\`typescript
const processor = new BatchProcessor({
  api: '${args.api_name}',
  batchSize: ${args.batch_size || "auto"},
  concurrency: ${args.concurrency || 5},
  onProgress: (stats) => console.log(stats),
  onError: (error, item) => handleError(error, item)
});

await processor.process(largeDataSet);
\`\`\`

**Performance Features:**
- Memory-efficient streaming
- Adaptive rate limiting
- Connection pooling
- Result streaming
- Checkpoint/resume capability

Begin by analyzing the API's batch capabilities and rate limiting constraints.`,
      },
    },
  ],
};

export default prompt;
