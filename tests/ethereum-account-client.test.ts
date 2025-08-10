import { EthereumAccountClient } from '../src/clients/ethereum-account-client';

describe('EthereumAccountClient', () => {
  let client: EthereumAccountClient;

  // Test against real Arbitrum chains
  const testChains = [
    {
      name: 'Arbitrum One',
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      // Well-known addresses with expected behavior
      knownAddresses: {
        contract: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH contract on Arbitrum
        eoa: '0x000000000000000000000000000000000000dEaD', // Burn address (EOA)
      }
    }
  ];

  describe.each(testChains)('$name', ({ rpcUrl, knownAddresses }) => {
    beforeEach(() => {
      client = new EthereumAccountClient(rpcUrl);
    });

    describe('getBalance', () => {
      it('should return balance in wei for contract address', async () => {
        const result = await client.getBalance(knownAddresses.contract);
        
        expect(typeof result).toBe('string');
        expect(result).toMatch(/^0x[0-9a-fA-F]+$/);
      }, 15000);

      it('should return balance in wei for EOA address', async () => {
        const result = await client.getBalance(knownAddresses.eoa);
        
        expect(typeof result).toBe('string');
        expect(result).toMatch(/^0x[0-9a-fA-F]+$/);
      }, 15000);
    });

    describe('getBalanceInEther', () => {
      it('should return balance in ETH format', async () => {
        const result = await client.getBalanceInEther(knownAddresses.contract);
        
        expect(typeof result).toBe('string');
        expect(parseFloat(result)).toBeGreaterThanOrEqual(0);
      }, 15000);
    });

    describe('getTransactionCount', () => {
      it('should return transaction count (nonce) for EOA', async () => {
        const result = await client.getTransactionCount(knownAddresses.eoa);
        
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(0);
      }, 15000);

      it('should return transaction count for contract', async () => {
        const result = await client.getTransactionCount(knownAddresses.contract);
        
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(0);
      }, 15000);
    });

    describe('getCode', () => {
      it('should return contract code for contract address', async () => {
        const result = await client.getCode(knownAddresses.contract);
        
        expect(typeof result).toBe('string');
        expect(result).toMatch(/^0x[0-9a-fA-F]+$/);
        expect(result.length).toBeGreaterThan(2); // More than just "0x"
      }, 15000);

      it('should return empty code for EOA address', async () => {
        const result = await client.getCode(knownAddresses.eoa);
        
        expect(result).toBe('0x');
      }, 15000);
    });

    describe('isContract', () => {
      it('should return true for contract addresses', async () => {
        const result = await client.isContract(knownAddresses.contract);
        
        expect(result).toBe(true);
      }, 15000);

      it('should return false for EOA addresses', async () => {
        const result = await client.isContract(knownAddresses.eoa);
        
        expect(result).toBe(false);
      }, 15000);
    });
  });

  // Additional error handling tests (not chain-specific)
  describe('error handling', () => {
    it('should throw error for invalid address format', async () => {
      const invalidClient = new EthereumAccountClient('https://arb1.arbitrum.io/rpc');
      const invalidAddress = '0xinvalid';
      
      await expect(invalidClient.getBalance(invalidAddress)).rejects.toThrow();
    }, 10000);
  });
});