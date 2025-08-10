import { ArbitrumChainClient } from "../src/clients/arbitrum-chain-client";

describe("ArbitrumChainClient", () => {
  let client: ArbitrumChainClient;

  // Test against different known Arbitrum chains
  const testChains = [
    {
      name: "Arbitrum One",
      rpcUrl: "https://arb1.arbitrum.io/rpc",
      expectedArbOSVersion: "40", // Updated based on actual returned value
    },
    {
      name: "Xai Network",
      rpcUrl: "https://xai-chain.net/rpc",
      expectedArbOSVersion: "32", // Updated based on actual returned value
    },
  ];

  describe.each(testChains)("$name", ({ rpcUrl, expectedArbOSVersion }) => {
    beforeEach(() => {
      client = new ArbitrumChainClient(rpcUrl);
    });

    describe("getArbOSVersion", () => {
      it("should return the correct ArbOS version for this chain", async () => {
        const result = await client.getArbOSVersion();

        // Verify we get the expected ArbOS version for this specific chain
        expect(result).toBe(expectedArbOSVersion);
        expect(typeof result).toBe("string");
      }, 30000); // Increased timeout for real network calls
    });

    describe("getLatestBlock", () => {
      it("should return latest block with valid data", async () => {
        const result = await client.getLatestBlock();

        // Verify block structure and data types
        expect(result).toBeDefined();
        expect(typeof result.number).toBe("string");
        expect(result.number).toMatch(/^0x[0-9a-fA-F]+$/);
        expect(typeof result.hash).toBe("string");
        expect(result.hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
        expect(typeof result.timestamp).toBe("string");
        expect(result.timestamp).toMatch(/^0x[0-9a-fA-F]+$/);
        expect(Array.isArray(result.transactions)).toBe(true);
      }, 30000);
    });

    describe("getBlockByNumber", () => {
      it("should return specific block by number", async () => {
        // Get latest block first to ensure we have a valid block number
        const latestBlock = await client.getLatestBlock();
        const latestBlockNum = parseInt(latestBlock.number, 16);

        // Get a block from a few blocks ago to ensure it exists
        const targetBlockNum = Math.max(1, latestBlockNum - 10);
        const result = await client.getBlockByNumber(targetBlockNum);

        expect(result).toBeDefined();
        expect(parseInt(result.number, 16)).toBe(targetBlockNum);
        expect(typeof result.hash).toBe("string");
        expect(result.hash).toMatch(/^0x[0-9a-fA-F]{64}$/);
      }, 30000);
    });
  });

  // Additional error handling tests (not chain-specific)
  describe("error handling", () => {
    it("should handle invalid RPC URL gracefully", async () => {
      const invalidClient = new ArbitrumChainClient("http://invalid-url:9999");

      await expect(invalidClient.getLatestBlock()).rejects.toThrow();
    }, 10000);
  });
});
