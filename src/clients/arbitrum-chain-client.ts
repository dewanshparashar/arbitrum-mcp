// Arbitrum/Orbit chain specific information

import { createPublicClient, http, parseAbi } from "viem";
import { getArbOSVersion } from "@arbitrum/orbit-sdk/utils";

export interface BatchPostingStatus {
  lastBatchPostedSecondsAgo: number;
  lastBlockReported: string;
  latestChildChainBlockNumber: string;
  backlogSize: string;
  summary: string;
}

export interface AssertionStatus {
  latestCreatedAssertion: string | null;
  latestConfirmedAssertion: string | null;
  creationConfirmationGap: string;
  summary: string;
}

export interface GasStatus {
  currentGasPrice: string; // in wei
  currentGasPriceGwei: string; // in gwei for readability
  summary: string;
}

export interface ChainStatus {
  chainName: string;
  arbosVersion: string;
  batchPosting: BatchPostingStatus;
  assertions: AssertionStatus;
  gasStatus: GasStatus;
}

export class ArbitrumChainClient {
  private rpcUrl: string;
  private publicClient: any;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
    this.publicClient = createPublicClient({
      transport: http(rpcUrl),
    });
  }

  async getArbOSVersion(): Promise<string> {
    try {
      // Try using orbit-sdk first
      const version = await getArbOSVersion(this.publicClient);
      return version.toString();
    } catch (error) {
      // Fallback to direct RPC call
      try {
        const version = await this.makeRpcCall("arb_getVersion", []);
        return version;
      } catch (rpcError) {
        // Return "Unknown" instead of throwing error for better UX
        return "Unknown (RPC does not support ArbOS version queries)";
      }
    }
  }

  async getLatestBlock(): Promise<any> {
    return await this.makeRpcCall("eth_getBlockByNumber", ["latest", false]);
  }

  async getBlockByNumber(blockNumber: number): Promise<any> {
    const hexBlockNumber = "0x" + blockNumber.toString(16);
    return await this.makeRpcCall("eth_getBlockByNumber", [
      hexBlockNumber,
      false,
    ]);
  }

  async getBatchPostingStatus(
    parentRpcUrl: string,
    sequencerInboxAddress: string,
    bridgeAddress: string
  ): Promise<BatchPostingStatus> {
    try {
      const parentClient = createPublicClient({
        transport: http(parentRpcUrl),
      });

      const sequencerBatchDeliveredEventAbi = {
        anonymous: false,
        inputs: [
          { indexed: true, name: "batchSequenceNumber", type: "uint256" },
          { indexed: true, name: "beforeAcc", type: "bytes32" },
          { indexed: true, name: "afterAcc", type: "bytes32" },
          { indexed: false, name: "delayedAcc", type: "bytes32" },
          { indexed: false, name: "afterDelayedMessagesRead", type: "uint256" },
          {
            components: [
              { name: "minTimestamp", type: "uint64" },
              { name: "maxTimestamp", type: "uint64" },
              { name: "minBlockNumber", type: "uint64" },
              { name: "maxBlockNumber", type: "uint64" },
            ],
            name: "timeBounds",
            type: "tuple",
          },
          { name: "dataLocation", type: "uint8" },
        ],
        name: "SequencerBatchDelivered",
        type: "event",
      } as const;

      const latestBlockNumber = await parentClient.getBlockNumber();
      const fromBlock = latestBlockNumber - BigInt(10000);

      const logs = await parentClient.getLogs({
        address: sequencerInboxAddress as `0x${string}`,
        event: sequencerBatchDeliveredEventAbi,
        fromBlock,
        toBlock: latestBlockNumber,
      });

      if (logs.length === 0) {
        return {
          lastBatchPostedSecondsAgo: 999999,
          lastBlockReported: "0",
          latestChildChainBlockNumber: "0",
          backlogSize: "0",
          summary: "No batches found in recent blocks"
        };
      }

      const lastLog = logs[logs.length - 1];
      const lastBatchBlock = await parentClient.getBlock({
        blockNumber: lastLog.blockNumber,
      });
      
      const lastBatchPostedSecondsAgo = Math.floor(Date.now() / 1000) - Number(lastBatchBlock.timestamp);

      const lastBlockReported = await parentClient.readContract({
        address: bridgeAddress as `0x${string}`,
        abi: parseAbi([
          'function sequencerReportedSubMessageCount() view returns (uint256)',
        ]),
        functionName: 'sequencerReportedSubMessageCount',
      });

      const latestChildChainBlockNumber = await this.publicClient.getBlockNumber();
      const backlogSize = latestChildChainBlockNumber - lastBlockReported;

      const summary = `Last batch posted ${Math.floor(lastBatchPostedSecondsAgo / 3600)}h ${Math.floor((lastBatchPostedSecondsAgo % 3600) / 60)}m ago. Backlog: ${backlogSize} blocks.`;

      return {
        lastBatchPostedSecondsAgo,
        lastBlockReported: lastBlockReported.toString(),
        latestChildChainBlockNumber: latestChildChainBlockNumber.toString(),
        backlogSize: backlogSize.toString(),
        summary
      };
    } catch (error) {
      return {
        lastBatchPostedSecondsAgo: 999999,
        lastBlockReported: "0",
        latestChildChainBlockNumber: "0",
        backlogSize: "0",
        summary: `Error checking batch posting: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getAssertionStatus(
    parentRpcUrl: string,
    rollupAddress: string
  ): Promise<AssertionStatus> {
    try {
      const parentClient = createPublicClient({
        transport: http(parentRpcUrl),
      });

      const nodeCreatedEventAbi = {
        anonymous: false,
        inputs: [
          { indexed: true, name: "nodeNum", type: "uint64" },
          { indexed: true, name: "parentNodeHash", type: "bytes32" },
          { indexed: true, name: "nodeHash", type: "bytes32" },
          { indexed: false, name: "executionHash", type: "bytes32" },
        ],
        name: "NodeCreated",
        type: "event",
      } as const;

      const nodeConfirmedEventAbi = {
        anonymous: false,
        inputs: [
          { indexed: true, name: "nodeNum", type: "uint64" },
          { indexed: false, name: "blockHash", type: "bytes32" },
          { indexed: false, name: "sendRoot", type: "bytes32" },
        ],
        name: "NodeConfirmed",
        type: "event",
      } as const;

      const latestBlockNumber = await parentClient.getBlockNumber();
      const fromBlock = latestBlockNumber - BigInt(50000);

      const [createdLogs, confirmedLogs] = await Promise.all([
        parentClient.getLogs({
          address: rollupAddress as `0x${string}`,
          event: nodeCreatedEventAbi,
          fromBlock,
          toBlock: latestBlockNumber,
        }),
        parentClient.getLogs({
          address: rollupAddress as `0x${string}`,
          event: nodeConfirmedEventAbi,
          fromBlock,
          toBlock: latestBlockNumber,
        })
      ]);

      const latestCreatedAssertion = createdLogs.length > 0 
        ? createdLogs[createdLogs.length - 1].args?.nodeNum || null
        : null;

      const latestConfirmedAssertion = confirmedLogs.length > 0 
        ? confirmedLogs[confirmedLogs.length - 1].args?.nodeNum || null
        : null;

      const creationConfirmationGap = (latestCreatedAssertion && latestConfirmedAssertion) 
        ? latestCreatedAssertion - latestConfirmedAssertion 
        : 0n;

      const summary = `Latest created assertion: ${latestCreatedAssertion || 'None'}, Latest confirmed: ${latestConfirmedAssertion || 'None'}. Gap: ${creationConfirmationGap}`;

      return {
        latestCreatedAssertion: latestCreatedAssertion ? latestCreatedAssertion.toString() : null,
        latestConfirmedAssertion: latestConfirmedAssertion ? latestConfirmedAssertion.toString() : null,
        creationConfirmationGap: creationConfirmationGap.toString(),
        summary
      };
    } catch (error) {
      return {
        latestCreatedAssertion: null,
        latestConfirmedAssertion: null,
        creationConfirmationGap: "0",
        summary: `Error checking assertions: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getGasStatus(): Promise<GasStatus> {
    try {
      const gasPrice = await this.publicClient.getGasPrice();
      const gasPriceGwei = (Number(gasPrice) / 1e9).toFixed(2);
      
      const summary = `Current gas price: ${gasPriceGwei} gwei (${gasPrice.toString()} wei)`;

      return {
        currentGasPrice: gasPrice.toString(),
        currentGasPriceGwei: gasPriceGwei,
        summary
      };
    } catch (error) {
      return {
        currentGasPrice: "0",
        currentGasPriceGwei: "0",
        summary: `Error checking gas price: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getComprehensiveChainStatus(
    chainName: string,
    parentRpcUrl: string,
    sequencerInboxAddress: string,
    bridgeAddress: string,
    rollupAddress: string
  ): Promise<ChainStatus> {
    // Use Promise.allSettled to handle individual failures gracefully
    const results = await Promise.allSettled([
      this.getArbOSVersion(),
      this.getBatchPostingStatus(parentRpcUrl, sequencerInboxAddress, bridgeAddress),
      this.getAssertionStatus(parentRpcUrl, rollupAddress),
      this.getGasStatus()
    ]);

    const arbosVersion = results[0].status === 'fulfilled' 
      ? results[0].value 
      : "Error retrieving ArbOS version";

    const batchPosting = results[1].status === 'fulfilled' 
      ? results[1].value 
      : {
          lastBatchPostedSecondsAgo: 999999,
          lastBlockReported: "0",
          latestChildChainBlockNumber: "0",
          backlogSize: "0",
          summary: "Error retrieving batch posting status"
        };

    const assertions = results[2].status === 'fulfilled' 
      ? results[2].value 
      : {
          latestCreatedAssertion: null,
          latestConfirmedAssertion: null,
          creationConfirmationGap: "0",
          summary: "Error retrieving assertion status"
        };

    const gasStatus = results[3].status === 'fulfilled' 
      ? results[3].value 
      : {
          currentGasPrice: "0",
          currentGasPriceGwei: "0",
          summary: "Error retrieving gas status"
        };

    return {
      chainName,
      arbosVersion,
      batchPosting,
      assertions,
      gasStatus
    };
  }

  private async makeRpcCall(method: string, params: any[]): Promise<any> {
    const response = await fetch(this.rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`RPC Error: ${data.error.message}`);
    }

    return data.result;
  }
}
