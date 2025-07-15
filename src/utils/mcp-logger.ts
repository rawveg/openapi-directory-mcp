/**
 * MCP-compliant logger that ensures protocol compliance
 *
 * MCP servers must NOT write anything to stdout/stderr except JSON-RPC messages.
 * This logger detects MCP mode and silences all console output to prevent protocol breaks.
 */

export class MCPLogger {
  private static isMCPMode(): boolean {
    // Detect if running as MCP server by checking if we're connected to stdio transport
    // When running via CLI, process.argv will have command arguments
    // When running as MCP server, it's just the script path
    return process.argv.length <= 2 && !process.env.MCP_DISABLE_LOGGING;
  }

  static log(...args: any[]): void {
    if (!this.isMCPMode()) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  }

  static error(...args: any[]): void {
    if (!this.isMCPMode()) {
      // eslint-disable-next-line no-console
      console.error(...args);
    }
  }

  static warn(...args: any[]): void {
    if (!this.isMCPMode()) {
      // eslint-disable-next-line no-console
      console.warn(...args);
    }
  }

  static info(...args: any[]): void {
    if (!this.isMCPMode()) {
      // eslint-disable-next-line no-console
      console.info(...args);
    }
  }

  static debug(...args: any[]): void {
    if (!this.isMCPMode()) {
      // eslint-disable-next-line no-console
      console.debug(...args);
    }
  }

  /**
   * Override global console methods to ensure MCP compliance
   */
  static initializeMCPCompliance(): void {
    if (this.isMCPMode()) {
      // In MCP mode, silence all console output
      // eslint-disable-next-line no-console
      console.log = () => {};
      // eslint-disable-next-line no-console
      console.error = () => {};
      // eslint-disable-next-line no-console
      console.warn = () => {};
      // eslint-disable-next-line no-console
      console.info = () => {};
      // eslint-disable-next-line no-console
      console.debug = () => {};
    }
  }
}
