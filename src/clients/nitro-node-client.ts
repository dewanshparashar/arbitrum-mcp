// Nitro Node specific information

export interface NodeHealth {
  status: string;
  lastUpdated: string;
  error?: string;
}

export interface SyncStatus {
  currentBlock: number;
  highestBlock: number;
  isSyncing: boolean;
  syncProgress: number;
  error?: string;
}

export interface PeerInfo {
  id: string;
  name: string;
  caps: string[];
  network: {
    localAddress: string;
    remoteAddress: string;
  };
  protocols: Record<string, any>;
}

export interface BlockMetadata {
  blockNumber: number;
  metadata: string; // Raw metadata bytes as hex string
}

export interface ValidateBlockResult {
  valid: boolean;
  latency?: number;
  globalState?: any;
  error?: string;
}

export interface ValidationInputs {
  inputs: any;
  error?: string;
}

export interface MaintenanceStatus {
  secondsSinceLastMaintenance: number;
  error?: string;
}

export interface TraceResult {
  traces: any;
  error?: string;
}

export interface PublisherHealth {
  healthy: boolean;
  error?: string;
}

export class NitroNodeClient {
  private rpcUrl: string;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
  }

  // ========== LEGACY NODE STATUS METHODS ==========
  // (Keeping for backwards compatibility)

  async getHealth(): Promise<NodeHealth> {
    try {
      const response = await this.makeRpcCall("arb_getHealth", []);
      return {
        status: response.status || "unknown",
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "unavailable",
        lastUpdated: new Date().toISOString(),
        error:
          "Health check not supported on this RPC endpoint. This method typically requires access to a node's admin API.",
      };
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const syncResponse = await this.makeRpcCall("eth_syncing", []);
      const latestBlock = await this.makeRpcCall("eth_blockNumber", []);

      if (syncResponse === false) {
        return {
          currentBlock: parseInt(latestBlock, 16),
          highestBlock: parseInt(latestBlock, 16),
          isSyncing: false,
          syncProgress: 100,
        };
      }

      const current = parseInt(syncResponse.currentBlock, 16);
      const highest = parseInt(syncResponse.highestBlock, 16);

      return {
        currentBlock: current,
        highestBlock: highest,
        isSyncing: true,
        syncProgress: highest > 0 ? (current / highest) * 100 : 0,
      };
    } catch (error) {
      // Try to get at least the current block number as a fallback
      try {
        const latestBlock = await this.makeRpcCall("eth_blockNumber", []);
        const blockNum = parseInt(latestBlock, 16);
        return {
          currentBlock: blockNum,
          highestBlock: blockNum,
          isSyncing: false,
          syncProgress: 100,
          error:
            "Sync status not supported on this RPC endpoint. Showing current block number only.",
        };
      } catch (blockError) {
        return {
          currentBlock: 0,
          highestBlock: 0,
          isSyncing: false,
          syncProgress: 0,
          error:
            "Sync status not supported on this RPC endpoint. This method typically requires access to a node's debug API.",
        };
      }
    }
  }

  async getPeers(): Promise<PeerInfo[] | { error: string }> {
    try {
      const peers = await this.makeRpcCall("admin_peers", []);
      return peers.map((peer: any) => ({
        id: peer.id,
        name: peer.name,
        caps: peer.caps,
        network: peer.network,
        protocols: peer.protocols,
      }));
    } catch (error) {
      return {
        error:
          "Peer information not supported on this RPC endpoint. This method typically requires access to a node's admin API.",
      };
    }
  }

  // ========== CORE ARBITRUM METHODS (arb namespace) ==========

  async checkPublisherHealth(): Promise<PublisherHealth> {
    try {
      await this.makeRpcCall("arb_checkPublisherHealth", []);
      return {
        healthy: true,
      };
    } catch (error) {
      return {
        healthy: false,
        error: `Publisher health check failed or not supported on this RPC endpoint: ${
          (error as Error).message
        }`,
      };
    }
  }

  async getRawBlockMetadata(
    fromBlock: number,
    toBlock: number
  ): Promise<BlockMetadata[] | { error: string }> {
    try {
      const result = await this.makeRpcCall("arb_getRawBlockMetadata", [
        `0x${fromBlock.toString(16)}`,
        `0x${toBlock.toString(16)}`,
      ]);

      if (Array.isArray(result)) {
        return result.map((item: any) => ({
          blockNumber: parseInt(item.blockNumber, 16),
          metadata: item.metadata || item.rawMetadata,
        }));
      }

      return {
        error: "Unexpected response format from arb_getRawBlockMetadata",
      };
    } catch (error) {
      return {
        error: `Raw block metadata not supported on this RPC endpoint: ${
          (error as Error).message
        }`,
      };
    }
  }

  async getLatestValidated(): Promise<any> {
    try {
      return await this.makeRpcCall("arb_latestValidated", []);
    } catch (error) {
      return {
        error: `Latest validated state not supported on this RPC endpoint: ${
          (error as Error).message
        }`,
      };
    }
  }

  // ========== TRACE METHODS (arbtrace namespace) ==========

  async traceCall(
    callArgs: any,
    traceTypes: string[],
    blockNumOrHash?: string
  ): Promise<TraceResult> {
    try {
      const traces = await this.makeRpcCall("arbtrace_call", [
        callArgs,
        traceTypes,
        blockNumOrHash || "latest",
      ]);
      return { traces };
    } catch (error) {
      return {
        traces: null,
        error: `Trace call not supported on this RPC endpoint: ${
          (error as Error).message
        }`,
      };
    }
  }

  async traceCallMany(
    calls: any[],
    blockNumOrHash?: string
  ): Promise<TraceResult> {
    try {
      const traces = await this.makeRpcCall("arbtrace_callMany", [
        calls,
        blockNumOrHash || "latest",
      ]);
      return { traces };
    } catch (error) {
      return {
        traces: null,
        error: `Trace callMany not supported on this RPC endpoint: ${
          (error as Error).message
        }`,
      };
    }
  }

  async replayBlockTransactions(
    blockNumOrHash: string,
    traceTypes: string[]
  ): Promise<TraceResult> {
    try {
      const traces = await this.makeRpcCall(
        "arbtrace_replayBlockTransactions",
        [blockNumOrHash, traceTypes]
      );
      return { traces };
    } catch (error) {
      return {
        traces: null,
        error: `Trace replayBlockTransactions not supported on this RPC endpoint: ${
          (error as Error).message
        }`,
      };
    }
  }

  async replayTransaction(
    txHash: string,
    traceTypes: string[]
  ): Promise<TraceResult> {
    try {
      const traces = await this.makeRpcCall("arbtrace_replayTransaction", [
        txHash,
        traceTypes,
      ]);
      return { traces };
    } catch (error) {
      return {
        traces: null,
        error: `Trace replayTransaction not supported on this RPC endpoint: ${
          (error as Error).message
        }`,
      };
    }
  }

  async traceTransaction(txHash: string): Promise<TraceResult> {
    try {
      const traces = await this.makeRpcCall("arbtrace_transaction", [txHash]);
      return { traces };
    } catch (error) {
      return {
        traces: null,
        error: `Trace transaction not supported on this RPC endpoint: ${
          (error as Error).message
        }`,
      };
    }
  }

  async traceGet(txHash: string, path: string[]): Promise<TraceResult> {
    try {
      const traces = await this.makeRpcCall("arbtrace_get", [txHash, path]);
      return { traces };
    } catch (error) {
      return {
        traces: null,
        error: `Trace get not supported on this RPC endpoint: ${
          (error as Error).message
        }`,
      };
    }
  }

  async traceBlock(blockNumOrHash: string): Promise<TraceResult> {
    try {
      const traces = await this.makeRpcCall("arbtrace_block", [blockNumOrHash]);
      return { traces };
    } catch (error) {
      return {
        traces: null,
        error: `Trace block not supported on this RPC endpoint: ${
          (error as Error).message
        }`,
      };
    }
  }

  async traceFilter(filter: any): Promise<TraceResult> {
    try {
      const traces = await this.makeRpcCall("arbtrace_filter", [filter]);
      return { traces };
    } catch (error) {
      return {
        traces: null,
        error: `Trace filter not supported on this RPC endpoint: ${
          (error as Error).message
        }`,
      };
    }
  }

  // ========== DEBUG METHODS (arbdebug namespace) ==========

  async validateMessageNumber(
    msgNum: number,
    full: boolean = false,
    moduleRoot?: string
  ): Promise<ValidateBlockResult> {
    try {
      const params = [`0x${msgNum.toString(16)}`, full];
      if (moduleRoot) {
        params.push(moduleRoot);
      }

      const result = await this.makeRpcCall(
        "arbdebug_validateMessageNumber",
        params
      );
      return {
        valid: result.valid || true,
        latency: result.latency,
        globalState: result.globalState,
      };
    } catch (error) {
      return {
        valid: false,
        error: `Validate message number not supported on this RPC endpoint: ${
          (error as Error).message
        }`,
      };
    }
  }

  async getValidationInputsAt(
    msgNum: number,
    target?: string
  ): Promise<ValidationInputs> {
    try {
      const params = [`0x${msgNum.toString(16)}`];
      if (target) {
        params.push(target);
      }

      const inputs = await this.makeRpcCall(
        "arbdebug_validationInputsAt",
        params
      );
      return { inputs };
    } catch (error) {
      return {
        inputs: null,
        error: `Validation inputs not supported on this RPC endpoint: ${
          (error as Error).message
        }`,
      };
    }
  }

  // ========== MAINTENANCE METHODS ==========

  async getMaintenanceStatus(): Promise<MaintenanceStatus> {
    try {
      const seconds = await this.makeRpcCall(
        "maintenance_secondsSinceLastMaintenance",
        []
      );
      return {
        secondsSinceLastMaintenance:
          typeof seconds === "number" ? seconds : parseInt(seconds, 10),
      };
    } catch (error) {
      return {
        secondsSinceLastMaintenance: -1,
        error: `Maintenance status not supported on this RPC endpoint: ${
          (error as Error).message
        }`,
      };
    }
  }

  async triggerMaintenance(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.makeRpcCall("maintenance_trigger", []);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Trigger maintenance not supported on this RPC endpoint: ${
          (error as Error).message
        }`,
      };
    }
  }

  // ========== TIMEBOOST METHODS ==========

  async sendExpressLaneTransaction(
    submission: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.makeRpcCall("timeboost_sendExpressLaneTransaction", [
        submission,
      ]);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Express lane transaction not supported on this RPC endpoint: ${
          (error as Error).message
        }`,
      };
    }
  }

  // ========== AUCTIONEER METHODS ==========

  async submitAuctionResolutionTransaction(
    tx: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.makeRpcCall("auctioneer_submitAuctionResolutionTransaction", [
        tx,
      ]);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Auction resolution transaction not supported on this RPC endpoint: ${
          (error as Error).message
        }`,
      };
    }
  }

  // ========== UTILITY METHODS ==========

  private async makeRpcCall(method: string, params: any[]): Promise<any> {
    try {
      const requestBody = {
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params,
      };

      console.error(`Making RPC call to ${this.rpcUrl}: ${method}`);
      
      const response = await fetch(this.rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      console.error(`RPC call failed for ${method} on ${this.rpcUrl}:`, error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Unknown error during RPC call: ${String(error)}`);
      }
    }
  }
}
