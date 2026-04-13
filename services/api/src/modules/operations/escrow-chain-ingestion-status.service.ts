import { Inject, Injectable } from '@nestjs/common';
import { ESCROW_REPOSITORY } from '../../persistence/persistence.tokens';
import type { EscrowRepository } from '../../persistence/persistence.types';
import { EscrowContractConfigService } from '../escrow/onchain/escrow-contract.config';
import {
  ESCROW_CHAIN_LOG_PROVIDER,
  type EscrowChainLogProvider,
} from './escrow-chain-log.provider';
import type { EscrowChainIngestionStatus } from './escrow-health.types';
import { OperationsConfigService } from './operations.config';

const streamName = 'workstream_escrow' as const;

@Injectable()
export class EscrowChainIngestionStatusService {
  constructor(
    @Inject(ESCROW_REPOSITORY)
    private readonly escrowRepository: EscrowRepository,
    @Inject(ESCROW_CHAIN_LOG_PROVIDER)
    private readonly chainLogProvider: EscrowChainLogProvider,
    private readonly escrowContractConfig: EscrowContractConfigService,
    private readonly operationsConfig: OperationsConfigService,
  ) {}

  async getStatus(now = Date.now()): Promise<EscrowChainIngestionStatus> {
    const chainId = this.escrowContractConfig.chainId;
    const contractAddress = this.safeReadContractAddress();
    const cursor = contractAddress
      ? await this.escrowRepository.getChainCursor({
          chainId,
          contractAddress,
          streamName,
        })
      : null;
    const projections = await this.escrowRepository.listOnchainProjections();
    const totalJobs = (await this.escrowRepository.listAll()).length;
    const staleThresholdMs = this.operationsConfig.escrowChainSyncBacklogMs;
    const healthyJobs = projections.filter(
      (projection) =>
        projection.health === 'healthy' &&
        now - projection.projectedAt <= staleThresholdMs,
    ).length;
    const degradedJobs = projections.filter(
      (projection) => projection.health !== 'healthy',
    ).length;
    const staleJobs = projections.filter(
      (projection) => now - projection.projectedAt > staleThresholdMs,
    ).length;

    let latestBlock: number | null = null;
    let finalizedBlock: number | null = null;
    let lagBlocks: number | null = null;
    const issues: string[] = [];
    const warnings: string[] = [];

    if (this.operationsConfig.escrowIngestionEnabled && contractAddress) {
      try {
        latestBlock = await this.chainLogProvider.getLatestBlockNumber();
        finalizedBlock = Math.max(
          0,
          latestBlock - this.operationsConfig.escrowIngestionConfirmations,
        );
        lagBlocks =
          cursor && finalizedBlock >= cursor.nextFromBlock
            ? finalizedBlock - cursor.nextFromBlock
            : cursor
              ? 0
              : finalizedBlock;
      } catch (error) {
        issues.push(
          error instanceof Error
            ? error.message
            : 'Failed to read the latest chain block number.',
        );
      }
    }

    if (!this.operationsConfig.escrowIngestionEnabled) {
      warnings.push('Escrow chain ingestion is disabled.');
    } else if (!contractAddress) {
      issues.push(
        'Escrow chain ingestion requires a configured contract address.',
      );
    } else if (!cursor) {
      warnings.push('Escrow chain ingestion has not published a cursor yet.');
    }

    if (
      (lagBlocks ?? 0) >
      this.operationsConfig.escrowIngestionBatchBlocks * 2
    ) {
      warnings.push(
        `Escrow chain ingestion is ${lagBlocks} block(s) behind the finalized head.`,
      );
    }

    if (staleJobs > 0) {
      warnings.push(
        `${staleJobs} projected escrow job(s) exceed the freshness threshold.`,
      );
    }

    if (degradedJobs > 0) {
      issues.push(`${degradedJobs} projected escrow job(s) are degraded.`);
    }

    const status =
      issues.length > 0 ? 'failed' : warnings.length > 0 ? 'warning' : 'ok';

    return {
      generatedAt: new Date(now).toISOString(),
      enabled: this.operationsConfig.escrowIngestionEnabled,
      authorityReadsEnabled: this.operationsConfig.escrowAuthorityReadsEnabled,
      chainId,
      contractAddress,
      confirmations: this.operationsConfig.escrowIngestionConfirmations,
      batchBlocks: this.operationsConfig.escrowIngestionBatchBlocks,
      resyncBlocks: this.operationsConfig.escrowIngestionResyncBlocks,
      latestBlock,
      finalizedBlock,
      lagBlocks,
      cursor,
      projections: {
        totalJobs,
        projectedJobs: projections.length,
        healthyJobs,
        degradedJobs,
        staleJobs,
      },
      status,
      summary:
        status === 'ok'
          ? 'Escrow chain ingestion is healthy.'
          : (issues[0] ??
            warnings[0] ??
            'Escrow chain ingestion requires review.'),
      issues,
      warnings,
    };
  }

  private safeReadContractAddress() {
    try {
      return this.escrowContractConfig.contractAddress;
    } catch {
      return null;
    }
  }
}
