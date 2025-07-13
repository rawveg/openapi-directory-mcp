/**
 * Context-aware security scanner for OpenAPI specifications
 * Detects potential prompt injection, script injection, and other security issues
 */

import { SecurityRule, SecurityIssue, SecurityScanResult } from "./types.js";
import * as xss from "xss";

export class SecurityScanner {
  private rules: SecurityRule[];

  constructor() {
    this.rules = this.initializeRules();
  }

  /**
   * Scan an OpenAPI spec for security issues
   */
  async scanSpec(spec: any): Promise<SecurityScanResult> {
    const issues: SecurityIssue[] = [];
    const scannedAt = new Date().toISOString();

    // Recursively scan the entire spec object
    this.scanObject(spec, "", issues);

    // Calculate summary
    const summary = {
      critical: issues.filter((i) => i.severity === "critical").length,
      high: issues.filter((i) => i.severity === "high").length,
      medium: issues.filter((i) => i.severity === "medium").length,
      low: issues.filter((i) => i.severity === "low").length,
    };

    // Determine if critical issues block import
    const blocked = summary.critical > 0;

    return {
      scannedAt,
      issues,
      summary,
      blocked,
    };
  }

  /**
   * Recursively scan an object for security issues
   */
  private scanObject(obj: any, path: string, issues: SecurityIssue[]): void {
    if (obj === null || obj === undefined) {
      return;
    }

    if (typeof obj === "string") {
      this.scanString(obj, path, issues);
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        this.scanObject(item, `${path}[${index}]`, issues);
      });
    } else if (typeof obj === "object") {
      Object.entries(obj).forEach(([key, value]) => {
        const newPath = path ? `${path}.${key}` : key;
        this.scanObject(value, newPath, issues);
      });
    }
  }

  /**
   * Scan a string value for security issues
   */
  private scanString(
    value: string,
    location: string,
    issues: SecurityIssue[],
  ): void {
    const context = this.determineContext(location);

    for (const rule of this.rules) {
      // Check if this rule applies to the current context
      if (!rule.contexts.includes(context)) {
        continue;
      }

      // Check if pattern matches using custom detect function or regex pattern
      let isMatch = false;
      if (rule.detect) {
        isMatch = rule.detect(value);
      } else if (rule.pattern) {
        isMatch = rule.pattern.test(value);
      } else {
        // Rule must have either detect function or pattern
        continue;
      }

      if (isMatch) {
        // For pattern capture - use detect function result or regex match
        let patternText: string;
        if (rule.detect) {
          // When using detect function, show summary
          if (rule.id === "script-tag-injection") {
            patternText = "Script tags detected by XSS filter";
          } else {
            patternText = "Detected by custom function";
          }
        } else if (rule.pattern) {
          const match = rule.pattern.exec(value);
          patternText = match?.[0] || value;
        } else {
          patternText = "Pattern detected";
        }

        // Special handling for examples context
        if (context === "example" && rule.allowInExamples) {
          // Reduce severity for legitimate examples
          const adjustedSeverity = this.adjustSeverityForExamples(
            rule.severity,
          );

          const baseIssue = {
            type: rule.type,
            severity: adjustedSeverity,
            location,
            context,
            pattern: patternText,
            message: `${rule.message} (in example context)`,
            ruleId: rule.id,
          };

          issues.push(
            rule.suggestion
              ? { ...baseIssue, suggestion: rule.suggestion }
              : baseIssue,
          );
        } else {
          const baseIssue = {
            type: rule.type,
            severity: rule.severity,
            location,
            context,
            pattern: patternText,
            message: rule.message,
            ruleId: rule.id,
          };

          issues.push(
            rule.suggestion
              ? { ...baseIssue, suggestion: rule.suggestion }
              : baseIssue,
          );
        }
      }
    }
  }

  /**
   * Determine the context based on the JSON path
   */
  private determineContext(path: string): SecurityIssue["context"] {
    const lowerPath = path.toLowerCase();

    if (lowerPath.includes("example") || lowerPath.includes("examples")) {
      return "example";
    }

    if (lowerPath.includes("description") || lowerPath.includes("summary")) {
      return "description";
    }

    if (
      lowerPath.includes("parameter") ||
      lowerPath.includes("headers") ||
      lowerPath.includes("query") ||
      lowerPath.includes("path")
    ) {
      return "parameter";
    }

    if (
      lowerPath.includes("schema") ||
      lowerPath.includes("properties") ||
      lowerPath.includes("items") ||
      lowerPath.includes("additionalproperties")
    ) {
      return "schema";
    }

    return "metadata";
  }

  /**
   * Adjust severity for examples context
   */
  private adjustSeverityForExamples(
    severity: SecurityIssue["severity"],
  ): SecurityIssue["severity"] {
    switch (severity) {
      case "critical":
        return "high";
      case "high":
        return "medium";
      case "medium":
        return "low";
      case "low":
        return "low";
      default:
        return severity;
    }
  }

  /**
   * Initialize security scanning rules
   */
  private initializeRules(): SecurityRule[] {
    return [
      // Script injection patterns
      {
        id: "script-tag-injection",
        detect: (content: string) => {
          // Check if content has script tags by comparing filtered vs original
          const filtered = xss.filterXSS(content);
          return (
            content !== filtered && content.toLowerCase().includes("<script")
          );
        },
        type: "script_injection",
        severity: "high",
        contexts: ["description", "example", "parameter"],
        message: "Script tag detected - potential XSS vector",
        suggestion: "Remove script tags or escape HTML content",
        description: "Detects HTML script tags that could be used for XSS",
      },
      {
        id: "javascript-protocol",
        pattern: /javascript:/gi,
        type: "script_injection",
        severity: "high",
        contexts: ["description", "example", "parameter", "schema"],
        message: "JavaScript protocol detected",
        suggestion: "Use HTTPS URLs instead of javascript: protocol",
        description:
          "Detects javascript: protocol which can execute arbitrary code",
      },
      {
        id: "eval-function",
        pattern: /\beval\s*\(/gi,
        type: "eval_usage",
        severity: "medium",
        contexts: ["description", "example", "parameter", "schema"],
        allowInExamples: true,
        message: "eval() function detected",
        suggestion: "Avoid eval() - use safer alternatives like JSON.parse()",
        description: "Detects eval() function which can execute arbitrary code",
      },
      {
        id: "function-constructor",
        pattern: /new\s+Function\s*\(/gi,
        type: "eval_usage",
        severity: "medium",
        contexts: ["description", "example", "parameter", "schema"],
        allowInExamples: true,
        message: "Function constructor detected",
        suggestion: "Avoid Function constructor - use safer alternatives",
        description:
          "Detects Function constructor which can execute arbitrary code",
      },

      // Prompt injection patterns
      {
        id: "prompt-instruction-override",
        pattern:
          /ignore\s+(previous|above|all)\s+(instructions?|prompts?|rules?)/gi,
        type: "prompt_injection",
        severity: "high",
        contexts: ["description", "example", "parameter"],
        message: "Prompt instruction override detected",
        suggestion:
          "Remove or rephrase content that attempts to override system instructions",
        description: "Detects attempts to override AI system instructions",
      },
      {
        id: "role-injection",
        pattern:
          /(act\s+as|you\s+are\s+now|forget\s+you\s+are|pretend\s+to\s+be)/gi,
        type: "prompt_injection",
        severity: "medium",
        contexts: ["description", "example"],
        message: "Role injection pattern detected",
        suggestion: "Rephrase to avoid role manipulation language",
        description: "Detects attempts to manipulate AI role or behavior",
      },
      {
        id: "system-prompt-leak",
        pattern:
          /(show\s+me\s+your|what\s+are\s+your)\s+(system\s+)?(prompt|instructions|rules)/gi,
        type: "prompt_injection",
        severity: "medium",
        contexts: ["description", "example", "parameter"],
        message: "System prompt leak attempt detected",
        suggestion: "Remove attempts to extract system prompts",
        description:
          "Detects attempts to extract system prompts or instructions",
      },

      // Suspicious content patterns
      {
        id: "data-exfiltration",
        pattern:
          /(send\s+to|POST\s+to|transmit\s+to)\s+[a-zA-Z0-9\-.]+\.(com|net|org|io)/gi,
        type: "suspicious_content",
        severity: "medium",
        contexts: ["description", "example"],
        message: "Potential data exfiltration pattern detected",
        suggestion: "Review if external data transmission is intentional",
        description: "Detects patterns that might indicate data exfiltration",
      },
      {
        id: "credential-exposure",
        pattern: /(password|secret|key|token)\s*[:=]\s*["']?[a-zA-Z0-9]{8,}/gi,
        type: "suspicious_content",
        severity: "critical",
        contexts: ["example", "parameter", "schema"],
        message: "Potential credential exposure detected",
        suggestion: 'Replace with placeholder values like "your_api_key_here"',
        description: "Detects potential hardcoded credentials",
      },
      {
        id: "base64-encoded-script",
        pattern: /[a-zA-Z0-9+/]{20,}={0,2}/g,
        type: "suspicious_content",
        severity: "low",
        contexts: ["example", "parameter"],
        message: "Potential Base64 encoded content detected",
        suggestion: "Review Base64 content to ensure it's not malicious",
        description:
          "Detects Base64 encoded content that might hide malicious payloads",
      },

      // HTML/XML injection
      {
        id: "html-injection",
        pattern: /<[^>]+>/g,
        type: "script_injection",
        severity: "low",
        contexts: ["description", "example"],
        message: "HTML tags detected",
        suggestion: "Escape HTML content or use plain text",
        description: "Detects HTML tags that might be used for injection",
      },
    ];
  }

  /**
   * Get all available security rules
   */
  getRules(): SecurityRule[] {
    return [...this.rules];
  }

  /**
   * Add a custom security rule
   */
  addRule(rule: SecurityRule): void {
    this.rules.push(rule);
  }

  /**
   * Generate a human-readable security report
   */
  generateReport(scanResult: SecurityScanResult): string {
    const { issues, summary, blocked } = scanResult;

    let report = `🔒 Security Scan Report\n`;
    report += `Scanned at: ${new Date(scanResult.scannedAt).toLocaleString()}\n\n`;

    if (issues.length === 0) {
      report += `✅ No security issues found\n`;
      return report;
    }

    // Summary
    report += `📊 Summary:\n`;
    if (summary.critical > 0)
      report += `  🚨 ${summary.critical} critical issue(s)\n`;
    if (summary.high > 0)
      report += `  ❗ ${summary.high} high severity issue(s)\n`;
    if (summary.medium > 0)
      report += `  ⚠️  ${summary.medium} medium severity issue(s)\n`;
    if (summary.low > 0)
      report += `  ℹ️  ${summary.low} low severity issue(s)\n`;

    if (blocked) {
      report += `\n🛑 Import blocked due to critical security issues\n`;
    }

    // Detailed issues
    report += `\n🔍 Detailed Issues:\n`;

    // Group by severity
    const groupedIssues = {
      critical: issues.filter((i) => i.severity === "critical"),
      high: issues.filter((i) => i.severity === "high"),
      medium: issues.filter((i) => i.severity === "medium"),
      low: issues.filter((i) => i.severity === "low"),
    };

    for (const [severity, severityIssues] of Object.entries(groupedIssues)) {
      if (severityIssues.length === 0) continue;

      const icon = {
        critical: "🚨",
        high: "❗",
        medium: "⚠️",
        low: "ℹ️",
      }[severity];

      report += `\n${icon} ${severity.toUpperCase()} SEVERITY:\n`;

      severityIssues.forEach((issue, index) => {
        report += `  ${index + 1}. ${issue.message}\n`;
        report += `     Location: ${issue.location}\n`;
        report += `     Context: ${issue.context}\n`;
        report += `     Pattern: "${issue.pattern}"\n`;
        if (issue.suggestion) {
          report += `     Suggestion: ${issue.suggestion}\n`;
        }
        report += `\n`;
      });
    }

    return report;
  }
}
