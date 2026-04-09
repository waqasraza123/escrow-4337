import { Injectable } from '@nestjs/common';
import { BigNumber, providers, utils } from 'ethers';
import { OperationsConfigService } from './operations.config';

export const ESCROW_CHAIN_LOG_PROVIDER = Symbol('ESCROW_CHAIN_LOG_PROVIDER');

export type EscrowChainLog = {
  blockNumber: number;
  blockHash: string;
  transactionHash: string;
  logIndex: number;
  topics: string[];
  data: string;
};

export interface EscrowChainLogProvider {
  getLatestBlockNumber(): Promise<number>;
  getLogs(input: {
    contractAddress: string;
    escrowId: string;
    fromBlock: number;
    toBlock: number;
    eventTopics: string[];
  }): Promise<EscrowChainLog[]>;
  getBlockTimestamp(blockNumber: number): Promise<number>;
}

function encodeEscrowIdTopic(escrowId: string) {
  return utils.hexZeroPad(BigNumber.from(escrowId).toHexString(), 32);
}

@Injectable()
export class JsonRpcEscrowChainLogProvider implements EscrowChainLogProvider {
  private provider: providers.JsonRpcProvider | null = null;

  constructor(private readonly operationsConfig: OperationsConfigService) {}

  async getLatestBlockNumber() {
    return this.getProvider().getBlockNumber();
  }

  async getLogs(input: {
    contractAddress: string;
    escrowId: string;
    fromBlock: number;
    toBlock: number;
    eventTopics: string[];
  }) {
    const logs = await this.getProvider().getLogs({
      address: input.contractAddress,
      fromBlock: input.fromBlock,
      toBlock: input.toBlock,
      topics: [input.eventTopics, encodeEscrowIdTopic(input.escrowId)],
    });

    return logs.map((log) => ({
      blockNumber: log.blockNumber,
      blockHash: log.blockHash,
      transactionHash: log.transactionHash,
      logIndex: log.logIndex,
      topics: [...log.topics],
      data: log.data,
    }));
  }

  async getBlockTimestamp(blockNumber: number) {
    const block = await this.getProvider().getBlock(blockNumber);
    if (!block) {
      throw new Error(
        `Block ${blockNumber} is unavailable from the configured RPC`,
      );
    }

    return block.timestamp * 1000;
  }

  private getProvider() {
    if (!this.provider) {
      const rpcUrl = this.operationsConfig.escrowSyncRpcUrl;
      if (!rpcUrl) {
        throw new Error('OPERATIONS_ESCROW_RPC_URL must be set');
      }

      this.provider = new providers.JsonRpcProvider(rpcUrl);
    }

    return this.provider;
  }
}
