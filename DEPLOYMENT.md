# Deployment Guide for Personio MCP Server

This guide covers various deployment options for the Personio MCP server.

## Local Development

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment:**
```bash
cp .env.example .env
# Edit .env with your Personio credentials
```

3. **Run in development mode:**
```bash
npm run dev
```

## Production Deployment

### Option 1: NPM Package

1. **Build the project:**
```bash
npm run build
```

2. **Package for distribution:**
```bash
npm pack
```

3. **Install globally:**
```bash
npm install -g ./personio-mcp-server-1.0.0.tgz
```

### Option 2: Direct Installation

1. **Clone and build:**
```bash
git clone https://github.com/yourusername/personio-mcp.git
cd personio-mcp
npm install
npm run build
```

2. **Create a startup script:**
```bash
#!/bin/bash
export PERSONIO_CLIENT_ID="your_client_id"
export PERSONIO_CLIENT_SECRET="your_client_secret"
node /path/to/personio-mcp/dist/index.js
```

### Option 3: Docker Deployment

1. **Create Dockerfile:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY dist ./dist

# Set user
USER node

# Start server
CMD ["node", "dist/index.js"]
```

2. **Build Docker image:**
```bash
docker build -t personio-mcp .
```

3. **Run container:**
```bash
docker run -d \
  --name personio-mcp \
  -e PERSONIO_CLIENT_ID="your_client_id" \
  -e PERSONIO_CLIENT_SECRET="your_client_secret" \
  personio-mcp
```

## Claude Desktop Integration

### macOS

1. **Find config location:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

2. **Add server configuration:**
```json
{
  "mcpServers": {
    "personio": {
      "command": "node",
      "args": ["/absolute/path/to/personio-mcp/dist/index.js"],
      "env": {
        "PERSONIO_CLIENT_ID": "your_client_id",
        "PERSONIO_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

### Windows

1. **Find config location:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

2. **Add server configuration:**
```json
{
  "mcpServers": {
    "personio": {
      "command": "node.exe",
      "args": ["C:\\path\\to\\personio-mcp\\dist\\index.js"],
      "env": {
        "PERSONIO_CLIENT_ID": "your_client_id",
        "PERSONIO_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

### Linux

1. **Find config location:**
```bash
~/.config/Claude/claude_desktop_config.json
```

2. **Add server configuration:**
```json
{
  "mcpServers": {
    "personio": {
      "command": "node",
      "args": ["/home/user/personio-mcp/dist/index.js"],
      "env": {
        "PERSONIO_CLIENT_ID": "your_client_id",
        "PERSONIO_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PERSONIO_CLIENT_ID` | OAuth2 Client ID | `client_abc123` |
| `PERSONIO_CLIENT_SECRET` | OAuth2 Client Secret | `secret_xyz789` |
| `PERSONIO_API_KEY` | Alternative: API Key | `papi_key123` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PERSONIO_API_URL` | API Base URL | `https://api.personio.de` |
| `CACHE_TTL_EMPLOYEES` | Employee cache TTL (seconds) | `300` |
| `CACHE_TTL_ORGANIZATION` | Org cache TTL (seconds) | `3600` |
| `CACHE_TTL_POLICIES` | Policy cache TTL (seconds) | `86400` |
| `RATE_LIMIT_PER_MINUTE` | API requests per minute | `60` |
| `RATE_LIMIT_BURST` | Burst rate limit | `15` |

## Security Considerations

1. **Credentials Storage:**
   - Never commit credentials to version control
   - Use environment variables or secure secret management
   - Rotate credentials regularly

2. **Network Security:**
   - Use HTTPS for all API communications
   - Implement IP whitelisting if supported
   - Monitor API usage for anomalies

3. **Access Control:**
   - Limit API permissions to required operations
   - Use read-only credentials where possible
   - Implement audit logging

## Monitoring

1. **Health Checks:**
   - Monitor server process status
   - Check API connectivity
   - Verify authentication token validity

2. **Performance Metrics:**
   - Track API request rates
   - Monitor cache hit rates
   - Log response times

3. **Error Tracking:**
   - Log all API errors
   - Monitor rate limit violations
   - Track authentication failures

## Troubleshooting

### Server Won't Start
- Check environment variables are set
- Verify Node.js version (>=18)
- Check file permissions

### Authentication Failures
- Verify credentials are correct
- Check API permissions in Personio
- Ensure IP is whitelisted

### Rate Limiting Issues
- Reduce request frequency
- Increase cache TTLs
- Check concurrent connections

### Connection Errors
- Verify network connectivity
- Check firewall rules
- Test API endpoint directly

## Updating

1. **Backup current installation**
2. **Pull latest changes:**
```bash
git pull origin main
```
3. **Update dependencies:**
```bash
npm install
```
4. **Rebuild:**
```bash
npm run build
```
5. **Restart server**

## Support

For deployment issues:
- Check server logs for errors
- Verify all prerequisites are met
- Consult the troubleshooting section
- Open an issue on GitHub