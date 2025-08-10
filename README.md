# Arbitrum MCP Server

A Model Context Protocol (MCP) server for interfacing with Arbitrum Nitro nodes and chains in natural language. Perfect for PM and support teams to monitor chain health, batch posting, assertions, and gas prices.

## Features

### Core Monitoring Tools

- **Comprehensive Chain Status** - Complete health overview for any Arbitrum chain
- **Batch Posting Monitoring** - Track sequencer batch delivery and backlog
- **Assertion Monitoring** - Monitor NodeCreated vs NodeConfirmed events
- **Gas Price Monitoring** - Track current gas prices and detect spikes
- **ArbOS Version Detection** - Get current ArbOS version for any chain

### Chain Support

- **Auto-Resolution** - Contract addresses resolved automatically from chain names

### Arbitrum Node APIs

- Health checks and sync status
- Transaction tracing (arbtrace\_\*)
- Debug and validation APIs
- Maintenance operations
- Timeboost express lanes

## Quick Start

### Docker (Recommended)

The easiest way to run the MCP server with maximum client compatibility:

```bash
# Build and run
npm run docker:compose:build

# For MCP clients, use:
docker run -i --rm arbitrum-mcp
```

### Direct Node.js

```bash
# Install dependencies
npm install

# Build
npm run build

# Run
npm start
```

## MCP Client Configuration

### Claude Desktop

Add to your Claude Desktop configuration:

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

### Cline/Claude Code

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

## Usage Examples

### For PM and Support Teams

**"What is the current status of Xai?"**

```
comprehensive_chain_status --chainName "Xai"
```

**"Are batches being posted for Arbitrum One?"**

```
batch_posting_status --chainName "Arbitrum One"
```

**"Check gas prices on Nova"**

```
gas_status --chainName "Nova"
```

**"What's the assertion status for Base?"**

```
assertion_status --chainName "Base"
```

### Available Tools

#### Monitoring Tools

- `comprehensive_chain_status` - Complete chain health overview
- `batch_posting_status` - Batch posting monitoring
- `assertion_status` - Assertion creation/confirmation tracking
- `gas_status` - Current gas price information

#### Chain Information

- `list_chains` - Show all available Arbitrum chains
- `search_chains` - Find chains by name or ID
- `chain_info` - Get detailed chain information
- `arbos_version` - Get ArbOS version for any chain

#### Node Operations

- `node_health` - Check node health status
- `sync_status` - Get synchronization status
- `latest_block` - Get latest block information

#### Account Operations

- `get_balance` / `get_balance_ether` - Check account balances
- `get_transaction` / `get_transaction_receipt` - Transaction details
- `is_contract` - Check if address is a contract

## Key Benefits

### For Product Managers

- **Comprehensive Status Checks** - Get complete chain health in one query
- **Chain Comparison** - Compare metrics across different Orbit chains
- **Gas Monitoring** - Track network congestion and costs
- **Uptime Monitoring** - Monitor batch posting frequency and assertion status

### For Support Teams

- **Troubleshooting** - Quick health checks for user-reported issues
- **Incident Response** - Rapidly assess chain status during incidents
- **Performance Monitoring** - Track key metrics like backlog and gas prices
- **Multi-Chain Support** - Consistent interface across all Arbitrum chains

### Data-Driven Approach

- **No Health Judgments** - Returns raw data for you to interpret
- **Configurable Thresholds** - Apply your own business logic
- **Historical Context** - Time-based metrics for trend analysis
- **Detailed Summaries** - Human-readable status descriptions

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Development mode with watch
npm run dev
```

## Docker

See [DOCKER.md](DOCKER.md) for detailed Docker setup instructions.

## Architecture

- **TypeScript** - Type-safe development
- **Viem** - Ethereum client for blockchain interactions
- **Orbit SDK** - Arbitrum-specific functionality
- **MCP SDK** - Model Context Protocol implementation
- **Docker** - Containerized deployment

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
