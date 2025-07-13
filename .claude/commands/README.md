# Claude Command Suite - Namespace Organization

Welcome to the Claude Command Suite! This collection of commands is organized into logical namespaces to help you quickly find the right tool for your task.

## Command Namespaces

### 🚀 `/project:*` - Project Management
Initialize, configure, and manage projects. Includes commands for creating new projects, adding packages, tracking milestones, and monitoring project health.

### 💻 `/dev:*` - Development Tools
Essential development utilities including code review, debugging, refactoring, and specialized AI modes (prime, sentient, ultra-think) for enhanced assistance.

### 🧪 `/test:*` - Testing Suite
Comprehensive testing tools covering unit tests, integration tests, E2E tests, coverage analysis, mutation testing, and visual regression testing.

### 🔒 `/security:*` - Security & Compliance
Security auditing, dependency scanning, authentication implementation, and security hardening tools to keep your codebase secure.

### ⚡ `/performance:*` - Performance Optimization
Tools for optimizing build times, bundle sizes, database queries, caching strategies, and overall application performance.

### 🔄 `/sync:*` - Integration & Synchronization
Bidirectional sync between GitHub Issues and Linear, PR tracking, conflict resolution, and cross-platform task management.

### 📦 `/deploy:*` - Deployment & Release
Release preparation, automated deployments, rollback capabilities, containerization, and Kubernetes deployment management.

### 📚 `/docs:*` - Documentation Generation
Automated documentation tools for APIs, architecture diagrams, onboarding guides, and troubleshooting documentation.

### 🔧 `/setup:*` - Configuration & Setup
Initial setup commands for development environments, linting, formatting, monitoring, database schemas, and API design.

### 👥 `/team:*` - Team Collaboration
Team workflow tools including standup reports, sprint planning, retrospectives, workload balancing, and knowledge capture.

## Usage

Commands follow the namespace pattern: `/<namespace>:<command>`

For example:
- `/project:init-project` - Initialize a new project
- `/dev:code-review` - Perform a code review
- `/test:generate-test-cases` - Generate test cases
- `/security:security-audit` - Run a security audit

## Quick Start

1. **Starting a new project?** Begin with `/project:init-project`
2. **Need to debug?** Try `/dev:debug-error`
3. **Writing tests?** Use `/test:generate-test-cases`
4. **Security concerns?** Run `/security:security-audit`
5. **Performance issues?** Check `/performance:performance-audit`

## Finding Commands

Each namespace directory contains a README.md with detailed descriptions of available commands. Navigate to any namespace folder to see its specific commands and their purposes.

## Command Availability

Commands are loaded from:
- **Project-level**: `.claude/commands/` (this directory)
- **User-level**: `~/.claude/commands/` (your personal commands)

Project-level commands take precedence when there are naming conflicts.