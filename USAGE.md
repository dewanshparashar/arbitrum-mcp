# Arbitrum MCP Server Usage Guide

**Requirements:** Node.js 12.0.0 or higher (Node.js 18.x LTS recommended for Claude Desktop)

## NPX Configuration Examples

### Claude Desktop Configuration

Add this to your Claude Desktop `claude_desktop_config.json`:

**Option 1: Using npx (automatic Node.js detection)**
```json
{
  "mcpServers": {
    "arbitrum-mcp": {
      "command": "npx",
      "args": ["arbitrum-mcp"]
    }
  }
}
```

**Option 2: Using specific Node.js version (recommended for stability)**
```json
{
  "mcpServers": {
    "arbitrum-mcp": {
      "command": "/Users/yourusername/.nvm/versions/node/v18.20.4/bin/npx",
      "args": ["arbitrum-mcp"]
    }
  }
}
```
*Replace the path with your actual Node.js 18+ installation path*

### Cline/Claude Code Configuration

Add this to your Cline configuration:

```json
{
  "mcpServers": {
    "arbitrum-mcp": {
      "command": "npx", 
      "args": ["arbitrum-mcp"]
    }
  }
}
```

### Continue.dev Configuration

Add this to your Continue configuration:

```json
{
  "mcp": {
    "arbitrum-mcp": {
      "command": ["npx", "arbitrum-mcp"]
    }
  }
}
```

## Common Usage Patterns

### Chain Status Monitoring

**Get comprehensive status of any Arbitrum chain:**
```
comprehensive_chain_status --chainName "Xai"
comprehensive_chain_status --chainName "Arbitrum One"  
comprehensive_chain_status --chainName "Nova"
```

**Check specific monitoring aspects:**
```
batch_posting_status --chainName "Xai"
assertion_status --chainName "Arbitrum One"
gas_status --chainName "Nova"
```

### Chain Discovery

**Find available chains:**
```
list_chains
search_chains --query "Xai"
search_chains --query "42161"
chain_info --chainName "Xai"
```

### Node Operations

**Check node health and status:**
```
node_health --chainName "Xai"
sync_status --chainName "Arbitrum One"
arbos_version --chainName "Nova"
```

### Account and Transaction Operations

**Check balances and transactions:**
```
get_balance_ether --address "0x..." --chainName "Xai"
get_transaction --txHash "0x..." --chainName "Arbitrum One"
is_contract --address "0x..." --chainName "Nova"
```

## Natural Language Examples

The MCP server responds well to natural language queries:

- **"What is the current status of Xai?"** → `comprehensive_chain_status`
- **"Are batches being posted for Arbitrum One?"** → `batch_posting_status` 
- **"Check gas prices on Nova"** → `gas_status`
- **"What's the ArbOS version for Xai?"** → `arbos_version`
- **"Show me all available chains"** → `list_chains`
- **"Find chains with 'arbitrum' in the name"** → `search_chains`

## Troubleshooting

### NPM Package Issues

**Node.js version error:**
```bash
# Check your Node.js version
node --version

# Upgrade to Node.js 18 LTS (recommended) if needed
# Using nvm:
nvm install 18
nvm use 18

# For Claude Desktop, make sure to use Node.js 18+ in your MCP configuration
```

**Package not found:**
```bash
# Clear npm cache and try again
npm cache clean --force
npx arbitrum-mcp
```

**Rebuild if needed:**
```bash
npm run build
```

### MCP Client Issues

**Check MCP client logs** for connection errors or tool execution failures.

**Verify npx can find the package:**
```bash
npx --yes arbitrum-mcp --help
```

### Chain-Specific Issues

**ArbOS version not available:**
Some public RPC endpoints don't support ArbOS version queries. This is expected and the tool will return "Unknown".

**Monitoring requires contract addresses:**
For custom monitoring, you may need to provide contract addresses manually if chain auto-resolution fails.

## Advanced Usage

### Custom RPC URLs

You can override default RPC URLs:
```
comprehensive_chain_status --rpcUrl "https://your-custom-rpc.com" --chainName "Custom Chain"
```

### Direct Contract Address Usage

For maximum control, specify contract addresses directly:
```
batch_posting_status \
  --rpcUrl "https://xai-chain.net/rpc" \
  --parentRpcUrl "https://arb1.arbitrum.io/rpc" \
  --sequencerInboxAddress "0x995a9d3ca121D48d21087eDE20bc8acb2398c8B1" \
  --bridgeAddress "0x7dd8A76bdAeBE3BBBaCD7Aa87f1D4FDa1E60f94f"
```

This NPX-based setup provides maximum compatibility and ease of use across different MCP clients and operating systems without requiring any containerization.