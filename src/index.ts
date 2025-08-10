#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { NitroNodeClient } from "./clients/nitro-node-client.js";
import { ArbitrumChainClient } from "./clients/arbitrum-chain-client.js";
import { EthereumAccountClient } from "./clients/ethereum-account-client.js";
import { ChainLookupService } from "./services/chain-lookup.js";

class ArbitrumMCPServer {
  private server: Server;
  private chainLookupService: ChainLookupService;
  private defaultRpcUrl: string | null = null;

  constructor() {
    console.error("ArbitrumMCPServer: Creating server instance");

    this.server = new Server(
      {
        name: "arbitrum-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.chainLookupService = ChainLookupService.getInstance();

    console.error("ArbitrumMCPServer: Setting up handlers");
    this.setupHandlers();
    console.error("ArbitrumMCPServer: Constructor complete");
  }

  private getRpcUrl(providedUrl?: string): string {
    if (providedUrl) {
      return providedUrl;
    }
    if (this.defaultRpcUrl) {
      return this.defaultRpcUrl;
    }
    throw new Error(
      "No RPC URL provided and no default RPC URL configured. Please set a default RPC URL or provide one in the request."
    );
  }

  private async resolveRpcUrl(chainNameOrUrl?: string): Promise<string> {
    if (chainNameOrUrl) {
      // If it looks like a URL, use it directly
      if (
        chainNameOrUrl.startsWith("http://") ||
        chainNameOrUrl.startsWith("https://")
      ) {
        return chainNameOrUrl;
      }

      // Otherwise, try to look it up as a chain name
      try {
        const chain = await this.chainLookupService.findChainByName(
          chainNameOrUrl
        );
        if (chain && chain.rpcUrl) {
          console.error(
            `Resolved chain "${chainNameOrUrl}" to RPC URL: ${chain.rpcUrl}`
          );
          return chain.rpcUrl;
        }
      } catch (error) {
        console.error(`Failed to lookup chain "${chainNameOrUrl}":`, error);
      }

      // If lookup failed, assume it's a custom RPC URL
      return chainNameOrUrl;
    }

    if (this.defaultRpcUrl) {
      return this.defaultRpcUrl;
    }

    throw new Error(
      "No RPC URL or chain name provided and no default RPC URL configured. Please set a default RPC URL or provide a chain name/RPC URL in the request."
    );
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        console.error("Handling list tools request");
        return {
          tools: this.getAvailableTools(),
        };
      } catch (error) {
        console.error("Error in list tools handler:", error);
        throw error;
      }
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        console.error("Handling call tool request:", request.params.name);
        const { name, arguments: args } = request.params;

        if (!args) {
          throw new Error("Missing arguments");
        }

        switch (name) {
          case "set_rpc_url":
            this.defaultRpcUrl = args.rpcUrl as string;
            return {
              content: [
                {
                  type: "text",
                  text: `Default RPC URL set to: ${this.defaultRpcUrl}`,
                },
              ],
            };

          case "get_rpc_url":
            return {
              content: [
                {
                  type: "text",
                  text: this.defaultRpcUrl
                    ? `Current default RPC URL: ${this.defaultRpcUrl}`
                    : "No default RPC URL configured",
                },
              ],
            };

          case "clear_rpc_url":
            const oldUrl = this.defaultRpcUrl;
            this.defaultRpcUrl = null;
            return {
              content: [
                {
                  type: "text",
                  text: oldUrl
                    ? `Cleared default RPC URL: ${oldUrl}`
                    : "No default RPC URL was configured",
                },
              ],
            };
        }

        switch (name) {
          case "node_health": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const health = await nodeClient.getHealth();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(health, null, 2),
                },
              ],
            };
          }

          case "sync_status": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const syncStatus = await nodeClient.getSyncStatus();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(syncStatus, null, 2),
                },
              ],
            };
          }

          case "node_peers": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const peers = await nodeClient.getPeers();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(peers, null, 2),
                },
              ],
            };
          }

          case "arbos_version": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const chainDataClient = new ArbitrumChainClient(rpcUrl);
            const version = await chainDataClient.getArbOSVersion();
            return {
              content: [
                {
                  type: "text",
                  text: `ArbOS Version: ${version}`,
                },
              ],
            };
          }

          case "latest_block": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const chainDataClient = new ArbitrumChainClient(rpcUrl);
            const latestBlock = await chainDataClient.getLatestBlock();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(latestBlock, null, 2),
                },
              ],
            };
          }

          case "get_balance": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const ethereumAccountClient = new EthereumAccountClient(rpcUrl);
            const balance = await ethereumAccountClient.getBalance(
              args.address as string
            );
            return {
              content: [
                {
                  type: "text",
                  text: `Balance: ${balance} wei`,
                },
              ],
            };
          }

          case "get_balance_ether": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const ethereumAccountClient = new EthereumAccountClient(rpcUrl);
            const balanceEth = await ethereumAccountClient.getBalanceInEther(
              args.address as string
            );
            return {
              content: [
                {
                  type: "text",
                  text: `Balance: ${balanceEth} ETH`,
                },
              ],
            };
          }

          case "get_transaction": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const ethereumAccountClient = new EthereumAccountClient(rpcUrl);
            const tx = await ethereumAccountClient.getTransaction(
              args.txHash as string
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(tx, null, 2),
                },
              ],
            };
          }

          case "get_transaction_receipt": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const ethereumAccountClient = new EthereumAccountClient(rpcUrl);
            const receipt = await ethereumAccountClient.getTransactionReceipt(
              args.txHash as string
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(receipt, null, 2),
                },
              ],
            };
          }

          case "is_contract": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const ethereumAccountClient = new EthereumAccountClient(rpcUrl);
            const isContract = await ethereumAccountClient.isContract(
              args.address as string
            );
            return {
              content: [
                {
                  type: "text",
                  text: `Is contract: ${isContract}`,
                },
              ],
            };
          }

          case "list_chains":
            const chainNames = await this.chainLookupService.listChainNames();
            return {
              content: [
                {
                  type: "text",
                  text: `Available chains:\n${chainNames.join("\n")}`,
                },
              ],
            };

          case "search_chains":
            const searchResults = await this.chainLookupService.searchChains(
              args.query as string
            );
            return {
              content: [
                {
                  type: "text",
                  text:
                    searchResults.length > 0
                      ? `Found chains:\n${searchResults
                          .map((c) => `${c.name} (ID: ${c.chainId})`)
                          .join("\n")}`
                      : `No chains found matching "${args.query}"`,
                },
              ],
            };

          case "chain_info":
            const chainInfo = await this.chainLookupService.findChainByName(
              args.chainName as string
            );
            if (!chainInfo) {
              return {
                content: [
                  {
                    type: "text",
                    text: `Chain "${args.chainName}" not found`,
                  },
                ],
              };
            }
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(chainInfo, null, 2),
                },
              ],
            };

          case "get_rollup_address":
            const rollupChainInfo =
              await this.chainLookupService.findChainByName(
                args.chainName as string
              );
            if (!rollupChainInfo) {
              return {
                content: [
                  {
                    type: "text",
                    text: `Chain "${args.chainName}" not found`,
                  },
                ],
              };
            }
            if (!rollupChainInfo.rollup) {
              return {
                content: [
                  {
                    type: "text",
                    text: `Rollup contract address not available for ${rollupChainInfo.name}`,
                  },
                ],
              };
            }
            return {
              content: [
                {
                  type: "text",
                  text: `${rollupChainInfo.name} rollup contract address: ${rollupChainInfo.rollup}`,
                },
              ],
            };

          // ========== NEW ARBITRUM NODE METHODS ==========

          case "arb_check_publisher_health": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const health = await nodeClient.checkPublisherHealth();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(health, null, 2),
                },
              ],
            };
          }

          case "arb_get_raw_block_metadata": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const fromBlock = (args.fromBlock as number) || 0;
            const toBlock = (args.toBlock as number) || fromBlock;
            const metadata = await nodeClient.getRawBlockMetadata(
              fromBlock,
              toBlock
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(metadata, null, 2),
                },
              ],
            };
          }

          case "arb_latest_validated": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const validated = await nodeClient.getLatestValidated();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(validated, null, 2),
                },
              ],
            };
          }

          case "arbtrace_call": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const result = await nodeClient.traceCall(
              args.callArgs,
              (args.traceTypes as string[]) || ["trace"],
              args.blockNumOrHash as string
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "arbtrace_callMany": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const result = await nodeClient.traceCallMany(
              args.calls as any[],
              args.blockNumOrHash as string
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "arbtrace_replayBlockTransactions": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const result = await nodeClient.replayBlockTransactions(
              args.blockNumOrHash as string,
              (args.traceTypes as string[]) || ["trace"]
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "arbtrace_replayTransaction": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const result = await nodeClient.replayTransaction(
              args.txHash as string,
              (args.traceTypes as string[]) || ["trace"]
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "arbtrace_transaction": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const result = await nodeClient.traceTransaction(
              args.txHash as string
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "arbtrace_get": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const result = await nodeClient.traceGet(
              args.txHash as string,
              (args.path as string[]) || []
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "arbtrace_block": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const result = await nodeClient.traceBlock(
              args.blockNumOrHash as string
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "arbtrace_filter": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const result = await nodeClient.traceFilter(args.filter);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "arbdebug_validateMessageNumber": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const result = await nodeClient.validateMessageNumber(
              args.msgNum as number,
              (args.full as boolean) || false,
              args.moduleRoot as string
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "arbdebug_validationInputsAt": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const result = await nodeClient.getValidationInputsAt(
              args.msgNum as number,
              args.target as string
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "maintenance_status": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const result = await nodeClient.getMaintenanceStatus();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "maintenance_trigger": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const result = await nodeClient.triggerMaintenance();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "timeboost_sendExpressLaneTransaction": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const result = await nodeClient.sendExpressLaneTransaction(
              args.submission
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "auctioneer_submitAuctionResolutionTransaction": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const nodeClient = new NitroNodeClient(rpcUrl);
            const result = await nodeClient.submitAuctionResolutionTransaction(
              args.transaction
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case "batch_posting_status": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const chainDataClient = new ArbitrumChainClient(rpcUrl);
            const status = await chainDataClient.getBatchPostingStatus(
              args.parentRpcUrl as string,
              args.sequencerInboxAddress as string,
              args.bridgeAddress as string
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(status, null, 2),
                },
              ],
            };
          }

          case "assertion_status": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const chainDataClient = new ArbitrumChainClient(rpcUrl);
            const status = await chainDataClient.getAssertionStatus(
              args.parentRpcUrl as string,
              args.rollupAddress as string
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(status, null, 2),
                },
              ],
            };
          }

          case "gas_status": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const chainDataClient = new ArbitrumChainClient(rpcUrl);
            const status = await chainDataClient.getGasStatus();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(status, null, 2),
                },
              ],
            };
          }

          case "comprehensive_chain_status": {
            const rpcUrl = await this.resolveRpcUrl(
              (args.rpcUrl as string) || (args.chainName as string)
            );
            const chainDataClient = new ArbitrumChainClient(rpcUrl);
            
            // Get chain info to auto-populate contract addresses
            let chainInfo = null;
            if (args.chainName) {
              chainInfo = await this.chainLookupService.findChainByName(args.chainName as string);
            }

            const parentRpcUrl = args.parentRpcUrl as string || 
              (chainInfo?.parentChainId === 1 ? "https://eth.llamarpc.com" : "https://arb1.arbitrum.io/rpc");
            const sequencerInboxAddress = args.sequencerInboxAddress as string || chainInfo?.ethBridge?.sequencerInbox || "";
            const bridgeAddress = args.bridgeAddress as string || chainInfo?.ethBridge?.bridge || "";
            const rollupAddress = args.rollupAddress as string || chainInfo?.ethBridge?.rollup || "";
            const chainName = args.chainName as string || chainInfo?.name || "Unknown Chain";

            const status = await chainDataClient.getComprehensiveChainStatus(
              chainName,
              parentRpcUrl,
              sequencerInboxAddress,
              bridgeAddress,
              rollupAddress
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(status, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error("Error in call tool handler:", error);
        throw error;
      }
    });
  }

  private getAvailableTools(): Tool[] {
    console.error("ArbitrumMCPServer: Creating tools list");
    const tools = [
      {
        name: "set_rpc_url",
        description: "Set the default RPC URL for subsequent requests",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description: "The RPC URL to set as default",
            },
          },
          required: ["rpcUrl"],
        },
      },
      {
        name: "get_rpc_url",
        description: "Get the current default RPC URL",
        inputSchema: {
          type: "object" as const,
          properties: {},
        },
      },
      {
        name: "clear_rpc_url",
        description: "Clear the default RPC URL",
        inputSchema: {
          type: "object" as const,
          properties: {},
        },
      },
      {
        name: "node_health",
        description:
          "Check Arbitrum node health status (requires admin API access - may not work with public RPCs)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
          },
          required: [],
        },
      },
      {
        name: "sync_status",
        description:
          "Get node synchronization status (may fall back to current block number if sync API unavailable)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
          },
          required: [],
        },
      },
      {
        name: "node_peers",
        description:
          "Get connected peers information (requires admin API access - will not work with public RPCs)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
          },
          required: [],
        },
      },
      {
        name: "arbos_version",
        description:
          "Get the ArbOS version number for any Arbitrum chain. Use this for questions like 'what ArbOS version is Xai running?', 'ArbOS version of Arbitrum One', 'what version of ArbOS', or 'check ArbOS version'. Supports chain names like 'Xai', 'Arbitrum One', 'Nova', etc.",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One', 'Nova') - will auto-resolve to RPC URL",
            },
          },
          required: [],
        },
      },
      {
        name: "latest_block",
        description: "Get the latest block information",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the chain (optional if default is set)",
            },
          },
          required: [],
        },
      },
      {
        name: "get_balance",
        description: "Get balance of an address in wei",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the chain (optional if default is set)",
            },
            address: {
              type: "string",
              description: "Ethereum address to check balance for",
            },
          },
          required: ["address"],
        },
      },
      {
        name: "get_balance_ether",
        description: "Get balance of an address in ETH",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the chain (optional if default is set)",
            },
            address: {
              type: "string",
              description: "Ethereum address to check balance for",
            },
          },
          required: ["address"],
        },
      },
      {
        name: "get_transaction",
        description: "Get transaction details by hash",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the chain (optional if default is set)",
            },
            txHash: {
              type: "string",
              description: "Transaction hash",
            },
          },
          required: ["txHash"],
        },
      },
      {
        name: "get_transaction_receipt",
        description: "Get transaction receipt by hash",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the chain (optional if default is set)",
            },
            txHash: {
              type: "string",
              description: "Transaction hash",
            },
          },
          required: ["txHash"],
        },
      },
      {
        name: "is_contract",
        description: "Check if an address is a contract",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the chain (optional if default is set)",
            },
            address: {
              type: "string",
              description: "Address to check",
            },
          },
          required: ["address"],
        },
      },
      {
        name: "list_chains",
        description:
          "List all available Arbitrum Orbit chains and their names. Use this to see what chains are available for querying.",
        inputSchema: {
          type: "object" as const,
          properties: {},
        },
      },
      {
        name: "search_chains",
        description:
          "Search for Arbitrum chains by name, chain ID, or partial name match. Perfect for finding chains when you have incomplete information.",
        inputSchema: {
          type: "object" as const,
          properties: {
            query: {
              type: "string",
              description:
                "Search query (chain name like 'Xai', 'Arbitrum One', chain ID like '42161', or partial name)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "chain_info",
        description:
          "Get comprehensive chain information including rollup contract address, bridge addresses, chain ID, RPC URL, explorer URL, native token details, and all bridge contract addresses. Use this for questions about rollup addresses, bridge contracts, chain IDs, or any chain-specific data for Arbitrum chains like Xai, Arbitrum One, etc.",
        inputSchema: {
          type: "object" as const,
          properties: {
            chainName: {
              type: "string",
              description:
                "Chain name to look up (e.g., 'Xai', 'Arbitrum One', 'Nova', 'Stylus')",
            },
          },
          required: ["chainName"],
        },
      },
      {
        name: "get_rollup_address",
        description:
          "Get the rollup contract address for a specific Arbitrum chain. Use this for direct rollup address queries like 'what's the rollup address of Xai?', 'Xai rollup contract', or 'rollup address for Arbitrum One'.",
        inputSchema: {
          type: "object" as const,
          properties: {
            chainName: {
              type: "string",
              description:
                "Chain name to get rollup address for (e.g., 'Xai', 'Arbitrum One', 'Nova')",
            },
          },
          required: ["chainName"],
        },
      },

      // ========== NEW ARBITRUM NODE TOOLS ==========

      {
        name: "arb_check_publisher_health",
        description:
          "Check the health status of the transaction publisher/sequencer (requires admin API)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
          },
          required: [],
        },
      },
      {
        name: "arb_get_raw_block_metadata",
        description:
          "Retrieve raw block metadata for specified block ranges (requires admin API)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
            fromBlock: {
              type: "number",
              description: "Starting block number",
            },
            toBlock: {
              type: "number",
              description:
                "Ending block number (defaults to fromBlock if not provided)",
            },
          },
          required: ["fromBlock"],
        },
      },
      {
        name: "arb_latest_validated",
        description:
          "Get the latest validated global state information (requires admin API)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
          },
          required: [],
        },
      },
      {
        name: "arbtrace_call",
        description:
          "Trace individual calls with specified trace types (requires trace API)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
            callArgs: {
              type: "object",
              description: "Call arguments (to, from, data, etc.)",
            },
            traceTypes: {
              type: "array",
              description:
                "Array of trace types (e.g., ['trace', 'stateDiff'])",
              items: { type: "string" },
            },
            blockNumOrHash: {
              type: "string",
              description: "Block number or hash (defaults to 'latest')",
            },
          },
          required: ["callArgs"],
        },
      },
      {
        name: "arbtrace_callMany",
        description:
          "Trace multiple calls in batch for efficiency (requires trace API)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
            calls: {
              type: "array",
              description: "Array of call objects to trace",
              items: { type: "object" },
            },
            blockNumOrHash: {
              type: "string",
              description: "Block number or hash (defaults to 'latest')",
            },
          },
          required: ["calls"],
        },
      },
      {
        name: "arbtrace_replayBlockTransactions",
        description:
          "Replay and trace all transactions in a specific block (requires trace API)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
            blockNumOrHash: {
              type: "string",
              description: "Block number or hash to replay",
            },
            traceTypes: {
              type: "array",
              description:
                "Array of trace types (e.g., ['trace', 'stateDiff'])",
              items: { type: "string" },
            },
          },
          required: ["blockNumOrHash"],
        },
      },
      {
        name: "arbtrace_replayTransaction",
        description:
          "Replay and trace a specific transaction (requires trace API)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
            txHash: {
              type: "string",
              description: "Transaction hash to replay",
            },
            traceTypes: {
              type: "array",
              description:
                "Array of trace types (e.g., ['trace', 'stateDiff'])",
              items: { type: "string" },
            },
          },
          required: ["txHash"],
        },
      },
      {
        name: "arbtrace_transaction",
        description:
          "Get trace information for a specific transaction (requires trace API)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
            txHash: {
              type: "string",
              description: "Transaction hash to trace",
            },
          },
          required: ["txHash"],
        },
      },
      {
        name: "arbtrace_get",
        description:
          "Get specific trace data at a given path within a transaction (requires trace API)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
            txHash: {
              type: "string",
              description: "Transaction hash",
            },
            path: {
              type: "array",
              description: "Path to specific trace data",
              items: { type: "string" },
            },
          },
          required: ["txHash"],
        },
      },
      {
        name: "arbtrace_block",
        description:
          "Get trace information for all transactions in a block (requires trace API)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
            blockNumOrHash: {
              type: "string",
              description: "Block number or hash to trace",
            },
          },
          required: ["blockNumOrHash"],
        },
      },
      {
        name: "arbtrace_filter",
        description:
          "Filter traces based on specified criteria (requires trace API)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
            filter: {
              type: "object",
              description: "Filter criteria for traces",
            },
          },
          required: ["filter"],
        },
      },
      {
        name: "arbdebug_validateMessageNumber",
        description: "Validate a specific message number (requires debug API)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
            msgNum: {
              type: "number",
              description: "Message number to validate",
            },
            full: {
              type: "boolean",
              description: "Whether to perform full validation",
            },
            moduleRoot: {
              type: "string",
              description: "Optional module root hash",
            },
          },
          required: ["msgNum"],
        },
      },
      {
        name: "arbdebug_validationInputsAt",
        description:
          "Get validation inputs at a specific message (requires debug API)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
            msgNum: {
              type: "number",
              description: "Message number to get validation inputs for",
            },
            target: {
              type: "string",
              description: "Target for validation inputs",
            },
          },
          required: ["msgNum"],
        },
      },
      {
        name: "maintenance_status",
        description:
          "Check maintenance status - seconds since last maintenance (requires admin API)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
          },
          required: [],
        },
      },
      {
        name: "maintenance_trigger",
        description:
          "Manually trigger maintenance operations (requires admin API)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
          },
          required: [],
        },
      },
      {
        name: "timeboost_sendExpressLaneTransaction",
        description:
          "Submit priority transactions through express lanes for faster processing (requires timeboost API)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
            submission: {
              type: "object",
              description: "Express lane submission data",
            },
          },
          required: ["submission"],
        },
      },
      {
        name: "auctioneer_submitAuctionResolutionTransaction",
        description:
          "Submit auction resolution transactions for express lane functionality (requires auctioneer API)",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum node (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
            transaction: {
              type: "object",
              description: "Auction resolution transaction data",
            },
          },
          required: ["transaction"],
        },
      },

      // ========== MONITORING TOOLS ==========

      {
        name: "batch_posting_status",
        description:
          "Monitor batch posting activity. Tracks when batches were last posted to the sequencer inbox and current backlog size. Essential for PM and support teams to understand chain data availability status.",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum chain (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
            parentRpcUrl: {
              type: "string",
              description: "Parent chain RPC URL (e.g., Ethereum mainnet RPC)",
            },
            sequencerInboxAddress: {
              type: "string",
              description: "Sequencer inbox contract address",
            },
            bridgeAddress: {
              type: "string",
              description: "Bridge contract address",
            },
          },
          required: ["parentRpcUrl", "sequencerInboxAddress", "bridgeAddress"],
        },
      },
      {
        name: "assertion_status",
        description:
          "Monitor assertion creation and confirmation activity. Tracks NodeCreated vs NodeConfirmed events to understand rollup validation status. Critical for PM and support teams to monitor chain security and finality.",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum chain (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
            parentRpcUrl: {
              type: "string",
              description: "Parent chain RPC URL (e.g., Ethereum mainnet RPC)",
            },
            rollupAddress: {
              type: "string",
              description: "Rollup contract address",
            },
          },
          required: ["parentRpcUrl", "rollupAddress"],
        },
      },
      {
        name: "gas_status",
        description:
          "Monitor current gas prices on the chain. Essential for identifying gas price spikes and understanding transaction costs. Useful for PM and support teams to monitor network congestion.",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum chain (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve to RPC URL",
            },
          },
          required: [],
        },
      },
      {
        name: "comprehensive_chain_status",
        description:
          "Get comprehensive chain status including ArbOS version, batch posting, assertion monitoring, and gas prices. Perfect for PM and support teams asking 'what is the current status of XAI?' or similar comprehensive status checks. Auto-resolves contract addresses from chain name when possible.",
        inputSchema: {
          type: "object" as const,
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "The RPC URL of the Arbitrum chain (optional if default is set)",
            },
            chainName: {
              type: "string",
              description:
                "Chain name (e.g., 'Xai', 'Arbitrum One') - will auto-resolve RPC URL and contract addresses",
            },
            parentRpcUrl: {
              type: "string",
              description: "Parent chain RPC URL (auto-resolved if chainName provided)",
            },
            sequencerInboxAddress: {
              type: "string",
              description: "Sequencer inbox contract address (auto-resolved if chainName provided)",
            },
            bridgeAddress: {
              type: "string",
              description: "Bridge contract address (auto-resolved if chainName provided)",
            },
            rollupAddress: {
              type: "string",
              description: "Rollup contract address (auto-resolved if chainName provided)",
            },
          },
          required: [],
        },
      },
    ];
    console.error(`ArbitrumMCPServer: Created ${tools.length} tools`);
    return tools;
  }

  async run() {
    try {
      console.error("Starting Arbitrum MCP Server...");
      const transport = new StdioServerTransport();
      console.error("Transport created, connecting...");
      await this.server.connect(transport);
      console.error("Server connected successfully!");
    } catch (error) {
      console.error("Error starting server:", error);
      throw error;
    }
  }
}

console.error("ArbitrumMCPServer: Starting initialization");
const server = new ArbitrumMCPServer();
console.error("ArbitrumMCPServer: Server created, calling run()");
server.run().catch((error) => {
  console.error("ArbitrumMCPServer: Fatal error:", error);
  process.exit(1);
});
