#!/usr/bin/env node

/**
 * Pre-flight checks for CI/CD pipeline
 * Fails fast with specific error messages for known failure patterns
 */

import { promises as fs } from 'fs';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ANSI color codes for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

/**
 * Safely execute Node.js with a file using spawn to avoid shell injection
 */
function execNodeFile(filePath, cwd = projectRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [filePath], { 
      cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('error', (error) => {
      reject(error);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`Command failed with exit code ${code}`);
        error.stdout = stdout;
        error.stderr = stderr;
        error.code = code;
        reject(error);
      }
    });
  });
}

class PreflightCheck {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.passed = false;
    this.message = '';
  }

  async run() {
    throw new Error('run() must be implemented by subclass');
  }

  pass(message = '') {
    this.passed = true;
    this.message = message;
    return true;
  }

  fail(message) {
    this.passed = false;
    this.message = message;
    return false;
  }
}

/**
 * Check 1: Verify build output exists
 */
class BuildOutputCheck extends PreflightCheck {
  constructor() {
    super('Build Output', 'Ensures project is built');
  }

  async run() {
    try {
      await fs.access(path.join(projectRoot, 'dist'));
      
      // Check for key directories
      const requiredDirs = ['dist/tools', 'dist/prompts', 'dist/api', 'dist/cache'];
      for (const dir of requiredDirs) {
        try {
          await fs.access(path.join(projectRoot, dir));
        } catch {
          return this.fail(`Missing required directory: ${dir}\nRun: npm run build`);
        }
      }
      
      return this.pass('All build directories present');
    } catch {
      return this.fail('Build output missing\nRun: npm run build');
    }
  }
}

/**
 * Check 2: Tool exposure validation
 */
class ToolExposureCheck extends PreflightCheck {
  constructor() {
    super('Tool Exposure', 'Validates all tool files are exposed');
  }

  async run() {
    try {
      // Count expected tools from filesystem
      const toolDirs = [
        'provider-tools',
        'api-details', 
        'api-discovery',
        'cache-tools',
        'endpoint-tools',
        'utility-tools'
      ];
      
      let expectedCount = 0;
      for (const dir of toolDirs) {
        const dirPath = path.join(projectRoot, 'dist/tools', dir);
        try {
          const files = await fs.readdir(dirPath);
          const jsFiles = files.filter(f => 
            f.endsWith('.js') && 
            !f.endsWith('.d.ts') && 
            !f.endsWith('.map') &&
            f !== 'index.js'
          );
          expectedCount += jsFiles.length;
        } catch {
          // Directory might not exist, continue
        }
      }

      // Create temporary .mjs file to check tool exposure
      const tempFile = path.join(projectRoot, '.temp-check-tools.mjs');
      const checkScript = `
import { ToolHandler } from './dist/tools/handler.js';
const handler = new ToolHandler();
const { tools } = await handler.listTools();
console.log(tools.length);
`;
      
      await fs.writeFile(tempFile, checkScript);
      
      try {
        const { stdout } = await execNodeFile(tempFile, projectRoot);
        const actualCount = parseInt(stdout.trim());

        if (actualCount !== expectedCount) {
          return this.fail(
            `Tool exposure mismatch\n` +
            `Expected: ${expectedCount} tools (based on file count)\n` +
            `Actually exposed: ${actualCount} tools\n` +
            `Check: src/tools/generator.ts - ensure all tool categories are included`
          );
        }

        return this.pass(`All ${actualCount} tools properly exposed`);
      } finally {
        // Clean up temp file
        await fs.unlink(tempFile).catch(() => {});
      }
    } catch (error) {
      return this.fail(`Failed to check tool exposure: ${error.message}`);
    }
  }
}

/**
 * Check 3: Prompt exposure validation
 */
class PromptExposureCheck extends PreflightCheck {
  constructor() {
    super('Prompt Exposure', 'Validates all prompt files are exposed');
  }

  async run() {
    try {
      // Count expected prompts from filesystem
      const promptDirs = ['core-discovery', 'action-oriented', 'authentication'];
      
      let expectedCount = 0;
      for (const dir of promptDirs) {
        const dirPath = path.join(projectRoot, 'dist/prompts', dir);
        try {
          const files = await fs.readdir(dirPath);
          const jsFiles = files.filter(f => 
            f.endsWith('.js') && 
            !f.endsWith('.d.ts') && 
            !f.endsWith('.map') &&
            f !== 'index.js'
          );
          expectedCount += jsFiles.length;
        } catch {
          // Directory might not exist, continue
        }
      }

      // Create temporary .mjs file to check prompt exposure
      const tempFile = path.join(projectRoot, '.temp-check-prompts.mjs');
      const checkScript = `
import { PromptHandler } from './dist/prompts/handler.js';
const handler = new PromptHandler();
const { prompts } = await handler.listPrompts();
console.log(prompts.length);
`;
      
      await fs.writeFile(tempFile, checkScript);
      
      try {
        const { stdout } = await execNodeFile(tempFile, projectRoot);
        const actualCount = parseInt(stdout.trim());

        if (actualCount !== expectedCount) {
          return this.fail(
            `Prompt exposure mismatch\n` +
            `Expected: ${expectedCount} prompts (based on file count)\n` +
            `Actually exposed: ${actualCount} prompts\n` +
            `Check: src/prompts/loader.ts - ensure all prompt categories are included`
          );
        }

        return this.pass(`All ${actualCount} prompts properly exposed`);
      } finally {
        // Clean up temp file
        await fs.unlink(tempFile).catch(() => {});
      }
    } catch (error) {
      return this.fail(`Failed to check prompt exposure: ${error.message}`);
    }
  }
}

