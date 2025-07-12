# Contributing to OpenAPI Directory MCP

Thank you for your interest in contributing to the OpenAPI Directory MCP server! This project features a unique **dual plugin architecture** that makes contributions incredibly easy and scalable.

## 🚀 Quick Start for Contributors

### Prerequisites
- Node.js 18+ 
- TypeScript knowledge
- Basic understanding of Model Context Protocol (MCP)

### Development Setup
```bash
# Clone the repository
git clone https://github.com/rawveg/openapi-directory-mcp.git
cd openapi-directory-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

---

## 🔧 Plugin Architecture Overview

This project uses a **zero-touch plugin architecture** for both prompts and tools. Adding new functionality requires **no code changes** - just drop files in the right folders!

### 📁 Project Structure

```
src/
├── prompts/                 # Prompt plugins (25 prompts across 3 categories)
│   ├── core-discovery/      # API discovery and analysis (8 prompts)
│   ├── action-oriented/     # Code generation and automation (10 prompts)
│   ├── authentication/      # Authentication-focused (5 prompts)
│   ├── loader.ts           # Auto-discovery system
│   └── types.ts            # Prompt interfaces
├── tools/                   # Tool plugins (22 tools across 6 categories)
│   ├── api-discovery/       # Core API discovery (4 tools)
│   ├── api-details/         # Detailed API information (5 tools)
│   ├── endpoint-tools/      # Endpoint analysis (4 tools)
│   ├── cache-tools/         # Cache management (5 tools)
│   ├── provider-tools/      # Provider-specific (1 tool)
│   ├── utility-tools/       # Analysis utilities (3 tools)
│   ├── loader.ts           # Auto-discovery system
│   └── types.ts            # Tool interfaces
└── api/                     # Core API clients and utilities
```

---

---

## 📋 Development Workflow & Release Process

### Pull Request Process

1. **Fork and Branch**:
   ```bash
   # Fork the repository on GitHub
   git clone https://github.com/yourusername/openapi-directory-mcp.git
   cd openapi-directory-mcp
   
   # Create feature branch
   git checkout -b feature/my-new-feature
   ```

2. **Make Changes**:
   - Follow the plugin architecture patterns below
   - Add tests for new functionality
   - Update documentation if needed

3. **Test Your Changes**:
   ```bash
   # Run full validation
   npm run validate
   
   # Test specific areas
   npm run test:unit
   npm run test:integration
   npm run lint
   npm run type-check
   ```

4. **Submit Pull Request**:
   - Use the PR template (auto-filled)
   - Ensure all CI checks pass
   - Request review from maintainers

### Release Process

This project uses **automated releases** triggered by version tags:

#### For Maintainers

1. **Prepare Release**:
   ```bash
   # Ensure main is ready
   git checkout main
   git pull origin main
   npm run validate
   ```

2. **Create Release**:
   ```bash
   # Update version (triggers automated workflow)
   npm version patch  # or minor/major
   git push origin --tags
   git push origin main
   ```

3. **Automated Workflow**:
   - ✅ Pre-release validation (tests, build, package validation)
   - ✅ NPM publishing (stable or beta based on version)
   - ✅ GitHub release creation with changelog
   - ✅ Post-release verification

#### For Contributors

- Focus on your feature/fix
- Maintainers handle releases
- Your merged PR will be included in next release

### Branch Protection

The `main` branch is protected:
- ✅ Requires pull requests
- ✅ All CI checks must pass
- ✅ Branches must be up-to-date
- ✅ No direct pushes allowed

---

## ✨ Contributing New Prompts

### 1. Choose the Right Category

| Category | Purpose | Examples |
|----------|---------|----------|
| `core-discovery` | API discovery, analysis, documentation | api-discovery, authentication-guide |
| `action-oriented` | Code generation, automation, tooling | retrofit-api-client, api-test-suite |
| `authentication` | Authentication flows, security | api-auth-implementation, api-auth-flow-generator |

### 2. Create Your Prompt File

```typescript
// src/prompts/core-discovery/my-awesome-prompt.ts
import { PromptTemplate } from '../types.js';

