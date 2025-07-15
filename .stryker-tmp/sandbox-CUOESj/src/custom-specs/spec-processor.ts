/**
 * OpenAPI specification processor for custom specs
 * Handles YAML-to-JSON conversion, validation, and normalization
 */
// @ts-nocheck


/* eslint-disable no-console */

import { readFileSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";
import * as yaml from "js-yaml";
import SwaggerParser from "@apidevtools/swagger-parser";
import axios from "axios";
import { ApiGuruAPI, ApiGuruApiVersion } from "../types/api.js";
import { ValidationResult, SpecProcessingResult } from "./types.js";
import { SecurityScanner } from "./security-scanner.js";

export class SpecProcessor {
  private securityScanner: SecurityScanner;

  constructor() {
    this.securityScanner = new SecurityScanner();
  }

  /**
   * Process an OpenAPI spec from file or URL
   */
  async processSpec(
    source: string,
    skipSecurity = false,
  ): Promise<SpecProcessingResult> {
    let content: string;
    let originalFormat: "yaml" | "json";

    // Fetch content
    if (this.isUrl(source)) {
      content = await this.fetchFromUrl(source);
    } else {
      content = this.readFromFile(source);
    }

    // Detect format
    originalFormat = this.detectFormat(content);

    // Parse to object
    const specObject = this.parseContent(content, originalFormat);

    // Validate OpenAPI spec
    const validation = await this.validateOpenAPISpec(specObject);
    if (!validation.valid) {
      throw new Error(
        `Invalid OpenAPI specification: ${validation.errors.join(", ")}`,
      );
    }

    // Convert to ApiGuruAPI format
    const apiGuruSpec = this.convertToApiGuruFormat(specObject);

    // Run security scan
    const securityScan = skipSecurity
      ? this.createEmptySecurityScan()
      : await this.securityScanner.scanSpec(specObject);

    // Check if security issues block import
    if (securityScan.blocked) {
      throw new Error(
        `Import blocked by critical security issues:\n${this.securityScanner.generateReport(securityScan)}`,
      );
    }

    // Extract metadata - use byte length instead of string length
    const metadata = this.extractMetadata(
      specObject,
      Buffer.byteLength(content, "utf8"),
    );

    return {
      spec: apiGuruSpec,
      originalFormat,
      securityScan,
      metadata,
    };
  }

  /**
   * Check if source is a URL
   */
  private isUrl(source: string): boolean {
    return source.startsWith("http://") || source.startsWith("https://");
  }

  /**
   * Fetch spec from URL
   */
  private async fetchFromUrl(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          Accept: "application/json, application/yaml, text/yaml, text/plain",
          "User-Agent": "openapi-directory-mcp/1.2.0",
        },
        maxContentLength: 10 * 1024 * 1024, // 10MB limit
      });

      if (typeof response.data === "string") {
        return response.data;
      } else {
        return JSON.stringify(response.data, null, 2);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch spec from URL: ${error.message}`);
      }
      throw new Error(`Unexpected error fetching spec: ${error}`);
    }
  }

  /**
   * Read spec from file (with tilde expansion)
   */
  private readFromFile(filePath: string): string {
    try {
      // Expand tilde to home directory
      const expandedPath = filePath.startsWith("~/")
        ? resolve(homedir(), filePath.slice(2))
        : filePath;

      return readFileSync(expandedPath, "utf-8");
    } catch (error) {
      throw new Error(
        `Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Detect if content is YAML or JSON
   */
  detectFormat(content: string): "yaml" | "json" {
    const trimmed = content.trim();

    // Check if it starts with JSON indicators
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return "json";
    }

    // Check for YAML indicators
    if (
      trimmed.includes("openapi:") ||
      trimmed.includes("swagger:") ||
      trimmed.match(/^[a-zA-Z_][a-zA-Z0-9_]*:\s*$/m)
    ) {
      return "yaml";
    }

    // Try to parse as JSON first
    try {
      JSON.parse(content);
      return "json";
    } catch {
      // Assume YAML if JSON parse fails
      return "yaml";
    }
  }

  /**
   * Parse content based on format
   */
  private parseContent(content: string, format: "yaml" | "json"): any {
    try {
      if (format === "json") {
        return JSON.parse(content);
      } else {
        return yaml.load(content, {
          onWarning: (warning) => {
            console.warn(`YAML warning: ${warning.message}`);
          },
          // Security: Don't allow arbitrary code execution
          schema: yaml.CORE_SCHEMA,
        });
      }
    } catch (error) {
      throw new Error(
        `Failed to parse ${format.toUpperCase()}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Validate OpenAPI specification
   */
  private async validateOpenAPISpec(spec: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check for OpenAPI version
      const version = spec.openapi || spec.swagger;
      if (!version) {
        errors.push("Missing OpenAPI/Swagger version field");
        return { valid: false, errors, warnings };
      }

      // Use swagger-parser for validation
      await SwaggerParser.validate(spec);

      // Additional custom validations
      if (!spec.info) {
        errors.push('Missing required "info" section');
      } else {
        if (!spec.info.title) {
          errors.push('Missing required "info.title" field');
        }
        if (!spec.info.version) {
          warnings.push('Missing "info.version" field');
        }
      }

      if (!spec.paths && !spec.components) {
        warnings.push(
          "No paths or components defined - this might be an incomplete spec",
        );
      }

      return {
        valid: errors.length === 0,
        version,
        errors,
        warnings,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown validation error";
      errors.push(message);

      return {
        valid: false,
        errors,
        warnings,
      };
    }
  }

  /**
   * Convert OpenAPI spec to ApiGuruAPI format
   */
  private convertToApiGuruFormat(spec: any): ApiGuruAPI {
    const info = spec.info || {};
    const added = new Date().toISOString();
    const version = info.version || "1.0.0";

    // Determine file extensions based on original format
    const basePath = "custom/spec";

    const apiVersion: ApiGuruApiVersion = {
      added,
      updated: added,
      info: {
        ...info,
        "x-providerName": "custom",
        "x-apisguru-categories": info["x-apisguru-categories"] || ["custom"],
      },
      swaggerUrl: `${basePath}.json`,
      swaggerYamlUrl: `${basePath}.yaml`,
      openapiVer: spec.openapi || spec.swagger || "3.0.0",
      link: info.contact?.url || "",
      externalDocs: spec.externalDocs,
    };

    return {
      added,
      preferred: version,
      versions: {
        [version]: apiVersion,
      },
    };
  }

  /**
   * Extract metadata from spec
   */
  private extractMetadata(
    spec: any,
    fileSize: number,
  ): { title: string; description: string; version: string; fileSize: number } {
    const info = spec.info || {};

    return {
      title: info.title || "Untitled API",
      description: info.description || "",
      version: info.version || "1.0.0",
      fileSize,
    };
  }

  /**
   * Create empty security scan for when security is skipped
   */
  private createEmptySecurityScan() {
    return {
      scannedAt: new Date().toISOString(),
      issues: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0 },
      blocked: false,
    };
  }

  /**
   * Get security scanner instance for external use
   */
  getSecurityScanner(): SecurityScanner {
    return this.securityScanner;
  }

  /**
   * Validate a spec without full processing (for quick checks)
   */
  async quickValidate(
    source: string,
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    try {
      let content: string;

      if (this.isUrl(source)) {
        content = await this.fetchFromUrl(source);
      } else {
        content = this.readFromFile(source);
      }

      const format = this.detectFormat(content);
      const spec = this.parseContent(content, format);

      return await this.validateOpenAPISpec(spec);
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : "Unknown error"],
        warnings: [],
      };
    }
  }

  /**
   * Convert spec to normalized JSON string
   */
  toNormalizedJSON(spec: any): string {
    return JSON.stringify(spec, null, 2);
  }
}
