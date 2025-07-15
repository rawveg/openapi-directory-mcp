# Quick Start Guide

Get up and running with the OpenAPI Directory MCP Server in under 5 minutes!

## 🚀 Installation

### Option 1: Install from npm (Recommended)

```bash
npm install -g openapi-directory-mcp
```

### Option 2: Install from source

```bash
# Clone the repository
git clone https://github.com/yourusername/openapi-directory-mcp.git
cd openapi-directory-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Link globally
npm link
```

## ⚙️ Client Configuration

Choose your MCP client and follow the appropriate configuration:

### Claude Desktop

1. Open Claude Desktop settings
2. Navigate to "Developer" → "Model Context Protocol"
3. Add the following configuration:

```json
{
  "mcpServers": {
    "openapi-directory": {
      "command": "openapi-directory-mcp"
    }
  }
}
```

### Claude Code

Add to your `.claude/config.json`:

```json
{
  "mcpServers": {
    "openapi-directory": {
      "command": "npx",
      "args": ["openapi-directory-mcp"]
    }
  }
}
```

### Cursor

Add to your Cursor settings:

```json
{
  "mcp": {
    "servers": {
      "openapi-directory": {
        "command": "openapi-directory-mcp"
      }
    }
  }
}
```

### Windsurf

Configure in Windsurf preferences under MCP Servers:

```json
{
  "openapi-directory": {
    "command": "openapi-directory-mcp",
    "enabled": true
  }
}
```

## 🎯 Your First Commands

Once configured, try these commands in your AI assistant:

### 1. List Popular API Providers

```
"Show me the most popular API providers"
```

### 2. Explore a Specific Provider

```
"What APIs does Stripe offer?"
```

### 3. Get an API Specification

```
"Get me the OpenAPI spec for the GitHub REST API"
```

### 4. Search for APIs

```
"Find APIs related to payment processing"
```

### 5. Check API Metrics

```
"How many APIs are available in the directory?"
```

## 💡 Pro Tips

1. **Use specific provider names** - Use the exact provider domain (e.g., "stripe.com" not just "stripe")

2. **Check available versions** - Many APIs have multiple versions. Ask for the preferred version:
   ```
   "What's the preferred version of the Twitter API?"
   ```

3. **Explore by category** - Ask for APIs by functionality:
   ```
   "Show me all APIs related to machine learning"
   ```

4. **Get API documentation** - Request external documentation links:
   ```
   "Where can I find the documentation for the Twilio API?"
   ```

## 🔍 Common Use Cases

### API Integration Research
```
"I need to integrate payment processing. What APIs are available?"
```

### API Comparison
```
"Compare the available email sending APIs"
```

### API Discovery
```
"What are the newest APIs added this week?"
```

### Version Management
```
"Show me all versions of the Google Drive API"
```

## ❓ Troubleshooting

### Server not found
- Ensure the server is installed globally: `npm list -g openapi-directory-mcp`
- Check your PATH includes npm global binaries

### No APIs returned
- Verify your internet connection (the server queries apis.guru)
- Check if the provider name is correct (use exact domain names)

### Configuration not working
- Restart your MCP client after configuration changes
- Verify JSON syntax in configuration files
- Check client logs for error messages

## 📚 Next Steps

- Read the full [API Reference](./API-REFERENCE.md)
- Explore [Usage Examples](./EXAMPLES.md)
- Learn about [Client Setup](./CLIENT-SETUP.md)
- Contribute to the project on [GitHub](https://github.com/yourusername/openapi-directory-mcp)

## 🆘 Need Help?

- 📖 [Full Documentation](./README.md)
- 🐛 [Report Issues](https://github.com/yourusername/openapi-directory-mcp/issues)
- 💬 [Join our Discord](https://discord.gg/yourserver)
- 📧 [Email Support](mailto:support@example.com)