export const prompt: PromptTemplate = {
  name: "my_awesome_prompt",
  description: "A clear, concise description of what this prompt does",
  arguments: [
    {
      name: "api_name",
      description: "Name of the API to analyze",
      required: true
    },
    {
      name: "output_format", 
      description: "Desired output format (json, markdown, etc.)",
      required: false
    }
  ],
  generateMessages: (args) => [
    {
      role: "user",
      content: {
        type: "text",
        text: `Your detailed prompt content here.
        
Use ${args.api_name} for dynamic content.
Include clear instructions and examples.
Be specific about expected outputs.

${args.output_format ? `Format the response as ${args.output_format}.` : ''}`
      }
    }
  ]
};

export default prompt;
```

### 3. Prompt Guidelines

- **Size**: Keep prompts focused (~50-100 lines)
- **Arguments**: Use descriptive names and clear descriptions
- **Content**: Be specific about expected outputs
- **Examples**: Include examples where helpful
- **Validation**: The system automatically validates structure

---

## 🛠️ Contributing New Tools

### 1. Choose the Right Category

| Category | Purpose | Examples |
|----------|---------|----------|
| `api-discovery` | Core API discovery operations | get-providers, list-all-apis |
| `api-details` | Detailed API information | get-api, search-apis |
| `endpoint-tools` | Endpoint-specific analysis | get-endpoints, get-endpoint-details |
| `cache-tools` | Cache management utilities | cache-stats, clear-cache |
| `provider-tools` | Provider-specific operations | get-provider-apis |
| `utility-tools` | Analysis and utility functions | analyze-api-categories |

### 2. Create Your Tool File

```typescript
// src/tools/api-discovery/my-awesome-tool.ts
import { z } from 'zod';
import { ToolDefinition, ToolContext } from '../types.js';

