export interface Transaction {
  hash: string;
  nonce: number;
  blockHash: string | null;
  blockNumber: number | null;
  transactionIndex: number | null;
  from: string;
  to: string | null;
  value: string;
  gasPrice: string;
  gas: number;
  input: string;
}

export interface Receipt {
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  blockNumber: number;
  from: string;
  to: string | null;
  cumulativeGasUsed: number;
  gasUsed: number;
  contractAddress: string | null;
  logs: any[];
  status: string;
}

export class EthereumAccountClient {
  private rpcUrl: string;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
  }

  async getBalance(address: string): Promise<string> {
    const balance = await this.makeRpcCall('eth_getBalance', [address, 'latest']);
    return balance;
  }

  async getBalanceInEther(address: string): Promise<string> {
    const weiBalance = await this.getBalance(address);
    const wei = BigInt(weiBalance);
    const ether = wei / BigInt('1000000000000000000');
    const remainder = wei % BigInt('1000000000000000000');
    
    if (remainder === BigInt(0)) {
      return ether.toString();
    } else {
      const etherDecimal = Number(wei) / 1e18;
      return etherDecimal.toFixed(6).replace(/\.?0+$/, '');
    }
  }

  async getTransaction(txHash: string): Promise<Transaction> {
    const tx = await this.makeRpcCall('eth_getTransactionByHash', [txHash]);
    if (!tx) {
      throw new Error(`Transaction ${txHash} not found`);
    }
    
    return {
      hash: tx.hash,
      nonce: parseInt(tx.nonce, 16),
      blockHash: tx.blockHash,
      blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 16) : null,
      transactionIndex: tx.transactionIndex ? parseInt(tx.transactionIndex, 16) : null,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gasPrice: tx.gasPrice,
      gas: parseInt(tx.gas, 16),
      input: tx.input
    };
  }

  async getTransactionReceipt(txHash: string): Promise<Receipt> {
    const receipt = await this.makeRpcCall('eth_getTransactionReceipt', [txHash]);
    if (!receipt) {
      throw new Error(`Transaction receipt for ${txHash} not found`);
    }
    
    return {
      transactionHash: receipt.transactionHash,
      transactionIndex: parseInt(receipt.transactionIndex, 16),
      blockHash: receipt.blockHash,
      blockNumber: parseInt(receipt.blockNumber, 16),
      from: receipt.from,
      to: receipt.to,
      cumulativeGasUsed: parseInt(receipt.cumulativeGasUsed, 16),
      gasUsed: parseInt(receipt.gasUsed, 16),
      contractAddress: receipt.contractAddress,
      logs: receipt.logs,
      status: receipt.status
    };
  }

  async getTransactionCount(address: string): Promise<number> {
    const count = await this.makeRpcCall('eth_getTransactionCount', [address, 'latest']);
    return parseInt(count, 16);
  }

  async getCode(address: string): Promise<string> {
    return await this.makeRpcCall('eth_getCode', [address, 'latest']);
  }

  async isContract(address: string): Promise<boolean> {
    const code = await this.getCode(address);
    return code !== '0x';
  }

  private async makeRpcCall(method: string, params: any[]): Promise<any> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
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