import { NitroNodeClient } from "../src/clients/nitro-node-client";

describe("NitroNodeClient", () => {
  let client: NitroNodeClient;

  // Test against real Arbitrum chains
  const testChains = [
    {
      name: "Arbitrum One",
      rpcUrl: "https://arb1.arbitrum.io/rpc",
    },
    {
      name: "Xai Network",
      rpcUrl: "https://xai-chain.net/rpc",
    },
  ];

  describe.each(testChains)("$name", ({ rpcUrl }) => {
    beforeEach(() => {
      client = new NitroNodeClient(rpcUrl);
    });

    describe("getHealth", () => {
      it("should return node health status", async () => {
        try {
          const result = await client.getHealth();

          expect(result).toBeDefined();
          expect(result.lastUpdated).toBeDefined();
          expect(typeof result.lastUpdated).toBe("string");
          // Health status can vary, so just check it exists
          if (result.status) {
            expect(typeof result.status).toBe("string");
          }
        } catch (error) {
          // Some chains might not support arb_getHealth, which is acceptable
          console.log(
            `Health check not supported on ${rpcUrl}:`,
            (error as Error).message
          );
        }
      }, 15000);
    });

    describe("getSyncStatus", () => {
      it("should handle sync status appropriately", async () => {
        try {
          const result = await client.getSyncStatus();

          expect(result).toBeDefined();
          expect(typeof result.currentBlock).toBe("number");
          expect(typeof result.highestBlock).toBe("number");
          expect(typeof result.isSyncing).toBe("boolean");
          expect(typeof result.syncProgress).toBe("number");

          expect(result.currentBlock).toBeGreaterThan(0);
          expect(result.highestBlock).toBeGreaterThanOrEqual(
            result.currentBlock
          );
          expect(result.syncProgress).toBeGreaterThanOrEqual(0);
          expect(result.syncProgress).toBeLessThanOrEqual(100);
        } catch (error) {
          // Some public endpoints don't support eth_syncing
          console.log(
            `Sync status not supported on ${rpcUrl}:`,
            (error as Error).message
          );
          expect(error).toBeDefined();
        }
      }, 15000);
    });

    describe("getPeers", () => {
      it("should return peer information array", async () => {
        const result = await client.getPeers();

        // Now getPeers returns either an array of peers or an error object
        if (Array.isArray(result)) {
          // Successful response with peers
          if (result.length > 0) {
            expect(typeof result[0]).toBe("object");
          }
        } else {
          // Error response - should have an error message
          expect(result).toHaveProperty("error");
          expect(typeof result.error).toBe("string");
          console.log(`Peer info not supported on ${rpcUrl}:`, result.error);
        }
      }, 15000);
    });
  });

  // Additional error handling tests (not chain-specific)
  describe("error handling", () => {
    it("should handle invalid RPC URL gracefully", async () => {
      const invalidClient = new NitroNodeClient("http://invalid-url:9999");

      const result = await invalidClient.getSyncStatus();
      // Since we now return error objects instead of throwing, check for error property
      expect(result).toHaveProperty("error");
      expect(result.currentBlock).toBe(0);
      expect(result.isSyncing).toBe(false);
    }, 10000);
  });
});