export const tool: ToolDefinition = {
  name: 'my_awesome_tool',
  description: 'A clear description of what this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      api_name: {
        type: 'string',
        description: 'Name of the API to process',
      },
      include_examples: {
        type: 'boolean',
        description: 'Whether to include examples in output',
        default: false,
      },
    },
    required: ['api_name'],
  },
  async execute(args: any, context: ToolContext): Promise<any> {
    // Always validate input with zod
    const schema = z.object({
      api_name: z.string(),
      include_examples: z.boolean().optional().default(false),
    });
    const params = schema.parse(args);
    
    try {
      // Use context.apiClient for API operations
      const apiData = await context.apiClient.getAPI('provider', params.api_name);
      
      // Use context.cacheManager for caching if needed
      const cacheKey = `my-tool:${params.api_name}`;
      const cached = context.cacheManager.get(cacheKey);
      if (cached) return cached;
      
      // Your tool logic here
      const result = {
        api: params.api_name,
        data: apiData,
        examples: params.include_examples ? ['example1', 'example2'] : undefined
      };
      
      // Cache results if appropriate
      context.cacheManager.set(cacheKey, result, 300000); // 5 minutes
      
      return result;
    } catch (error) {
      return {
        error: 'Failed to process API',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

export default tool;
```

### 3. Tool Guidelines

- **Size**: Keep tools focused (~15-50 lines)
- **Validation**: Always use zod for input validation
- **Error Handling**: Include proper error handling
- **Context**: Use `context.apiClient` and `context.cacheManager`
- **Return**: Return structured, useful data
- **Async**: All tools should be async

---

## 📂 Creating New Categories

### For Prompts
```bash
mkdir src/prompts/my-new-category
# Add .ts files following the prompt pattern
```

### For Tools  
```bash
mkdir src/tools/my-new-category
# Add .ts files following the tool pattern
```

**The auto-discovery system will automatically find and organize new categories!**

---

## 🧪 Testing Your Contributions

### Build and Test
```bash
# Build the project
npm run build

# Run the test suite
npm test

# Test your specific contribution
npm run build && node -e "
import('./dist/prompts/loader.js').then(async m => {
  const loader = new m.PromptLoader();
  const prompts = await loader.loadAllPrompts();
  console.log('Loaded prompts:', prompts.length);
});
"
```

### Manual Testing
```bash
# Test with Claude Desktop or other MCP client
# Your new prompts will appear as: /openapi-directory:your_prompt_name
# Your new tools will be available through the tool interface
```

---

## 📋 Code Standards

### TypeScript
- Use strict TypeScript
- Prefer `interface` over `type` for object shapes
- Use `const` assertions where appropriate
- Include JSDoc comments for public APIs

### File Naming
- Use kebab-case: `my-awesome-prompt.ts`
- Match the export name: file `my-prompt.ts` → export `my_prompt`
- Be descriptive but concise

### Code Style
- Use Prettier formatting (run `npm run format`)
- Prefer async/await over Promises
- Use destructuring where appropriate
- Keep functions small and focused

### Exports
```typescript
// Always export both named and default
export const prompt: PromptTemplate = { /* ... */ };
export default prompt;

export const tool: ToolDefinition = { /* ... */ };
export default tool;
```

---

## 🔄 Pull Request Process

### 1. Before You Start
- Check existing issues and PRs
- Open an issue to discuss major changes
- Fork the repository

### 2. Development
- Create a feature branch: `git checkout -b feature/my-awesome-feature`
- Follow the plugin architecture patterns above
- Write tests if adding new core functionality
- Update documentation if needed

### 3. Testing Checklist
- [ ] Project builds without errors: `npm run build`
- [ ] All tests pass: `npm test`
- [ ] New prompts/tools are auto-discovered
- [ ] Functionality works as expected
- [ ] No breaking changes to existing functionality

### 4. Pull Request
- Write a clear PR description
- Reference any related issues
- Include examples of your new functionality
- Add screenshots/examples if relevant

### 5. Review Process
- Maintainers will review for functionality and architecture fit
- Address feedback promptly
- Keep PR scope focused and manageable

---

## 🎯 Contribution Ideas

### High-Priority Areas
- **New API Integrations**: Prompts for specific API ecosystems
- **Developer Workflow**: Tools for common development tasks  
- **Testing & Validation**: Prompts/tools for API testing
- **Documentation**: Better examples and guides
- **Performance**: Optimization of existing tools

### Prompt Ideas
- API migration assistants for specific frameworks
- Security audit prompts for API configurations
- Performance optimization guides
- API version comparison tools
- Integration testing generators

### Tool Ideas
- API health monitoring tools
- Bulk API operations
- Advanced search and filtering
- Export utilities for different formats
- Integration with CI/CD systems

---

## 💡 Architecture Benefits for Contributors

### Why This Architecture Rocks
- **Zero Friction**: No core code changes needed
- **Isolated Development**: Work on features independently  
- **Easy Testing**: Test individual components
- **Automatic Integration**: Plugin discovery handles everything
- **Scalable**: Unlimited growth without complexity
- **Type Safe**: Full TypeScript support throughout

### Debugging Tips
- Check `dist/` folder after build to see compiled output
- Use console.log in tools during development
- Test tools individually before integration
- Check that exports match naming conventions

---

## 🙋‍♀️ Getting Help

### Resources
- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [Project README](README.md) - Overall project information
- [API Reference](docs/) - Technical documentation
- [Examples](examples/) - Usage examples

### Community
- **Issues**: [GitHub Issues](https://github.com/rawveg/openapi-directory-mcp/issues)
- **Discussions**: Use GitHub Discussions for questions
- **Security**: Use security advisory for vulnerabilities

### Contact
- Open an issue for bugs or feature requests
- Use discussions for general questions
- Check existing issues before creating new ones

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to OpenAPI Directory MCP! Your plugins help make API integration easier for everyone! 🚀**