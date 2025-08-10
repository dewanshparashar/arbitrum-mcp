# Docker Setup for Arbitrum MCP Server

This document explains how to run the Arbitrum MCP server using Docker for maximum compatibility with MCP clients.

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Build and run with Docker Compose
npm run docker:compose:build

# Or just run (if already built)
npm run docker:compose
```

### Option 2: Docker Build & Run

```bash
# Build the Docker image
npm run docker:build

# Run the container
npm run docker:run
```

### Option 3: Manual Docker Commands

```bash
# Build the image
docker build -t arbitrum-mcp .

# Run interactively
docker run -it --rm arbitrum-mcp
```

## MCP Client Configuration

### For Claude Desktop

Add this to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "arbitrum-mcp": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "arbitrum-mcp"]
    }
  }
}
```

### For other MCP clients

Use this general configuration:

```yaml
servers:
  arbitrum-mcp:
    command: docker
    args: 
      - run
      - -i 
      - --rm
      - arbitrum-mcp
```

## Docker Image Details

- **Base Image**: `node:18-alpine` (lightweight Linux)
- **Security**: Runs as non-root user
- **Size**: ~50MB (optimized with Alpine Linux)
- **Transport**: STDIO (standard input/output for MCP)

## Available Docker Scripts

```bash
npm run docker:build         # Build Docker image
npm run docker:run           # Run container interactively  
npm run docker:compose       # Start with Docker Compose
npm run docker:compose:build # Build and start with Docker Compose
npm run docker:compose:down  # Stop Docker Compose services
```

## Troubleshooting

### Container starts but doesn't respond
- Ensure your MCP client is connecting via STDIO
- Check that the container has `-i` (interactive) flag

### Permission issues
- The Docker container runs as non-root user `mcp`
- All application files are owned by this user

### Network issues
- The MCP server uses STDIO, not network ports
- No port mapping is required for MCP communication

### Building from source
```bash
# Make sure to build TypeScript first
npm run build

# Then build Docker image
npm run docker:build
```

## Production Deployment

For production environments:

```bash
# Build production image
docker build -t arbitrum-mcp:latest .

# Run with restart policy
docker run -d --name arbitrum-mcp --restart unless-stopped arbitrum-mcp:latest

# Or use Docker Compose for production
docker-compose -f docker-compose.yml up -d
```

## Environment Variables

The container supports these environment variables:

- `NODE_ENV=production` (set by default in docker-compose.yml)

## Health Checks

The Docker Compose configuration includes health checks to monitor container status:

```bash
# Check container health
docker-compose ps
```

## Integration Examples

### With Cline/Claude Code
```json
{
  "mcpServers": {
    "arbitrum-mcp": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "arbitrum-mcp"]
    }
  }
}
```

### With Continue.dev
```json
{
  "mcp": {
    "arbitrum-mcp": {
      "command": ["docker", "run", "-i", "--rm", "arbitrum-mcp"]
    }
  }
}
```

This Docker setup ensures maximum compatibility across different MCP clients and operating systems.