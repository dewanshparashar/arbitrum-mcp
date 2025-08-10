import axios from 'axios';
import { getArbitrumNetwork } from '@arbitrum/sdk';

export interface OrbitChainData {
  chainId: number;
  name: string;
  slug: string;
  parentChainId: number;
  rpcUrl: string;
  explorerUrl?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isArbitrum: boolean;
  isMainnet: boolean;
  isCustom?: boolean;
  isTestnet?: boolean;
  
  // Ethereum Bridge Contract Addresses (nested under ethBridge)
  ethBridge?: {
    bridge: string;
    inbox: string;
    outbox: string;
    rollup: string;
    sequencerInbox: string;
  };
  
  // Legacy flat structure for backward compatibility
  bridge?: string;
  inbox?: string;
  outbox?: string;
  rollup?: string;
  sequencerInbox?: string;
  
  // Token Bridge Contract Addresses
  parentCustomGateway?: string;
  parentErc20Gateway?: string;
  parentGatewayRouter?: string;
  childCustomGateway?: string;
  childErc20Gateway?: string;
  childGatewayRouter?: string;
  
  // UI Configuration
  color?: string;
  description?: string;
  logo?: string;
  
  // Native Token (for custom tokens)
  nativeToken?: {
    name: string;
    symbol: string;
    decimals: number;
    address?: string;
  };
}

export class ChainLookupService {
  private static instance: ChainLookupService;
  private chainsData: OrbitChainData[] = [];
  private lastFetched: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CHAINS_DATA_URL = 'https://raw.githubusercontent.com/OffchainLabs/arbitrum-token-bridge/master/packages/arb-token-bridge-ui/src/util/orbitChainsData.json';
  
  // Core Arbitrum chain IDs
  private readonly ARBITRUM_ONE_CHAIN_ID = 42161;
  private readonly ARBITRUM_NOVA_CHAIN_ID = 42170;

  private constructor() {}

  static getInstance(): ChainLookupService {
    if (!ChainLookupService.instance) {
      ChainLookupService.instance = new ChainLookupService();
    }
    return ChainLookupService.instance;
  }

  private getCoreArbitrumChains(): OrbitChainData[] {
    const coreChains: OrbitChainData[] = [];
    
    try {
      // Add Arbitrum One
      const arbOneNetwork = getArbitrumNetwork(this.ARBITRUM_ONE_CHAIN_ID);
      coreChains.push({
        chainId: arbOneNetwork.chainId,
        name: arbOneNetwork.name,
        slug: 'arbitrum-one',
        parentChainId: arbOneNetwork.parentChainId,
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        explorerUrl: 'https://arbiscan.io/',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        isArbitrum: true,
        isMainnet: true,
        isCustom: false,
        isTestnet: false,
        ethBridge: {
          bridge: arbOneNetwork.ethBridge.bridge,
          inbox: arbOneNetwork.ethBridge.inbox,
          outbox: arbOneNetwork.ethBridge.outbox,
          rollup: arbOneNetwork.ethBridge.rollup,
          sequencerInbox: arbOneNetwork.ethBridge.sequencerInbox,
        },
        parentCustomGateway: arbOneNetwork.tokenBridge?.parentCustomGateway,
        parentErc20Gateway: arbOneNetwork.tokenBridge?.parentErc20Gateway,
        parentGatewayRouter: arbOneNetwork.tokenBridge?.parentGatewayRouter,
        childCustomGateway: arbOneNetwork.tokenBridge?.childCustomGateway,
        childErc20Gateway: arbOneNetwork.tokenBridge?.childErc20Gateway,
        childGatewayRouter: arbOneNetwork.tokenBridge?.childGatewayRouter,
      });

      // Add Arbitrum Nova
      const novaNetwork = getArbitrumNetwork(this.ARBITRUM_NOVA_CHAIN_ID);
      coreChains.push({
        chainId: novaNetwork.chainId,
        name: novaNetwork.name,
        slug: 'arbitrum-nova',
        parentChainId: novaNetwork.parentChainId,
        rpcUrl: 'https://nova.arbitrum.io/rpc',
        explorerUrl: 'https://nova.arbiscan.io/',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        isArbitrum: true,
        isMainnet: true,
        isCustom: false,
        isTestnet: false,
        ethBridge: {
          bridge: novaNetwork.ethBridge.bridge,
          inbox: novaNetwork.ethBridge.inbox,
          outbox: novaNetwork.ethBridge.outbox,
          rollup: novaNetwork.ethBridge.rollup,
          sequencerInbox: novaNetwork.ethBridge.sequencerInbox,
        },
        parentCustomGateway: novaNetwork.tokenBridge?.parentCustomGateway,
        parentErc20Gateway: novaNetwork.tokenBridge?.parentErc20Gateway,
        parentGatewayRouter: novaNetwork.tokenBridge?.parentGatewayRouter,
        childCustomGateway: novaNetwork.tokenBridge?.childCustomGateway,
        childErc20Gateway: novaNetwork.tokenBridge?.childErc20Gateway,
        childGatewayRouter: novaNetwork.tokenBridge?.childGatewayRouter,
      });
    } catch (error) {
      console.error('Failed to get core Arbitrum chains:', error);
    }
    
    return coreChains;
  }