/**
 * Check 4: Mock validation
 */
class MockValidationCheck extends PreflightCheck {
  constructor() {
    super('Mock Validation', 'Ensures test mocks implement required methods');
  }

  async run() {
    try {
      const { stdout, stderr } = await execAsync(
        'npm test -- tests/unit/test-infrastructure/mock-validation.test.ts --silent',
        { cwd: projectRoot }
      );

      if (stderr && stderr.includes('FAIL')) {
        return this.fail(
          'Mock validation failed\n' +
          'Test mocks are missing required methods\n' +
          'This will cause integration tests to fail\n' +
          'Run locally: npm test tests/unit/test-infrastructure/mock-validation.test.ts'
        );
      }

      return this.pass('All mocks properly implement required methods');
    } catch (error) {
      // Check if it's just that the test doesn't exist yet
      if (error.message.includes('no tests found')) {
        return this.pass('Mock validation test not yet implemented');
      }
      return this.fail(`Mock validation check failed: ${error.message}`);
    }
  }
}

/**
 * Check 5: TypeScript compilation
 */
class TypeScriptCheck extends PreflightCheck {
  constructor() {
    super('TypeScript', 'Validates TypeScript compilation');
  }

  async run() {
    try {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit', { cwd: projectRoot });
      
      if (stderr || stdout) {
        return this.fail(
          'TypeScript compilation errors\n' +
          'Run: npm run typecheck\n' +
          'Fix all TypeScript errors before committing'
        );
      }

      return this.pass('TypeScript compilation successful');
    } catch (error) {
      return this.fail(`TypeScript check failed:\n${error.message}`);
    }
  }
}

/**
 * Check 6: Lint validation
 */
class LintCheck extends PreflightCheck {
  constructor() {
    super('ESLint', 'Validates code style and quality');
  }

  async run() {
    try {
      const { stdout } = await execAsync('npm run lint -- --max-warnings 0', { cwd: projectRoot });
      return this.pass('No linting errors or warnings');
    } catch (error) {
      return this.fail(
        'Linting errors found\n' +
        'Run: npm run lint\n' +
        'Fix all linting errors before committing'
      );
    }
  }
}

// Main execution
async function runPreflightChecks() {
  console.log(`${colors.blue}🚀 Running Pre-flight Checks${colors.reset}\n`);

  const checks = [
    new BuildOutputCheck(),
    new ToolExposureCheck(),
    new PromptExposureCheck(),
    new MockValidationCheck(),
    new TypeScriptCheck(),
    new LintCheck()
  ];

  let allPassed = true;
  const results = [];

  // Run checks sequentially for clear output
  // NOTE: Intentionally sequential rather than parallel because:
  // 1. Total runtime is ~5 seconds - parallelization overhead not worth it
  // 2. Clear, readable output is more valuable for debugging failures
  // 3. Some checks may have interdependencies (e.g., build must exist before checking tools)
  // 4. CI/CD logs are easier to read with sequential output
  // 
  // If performance becomes an issue (>30s total), consider:
  // - Running independent checks in parallel (TypeScript, ESLint, Mock validation)
  // - Keeping dependent checks sequential (Build -> Tool/Prompt exposure)
  for (const check of checks) {
    process.stdout.write(`Checking ${check.name}... `);
    
    const startTime = Date.now();
    await check.run();
    const duration = Date.now() - startTime;

    if (check.passed) {
      console.log(`${colors.green}✅${colors.reset} (${duration}ms)`);
      if (check.message) {
        console.log(`   ${colors.green}${check.message}${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}❌${colors.reset} (${duration}ms)`);
      allPassed = false;
    }

    results.push(check);
  }

  console.log('\n' + '='.repeat(60));

  if (allPassed) {
    console.log(`${colors.green}✅ All pre-flight checks passed!${colors.reset}`);
    console.log('Ready for CI/CD pipeline execution.');
    process.exit(0);
  } else {
    console.log(`${colors.red}❌ Pre-flight checks failed!${colors.reset}\n`);
    
    // Show detailed failure information
    for (const check of results) {
      if (!check.passed) {
        console.log(`${colors.red}Failed: ${check.name}${colors.reset}`);
        console.log(`${check.message.split('\n').map(line => '  ' + line).join('\n')}`);
        console.log();
      }
    }

    console.log(`${colors.yellow}Fix the above issues before pushing to CI/CD.${colors.reset}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${__filename}`) {
  runPreflightChecks().catch(error => {
    console.error(`${colors.red}Unexpected error:${colors.reset}`, error);
    process.exit(1);
  });
}

export { runPreflightChecks };