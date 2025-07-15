# Client Setup Guide

This guide provides detailed configuration instructions for all major MCP clients.

## 📋 Prerequisites

Before configuring any client, ensure you have:

1. **Node.js 18+** installed
2. **OpenAPI Directory MCP Server** installed:
   ```bash
   npm install -g openapi-directory-mcp
   ```
3. **Server accessibility** - verify it's in your PATH:
   ```bash
   which openapi-directory-mcp
   ```

## 🎯 Claude Desktop

### Configuration Location

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Basic Configuration

```json
{
  "mcpServers": {
    "openapi-directory": {
      "command": "openapi-directory-mcp",
      "args": []
    }
  }
}
```

### Advanced Configuration

```json
{
  "mcpServers": {
    "openapi-directory": {
      "command": "openapi-directory-mcp",
      "args": ["--cache-ttl", "3600", "--max-results", "100"],
      "env": {
        "API_BASE_URL": "https://api.apis.guru/v2",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Troubleshooting Claude Desktop

1. **Server not found error**:
   ```bash
   # Check if server is installed globally
   npm list -g openapi-directory-mcp
   
   # If not found, install globally
   npm install -g openapi-directory-mcp
   ```

2. **Permission errors**:
   ```bash
   # Fix npm permissions (macOS/Linux)
   sudo chown -R $(whoami) ~/.npm
   ```

3. **Configuration not loading**:
   - Ensure JSON syntax is valid
   - Restart Claude Desktop completely
   - Check the configuration file path

## 🚀 Claude Code

### Configuration Location

Create or edit `.claude/config.json` in your project root:

```bash
mkdir -p .claude
touch .claude/config.json
```

### Basic Configuration

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

### Project-Specific Configuration

```json
{
  "mcpServers": {
    "openapi-directory": {
      "command": "node",
      "args": ["./node_modules/.bin/openapi-directory-mcp"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

### Global Configuration

Add to your global Claude Code settings:

```json
{
  "mcpServers": {
    "openapi-directory": {
      "command": "openapi-directory-mcp",
      "args": [],
      "enabled": true
    }
  }
}
```

### Troubleshooting Claude Code

1. **Server not starting**:
   ```bash
   # Test the server directly
   npx openapi-directory-mcp
   ```

2. **Path issues**:
   ```bash
   # Use absolute path
   which openapi-directory-mcp
   ```

3. **Workspace-specific issues**:
   - Ensure `.claude` directory exists
   - Check file permissions
   - Verify JSON syntax

## 📝 Cursor

### Configuration Location

- **Settings**: `Cursor > Preferences > MCP Servers`
- **File**: `~/.cursor/config.json`

### Basic Configuration

```json
{
  "mcp": {
    "servers": {
      "openapi-directory": {
        "command": "openapi-directory-mcp",
        "args": []
      }
    }
  }
}
```

### Advanced Configuration

```json
{
  "mcp": {
    "servers": {
      "openapi-directory": {
        "command": "openapi-directory-mcp",
        "args": ["--verbose"],
        "env": {
          "NODE_ENV": "production"
        },
        "timeout": 30000,
        "retries": 3
      }
    }
  }
}
```

### VS Code Extension Integration

If using Cursor as a VS Code extension:

```json
{
  "cursor.mcp.servers": {
    "openapi-directory": {
      "command": "openapi-directory-mcp",
      "workspaceFolder": true
    }
  }
}
```

### Troubleshooting Cursor

1. **Extension not loading**:
   - Restart Cursor
   - Check extension is enabled
   - Update to latest version

2. **Configuration not applying**:
   - Use absolute paths
   - Check JSON formatting
   - Verify server installation

## 🌊 Windsurf

### Configuration Location

- **Settings**: `Windsurf > Preferences > MCP Servers`
- **File**: `~/.windsurf/mcp-config.json`

### Basic Configuration

```json
{
  "servers": {
    "openapi-directory": {
      "command": "openapi-directory-mcp",
      "enabled": true
    }
  }
}
```

### Advanced Configuration

```json
{
  "servers": {
    "openapi-directory": {
      "command": "openapi-directory-mcp",
      "args": ["--config", "windsurf-config.json"],
      "enabled": true,
      "autoStart": true,
      "healthCheck": {
        "enabled": true,
        "interval": 60000
      }
    }
  }
}
```

### Windsurf-Specific Features

```json
{
  "servers": {
    "openapi-directory": {
      "command": "openapi-directory-mcp",
      "enabled": true,
      "windsurf": {
        "priority": "high",
        "category": "api-tools",
        "description": "Access to OpenAPI directory for API discovery",
        "icon": "api"
      }
    }
  }
}
```

### Troubleshooting Windsurf

1. **Server not appearing**:
   - Check the enabled flag
   - Restart Windsurf
   - Verify configuration syntax

2. **Performance issues**:
   - Adjust health check interval
   - Set appropriate priority
   - Monitor resource usage

## 🔧 Generic MCP Client

### Standard MCP Configuration

For any MCP-compatible client:

```json
{
  "mcpServers": {
    "openapi-directory": {
      "command": "openapi-directory-mcp",
      "args": [],
      "capabilities": {
        "tools": true,
        "resources": false,
        "prompts": false
      }
    }
  }
}
```

### Environment Variables

Set these for all clients:

```bash
export MCP_SERVER_TIMEOUT=30000
export MCP_LOG_LEVEL=info
export OPENAPI_DIRECTORY_BASE_URL=https://api.apis.guru/v2
```

### Docker Configuration

For containerized environments:

```yaml
services:
  mcp-server:
    image: node:18-alpine
    command: npx openapi-directory-mcp
    environment:
      - NODE_ENV=production
      - API_BASE_URL=https://api.apis.guru/v2
    ports:
      - "8080:8080"
```

## 🛠️ Development Setup

### Local Development

1. **Clone and setup**:
   ```bash
   git clone https://github.com/yourusername/openapi-directory-mcp.git
   cd openapi-directory-mcp
   npm install
   npm run build
   ```

2. **Link locally**:
   ```bash
   npm link
   ```

3. **Configure client** to use local version:
   ```json
   {
     "mcpServers": {
       "openapi-directory": {
         "command": "node",
         "args": ["/path/to/openapi-directory-mcp/dist/index.js"]
       }
     }
   }
   ```

### Debug Mode

Enable debugging for all clients:

```json
{
  "mcpServers": {
    "openapi-directory": {
      "command": "openapi-directory-mcp",
      "args": ["--debug"],
      "env": {
        "DEBUG": "openapi-directory:*",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

## 📊 Performance Tuning

### Memory Settings

```json
{
  "mcpServers": {
    "openapi-directory": {
      "command": "node",
      "args": ["--max-old-space-size=512", "openapi-directory-mcp"],
      "env": {
        "NODE_OPTIONS": "--max-old-space-size=512"
      }
    }
  }
}
```

### Connection Pooling

```json
{
  "mcpServers": {
    "openapi-directory": {
      "command": "openapi-directory-mcp",
      "args": ["--max-connections", "10", "--connection-timeout", "5000"]
    }
  }
}
```

### Caching Configuration

```json
{
  "mcpServers": {
    "openapi-directory": {
      "command": "openapi-directory-mcp",
      "args": ["--cache-ttl", "3600", "--cache-size", "100"]
    }
  }
}
```

## 🔒 Security Considerations

### Network Security

```json
{
  "mcpServers": {
    "openapi-directory": {
      "command": "openapi-directory-mcp",
      "args": ["--allowed-hosts", "api.apis.guru"],
      "env": {
        "HTTPS_ONLY": "true"
      }
    }
  }
}
```

### Resource Limits

```json
{
  "mcpServers": {
    "openapi-directory": {
      "command": "openapi-directory-mcp",
      "args": ["--max-results", "50", "--timeout", "10000"]
    }
  }
}
```

## 🔄 Multiple Environments

### Development Environment

```json
{
  "mcpServers": {
    "openapi-directory-dev": {
      "command": "openapi-directory-mcp",
      "args": ["--env", "development"],
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "true"
      }
    }
  }
}
```

### Production Environment

```json
{
  "mcpServers": {
    "openapi-directory-prod": {
      "command": "openapi-directory-mcp",
      "args": ["--env", "production"],
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "error"
      }
    }
  }
}
```

## 🆘 Common Issues and Solutions

### Issue: Server Won't Start

**Solution:**
```bash
# Check installation
npm list -g openapi-directory-mcp

# Reinstall if needed
npm uninstall -g openapi-directory-mcp
npm install -g openapi-directory-mcp

# Test manually
openapi-directory-mcp --help
```

### Issue: Configuration Not Loading

**Solution:**
1. Validate JSON syntax
2. Check file permissions
3. Restart client application
4. Use absolute paths

### Issue: Poor Performance

**Solution:**
1. Increase cache TTL
2. Reduce max results
3. Add connection pooling
4. Monitor network requests

### Issue: Network Errors

**Solution:**
```bash
# Test connectivity
curl https://api.apis.guru/v2/list.json

# Check firewall settings
# Configure proxy if needed
```

## 📚 Additional Resources

- [MCP Specification](https://github.com/anthropics/model-context-protocol)
- [APIs.guru Documentation](https://github.com/APIs-guru/openapi-directory)
- [OpenAPI Specification](https://swagger.io/specification/)
- [JSON Schema Validation](https://json-schema.org/)

Need help? Check our [troubleshooting guide](./README.md#troubleshooting) or [open an issue](https://github.com/yourusername/openapi-directory-mcp/issues).