  private async fetchChainsData(): Promise<void> {
    try {
      console.error('Fetching orbit chains data from GitHub...');
      const response = await axios.get(this.CHAINS_DATA_URL, { timeout: 10000 });
      
      // The data structure has mainnet and testnet arrays
      const data = response.data;
      const orbitChains = [...(data.mainnet || []), ...(data.testnet || [])];
      
      // Add core Arbitrum chains
      const coreChains = this.getCoreArbitrumChains();
      
      // Combine orbit chains and core chains
      this.chainsData = [...coreChains, ...orbitChains];
      
      this.lastFetched = Date.now();
      console.error(`Loaded ${this.chainsData.length} chains (${coreChains.length} core + ${orbitChains.length} orbit: ${data.mainnet?.length || 0} mainnet, ${data.testnet?.length || 0} testnet)`);
    } catch (error) {
      console.error('Failed to fetch chains data:', error);
      throw new Error('Unable to fetch chains data');
    }
  }

  private async ensureChainsData(): Promise<void> {
    if (this.chainsData.length === 0 || Date.now() - this.lastFetched > this.CACHE_TTL) {
      await this.fetchChainsData();
    }
  }

  async findChainByName(name: string): Promise<OrbitChainData | null> {
    await this.ensureChainsData();
    
    const searchName = name.toLowerCase().trim();
    
    // Try exact name match first
    let chain = this.chainsData.find(chain => 
      chain.name.toLowerCase() === searchName
    );
    
    if (!chain) {
      // Try slug match
      chain = this.chainsData.find(chain => 
        chain.slug?.toLowerCase() === searchName
      );
    }
    
    if (!chain) {
      // Try partial name match
      chain = this.chainsData.find(chain => 
        chain.name.toLowerCase().includes(searchName) ||
        searchName.includes(chain.name.toLowerCase())
      );
    }
    
    return chain || null;
  }

  async findChainById(chainId: number): Promise<OrbitChainData | null> {
    await this.ensureChainsData();
    
    const chain = this.chainsData.find(chain => chain.chainId === chainId);
    return chain || null;
  }

  async getAllChains(): Promise<OrbitChainData[]> {
    await this.ensureChainsData();
    return [...this.chainsData];
  }

  async listChainNames(): Promise<string[]> {
    await this.ensureChainsData();
    return this.chainsData.map(chain => chain.name).sort();
  }

  async searchChains(query: string): Promise<OrbitChainData[]> {
    await this.ensureChainsData();
    
    const searchQuery = query.toLowerCase().trim();
    
    return this.chainsData.filter(chain => 
      chain.name.toLowerCase().includes(searchQuery) ||
      chain.slug?.toLowerCase().includes(searchQuery) ||
      chain.chainId.toString() === searchQuery
    );
  }
}