# Pre-flight Check System

## Overview

The pre-flight check system provides fast, early detection of common issues before they reach the expensive CI/CD pipeline. It's designed to fail fast with specific, actionable error messages.

## Philosophy

1. **Fail Fast, Fail Cheap** - Catch issues in seconds, not minutes
2. **Specific Errors** - Tell developers exactly what's wrong and how to fix it
3. **Self-Adjusting** - No hardcoded numbers, derives truth from the codebase
4. **Linear Complexity** - Each check is independent for easy debugging

## Running Pre-flight Checks

```bash
# Run all pre-flight checks
npm run preflight

# Typical output when all checks pass:
🚀 Running Pre-flight Checks

Checking Build Output... ✅ (0ms)
   All build directories present
Checking Tool Exposure... ✅ (83ms)
   All 22 tools properly exposed
Checking Prompt Exposure... ✅ (63ms)
   All 23 prompts properly exposed
Checking Mock Validation... ✅ (1032ms)
   All mocks properly implement required methods
Checking TypeScript... ✅ (1635ms)
   TypeScript compilation successful
Checking ESLint... ✅ (1309ms)
   No linting errors or warnings

============================================================
✅ All pre-flight checks passed!
Ready for CI/CD pipeline execution.
```

## Available Checks

### 1. Build Output Check
- **What it checks**: Ensures `dist/` directory exists with required subdirectories
- **Common failure**: Forgetting to run `npm run build`
- **Fix**: `npm run build`

### 2. Tool Exposure Check
- **What it checks**: Counts tool files in `dist/tools/*/` and verifies they're all exposed via ToolHandler
- **Common failure**: Missing tool category in `src/tools/generator.ts`
- **Fix**: Ensure all tool categories are included in `generateTools()`
- **Self-adjusting**: Automatically adjusts expected count based on actual files

### 3. Prompt Exposure Check
- **What it checks**: Counts prompt files in `dist/prompts/*/` and verifies they're all exposed via PromptHandler
- **Common failure**: Missing prompt category in loader
- **Fix**: Ensure all prompt categories are included in the loader
- **Self-adjusting**: Automatically adjusts expected count based on actual files

### 4. Mock Validation Check
- **What it checks**: Runs mock validation tests to ensure test doubles implement all required methods
- **Common failure**: Adding new methods to API clients without updating mocks
- **Fix**: Update mock implementations in test files
- **Why it matters**: Prevents integration test failures due to incomplete mocks

### 5. TypeScript Check
- **What it checks**: Runs `tsc --noEmit` to validate TypeScript compilation
- **Common failure**: Type errors in code
- **Fix**: `npm run typecheck` and fix all errors

### 6. ESLint Check
- **What it checks**: Runs ESLint with zero warnings tolerance
- **Common failure**: Unused variables, formatting issues
- **Fix**: `npm run lint:fix` for auto-fixable issues

## Error Messages

Each check provides specific, actionable error messages:

```bash
❌ PRE-FLIGHT FAILED: Tool exposure mismatch
Expected: 22 tools (based on file count)
Actually exposed: 17 tools
Check: src/tools/generator.ts - ensure all tool categories are included
```

## CI/CD Integration

The pre-flight checks run as the first job in our CI/CD pipeline:

```yaml
jobs:
  preflight:
    name: Pre-flight Checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - run: npm run preflight
  
  # All other jobs depend on preflight passing
  test:
    needs: preflight
    # ...
```

## Git Hooks

For local development, you can install a pre-push hook:

```bash
# Install git hooks
./scripts/install-hooks.sh

# The pre-push hook will:
# 1. Run pre-flight checks before pushing
# 2. Block the push if checks fail
# 3. Provide specific fix instructions

# To bypass in emergencies (not recommended):
git push --no-verify
```

## Implementation Details

The pre-flight system is implemented in `scripts/preflight-checks.js` using:

- **ES Modules** for modern JavaScript
- **Class-based checks** for extensibility
- **ANSI colors** for better readability
- **Async/await** for clean async code
- **Child process exec** for running Node checks

### Adding New Checks

To add a new pre-flight check:

1. Create a new class extending `PreflightCheck`:

```javascript
class MyNewCheck extends PreflightCheck {
  constructor() {
    super('My Check Name', 'What this check validates');
  }

  async run() {
    try {
      // Perform your check
      if (everythingIsGood) {
        return this.pass('Optional success message');
      } else {
        return this.fail(
          'Specific error message\n' +
          'What went wrong\n' +
          'How to fix it'
        );
      }
    } catch (error) {
      return this.fail(`Check failed: ${error.message}`);
    }
  }
}
```

2. Add it to the checks array in `runPreflightChecks()`

## Benefits

1. **Time Savings**: Developers get feedback in ~5 seconds instead of waiting for full CI/CD
2. **Cost Savings**: Avoided CI/CD runs save compute resources
3. **Better DX**: Clear, actionable errors improve developer experience
4. **Knowledge Capture**: Each check encodes a lesson learned from a real bug
5. **Confidence**: If pre-flight passes, CI/CD is likely to pass too

## Common Patterns Caught

Based on real issues encountered:

1. **Missing Tool Exposure**: When `generateUtilityTools()` wasn't called in generator
2. **Incomplete Mocks**: When new methods added to clients without updating test mocks
3. **Build Artifacts**: When changes made without rebuilding
4. **Type Errors**: When TypeScript errors would fail CI/CD
5. **Lint Issues**: When code style violations would fail quality gates

## Troubleshooting

### All checks pass locally but CI/CD fails

1. Ensure you've pushed all changes: `git status`
2. Check Node version matches CI: `node --version` (should be 18+)
3. Clean install dependencies: `rm -rf node_modules && npm ci`
4. Full rebuild: `npm run build`

### Pre-flight takes too long

Some checks can be run in parallel. Current implementation runs sequentially for clear output, but this could be optimized if needed.

### Check fails without clear reason

Run with Node debugging:
```bash
NODE_ENV=development npm run preflight
```

Or check the specific test that's failing:
```bash
npm test tests/unit/test-infrastructure/mock-validation.test.ts
```