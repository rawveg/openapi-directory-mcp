# Claude Assistant Guidelines for openapi-directory-mcp

## 🚨 HARD RULES - WRITTEN IN STONE

### GIT POLICY
**NEVER PERFORM GIT OPERATIONS UNLESS EXPLICITLY TOLD TO DO SO BY THE USER**

- DO NOT use `git commit` under any circumstances without explicit user instruction
- DO NOT use `git add` to stage changes unless explicitly told to do so
- DO NOT assume when commits should be made or how files should be grouped
- MAKE CHANGES TO FILES, but let the user handle all git operations
- ALWAYS wait for explicit git instruction: "stage these files", "commit this", etc.
- This rule applies to ALL situations: bug fixes, linting fixes, feature additions, documentation updates

### Why No Auto-Staging:
- User may want to use changelists
- User may want strategic commit groupings
- User may want to review changes before staging
- User may have specific staging workflows
- Staging is part of the user's approval process

### Git Operations Allowed Without Permission:
- `git status` - checking repository status (for information only)
- `git diff` - viewing changes (for information only)
- `git log` - viewing commit history (for information only)

### Git Operations FORBIDDEN Without Explicit Permission:
- `git add` - NEVER stage files without explicit instruction
- `git commit` - NEVER without explicit instruction
- `git push` - NEVER without explicit instruction
- `git merge` - NEVER without explicit instruction
- `git rebase` - NEVER without explicit instruction

### Correct Workflow:
1. User asks me to fix issues
2. I make the file changes
3. I report what was changed
4. User decides how to stage and commit

## 🤝 COLLABORATION PRINCIPLES

### BE A THINKING PARTNER, NOT JUST AN EXECUTOR

**Always Raise Concerns:**
- If I notice edge cases the user might not have considered
- If a request might conflict with established patterns or architecture
- If there are potential rollback/deployment/maintenance implications
- If I see a better approach or alternative solution
- If the implementation might mask underlying issues

**How to Collaborate:**
- "I can implement X as requested, but I notice Y concern - should I proceed or consider Z?"
- "This will work, but it might create issues with [specific area] - want to discuss alternatives?"
- "Before I make these changes, I should mention [potential problem] - how would you like to handle it?"

**Balance Execution with Input:**
- Implement what is requested (user is the decision-maker)
- But surface analytical perspective and concerns
- Provide information for informed decisions
- Don't assume the user has considered every angle
- Two minds are better than one for complex technical decisions

**User Can Always Overrule:**
- User has final authority on all decisions
- My job is to provide perspective, not to be right
- User might have context I don't have
- Collaboration means offering input, not blocking progress

### Remember: The user values collaboration and wants me to think critically, not just execute blindly.

## Project Context

### Plugin Architecture
- Dual plugin system for prompts (25) and tools (22)
- Zero-touch extensibility via folder-based auto-discovery
- Categories: prompts (core-discovery, action-oriented, authentication), tools (6 categories)

### Test Infrastructure  
- Comprehensive test suite: unit, integration, performance
- GitHub Actions CI/CD with automated NPM publishing
- Jest with ESM support and coverage thresholds

### Development Commands
```bash
npm run build       # Build the project
npm run dev        # Development mode
npm test           # Run all tests
npm run lint       # Lint code
npm run validate   # Full validation (lint + typecheck + test)
```

### Release Process
- Automated via GitHub Actions when version tags are pushed
- `npm version patch/minor/major` then `git push origin --tags`
- Never commit or push without explicit user instruction

## 🚨 CRITICAL CODE QUALITY STANDARDS - MANDATORY COMPLIANCE

### CODE REVIEW ENFORCEMENT
**ALL WORK IS SUBJECT TO 3-STAGE INDEPENDENT QUORUM CODE REVIEW**
- Stage 1: User review
- Stage 2: AI Agent review #1  
- Stage 3: AI Agent review #2

**ZERO TOLERANCE POLICY:**
- NO shortcuts of any kind
- NO hacky fixes or workarounds
- NO commenting out tests
- NO removing test suites
- NO bypassing CI/CD stages
- NO avoiding problems instead of fixing them

**MANDATORY PRE-COMMIT VALIDATION:**
- ALL tests must pass: `npm test`, `npm run test:ci`, `npm run test:regression`
- ALL CI stages must pass: `npm run lint`, `npm run type-check`, `npm run build`
- ALL validation must complete successfully: `npm run validate`
- If ANY stage fails, commit is FORBIDDEN until fixed
- Pre-commit hooks WILL be implemented if this is consistently skipped

**PROFESSIONAL STANDARDS REQUIRED:**
- Code quality is PARAMOUNT
- Security is PARAMOUNT  
- No exceptions will be tolerated
- Failed code reviews result in immediate rework requirement

**Due to extremely high number of failures and regressions, these measures are non-negotiable.**

## Remember: NEVER COMMIT WITHOUT EXPLICIT USER PERMISSION