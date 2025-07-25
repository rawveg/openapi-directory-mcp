import { spawn, ChildProcess } from 'child_process';
import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import * as path from 'path';

describe('MCP Server E2E Tests', () => {
  let serverProcess: ChildProcess;
  let serverReady = false;
  let responses: Map<number, any> = new Map();
  let errorOutput: string[] = [];
  let responseBuffer = '';

  beforeAll(async () => {
    // Clear any previous state
    responses.clear();
    errorOutput = [];
    serverReady = false;
    responseBuffer = '';

    // Spawn the actual MCP server
    const serverPath = path.join(process.cwd(), 'dist/index.js');
    serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    // Handle stdout - parse JSON-RPC responses
    serverProcess.stdout?.on('data', (data) => {
      responseBuffer += data.toString();
      
      // Try to parse complete JSON messages
      const lines = responseBuffer.split('\n');
      responseBuffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.id !== undefined) {
            responses.set(parsed.id, parsed);
          }
        } catch (e) {
          // Not complete JSON, might be split across chunks
          responseBuffer = line + '\n' + responseBuffer;
        }
      }
    });

    // Handle stderr
    serverProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      errorOutput.push(error);
      console.error('Server error:', error);
    });

    // Handle process exit
    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`Server exited with code ${code}`);
      }
    });

    // Initialize the server
    const initRequest = {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'e2e-test', version: '1.0' }
      },
      id: 1
    };

    serverProcess.stdin?.write(JSON.stringify(initRequest) + '\n');

    // Wait for initialization response
    const initResponse = await waitForResponse(1, 5000);
    expect(initResponse.result).toBeDefined();
    expect(initResponse.result.serverInfo.name).toBe('openapi-directory-mcp');
    serverReady = true;
  }, 10000);

  afterAll(async () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
    }
  });

  async function waitForResponse(id: number, timeout: number = 5000): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (responses.has(id)) {
        return responses.get(id);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Timeout waiting for response with id ${id}. Errors: ${errorOutput.join('\\n')}`);
  }

  async function sendRequest(request: any): Promise<any> {
    if (!serverReady) {
      throw new Error('Server not initialized');
    }
    
    serverProcess.stdin?.write(JSON.stringify(request) + '\n');
    return waitForResponse(request.id);
  }

  describe('Server Lifecycle', () => {
    test('server should start without errors', () => {
      expect(serverProcess.killed).toBe(false);
      expect(errorOutput.filter(e => e.includes('Error') || e.includes('error'))).toHaveLength(0);
    });

    test('server should respond to JSON-RPC requests', () => {
      expect(serverReady).toBe(true);
      expect(responses.get(1)).toBeDefined();
    });
  });

  describe('Tool Discovery', () => {
    test('should list all available tools', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 2
      });

      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeInstanceOf(Array);
      expect(response.result.tools.length).toBe(22);
      
      // Verify some expected tools
      const toolNames = response.result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('get_providers');
      expect(toolNames).toContain('search_apis');
      expect(toolNames).toContain('get_metrics');
      expect(toolNames).toContain('cache_stats');
    });
  });

  describe('Tool Execution', () => {
    test('should execute get_metrics tool', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get_metrics',
          arguments: {}
        },
        id: 3
      });

      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();
      
      // Verify metrics structure
      const metrics = response.result.content[0];
      expect(metrics.type).toBe('text');
      
      const parsedMetrics = JSON.parse(metrics.text);
      expect(parsedMetrics.numAPIs).toBeGreaterThan(0);
      expect(parsedMetrics.numProviders).toBeGreaterThan(0);
    });

    test('should execute search_apis tool', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'search_apis',
          arguments: {
            query: 'github',
            limit: 5
          }
        },
        id: 4
      });

      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();
      
      const content = response.result.content[0];
      expect(content.type).toBe('text');
      
      const searchResults = JSON.parse(content.text);
      expect(searchResults.results).toBeInstanceOf(Array);
      expect(searchResults.pagination).toBeDefined();
    });

    test('should handle tool errors gracefully', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get_provider_apis',
          arguments: {
            // Missing required parameter
          }
        },
        id: 5
      });

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('Required');
    });
  });

  describe('Prompt Discovery', () => {
    test('should list all available prompts', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        method: 'prompts/list',
        params: {},
        id: 6
      });

      expect(response.result).toBeDefined();
      expect(response.result.prompts).toBeInstanceOf(Array);
      expect(response.result.prompts.length).toBeGreaterThan(20);
      
      // Verify some expected prompts
      const promptNames = response.result.prompts.map((p: any) => p.name);
      expect(promptNames).toContain('api_discovery');
      expect(promptNames).toContain('code_generation');
      expect(promptNames).toContain('authentication_guide');
    });
  });

  describe('Prompt Execution', () => {
    test('should execute api_discovery prompt', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        method: 'prompts/get',
        params: {
          name: 'api_discovery',
          arguments: {
            use_case: 'process payments'  // Changed from api_name to use_case
          }
        },
        id: 7
      });

      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();
      expect(response.result.messages).toBeInstanceOf(Array);
      expect(response.result.messages.length).toBeGreaterThan(0);
    });

    test('should handle missing prompt arguments', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        method: 'prompts/get',
        params: {
          name: 'api_discovery',
          arguments: {} // Missing required api_name
        },
        id: 8
      });

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('Missing required argument');
    });
  });

  describe('Resource Handling', () => {
    test('should list available resources', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        method: 'resources/list',
        params: {},
        id: 9
      });

      expect(response.result).toBeDefined();
      expect(response.result.resources).toBeInstanceOf(Array);
      
      // Should have at least metrics resource
      const resourceUris = response.result.resources.map((r: any) => r.uri);
      expect(resourceUris).toContain('openapi://metrics');
    });

    test('should read metrics resource', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        method: 'resources/read',
        params: {
          uri: 'openapi://metrics'
        },
        id: 10
      });

      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();
      expect(response.result.contents).toBeInstanceOf(Array);
      expect(response.result.contents[0].mimeType).toBe('text/plain');
    });
  });

  describe('Error Scenarios', () => {
    test('should handle invalid JSON-RPC method', async () => {
      const response = await sendRequest({
        jsonrpc: '2.0',
        method: 'invalid/method',
        params: {},
        id: 11
      });

      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32601); // Method not found
    });

    test('should handle malformed requests gracefully', async () => {
      // Send malformed JSON
      serverProcess.stdin?.write('{ invalid json }\n');
      
      // Server should still be responsive
      const response = await sendRequest({
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 12
      });

      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeInstanceOf(Array);
    });
  });

  describe('Concurrent Requests', () => {
    test('should handle multiple concurrent requests', async () => {
      const requests = [
        sendRequest({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 13
        }),
        sendRequest({
          jsonrpc: '2.0',
          method: 'prompts/list',
          params: {},
          id: 14
        }),
        sendRequest({
          jsonrpc: '2.0',
          method: 'resources/list',
          params: {},
          id: 15
        })
      ];

      const responses = await Promise.all(requests);
      
      expect(responses).toHaveLength(3);
      expect(responses[0].result.tools).toBeDefined();
      expect(responses[1].result.prompts).toBeDefined();
      expect(responses[2].result.resources).toBeDefined();
    });
  });
});