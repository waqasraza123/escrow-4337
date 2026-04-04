import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import type {
  CreateJobContractInput,
  CreateJobExecution,
  DeliverMilestoneContractInput,
  EscrowContractGateway,
  EscrowContractReceipt,
  FundJobContractInput,
  OpenDisputeContractInput,
  ReleaseMilestoneContractInput,
  ResolveDisputeContractInput,
  SetMilestonesContractInput,
} from './escrow-contract.types';
import { EscrowContractConfigService } from './escrow-contract.config';

@Injectable()
export class MockEscrowContractGateway implements EscrowContractGateway {
  private nextEscrowId = 1n;

  constructor(private readonly config: EscrowContractConfigService) {}

  createJob(input: CreateJobContractInput): Promise<CreateJobExecution> {
    const escrowId = this.nextEscrowId.toString();
    this.nextEscrowId += 1n;
    return Promise.resolve({
      ...this.createReceipt(
        'create_job',
        input.actorAddress,
        escrowId,
        input.jobHash,
      ),
      escrowId,
    });
  }

  fundJob(input: FundJobContractInput): Promise<EscrowContractReceipt> {
    return Promise.resolve(
      this.createReceipt(
        'fund_job',
        input.actorAddress,
        input.escrowId,
        input.amountMinorUnits,
      ),
    );
  }

  setMilestones(
    input: SetMilestonesContractInput,
  ): Promise<EscrowContractReceipt> {
    return Promise.resolve(
      this.createReceipt(
        'set_milestones',
        input.actorAddress,
        input.escrowId,
        input.amountsMinorUnits.join(','),
      ),
    );
  }

  deliverMilestone(
    input: DeliverMilestoneContractInput,
  ): Promise<EscrowContractReceipt> {
    return Promise.resolve(
      this.createReceipt(
        'deliver_milestone',
        input.actorAddress,
        input.escrowId,
        `${input.milestoneIndex}:${input.deliverableHash}`,
      ),
    );
  }

  releaseMilestone(
    input: ReleaseMilestoneContractInput,
  ): Promise<EscrowContractReceipt> {
    return Promise.resolve(
      this.createReceipt(
        'release_milestone',
        input.actorAddress,
        input.escrowId,
        String(input.milestoneIndex),
      ),
    );
  }

  openDispute(input: OpenDisputeContractInput): Promise<EscrowContractReceipt> {
    return Promise.resolve(
      this.createReceipt(
        'open_dispute',
        input.actorAddress,
        input.escrowId,
        `${input.milestoneIndex}:${input.reasonHash}`,
      ),
    );
  }

  resolveDispute(
    input: ResolveDisputeContractInput,
  ): Promise<EscrowContractReceipt> {
    return Promise.resolve(
      this.createReceipt(
        'resolve_dispute',
        input.actorAddress,
        input.escrowId,
        `${input.milestoneIndex}:${input.splitBpsClient}`,
      ),
    );
  }

  private createReceipt(
    action: string,
    actorAddress: string,
    escrowId: string,
    payload: string,
  ): EscrowContractReceipt {
    const submittedAt = Date.now();
    const confirmedAt = submittedAt + 1;
    const txHash = `0x${createHash('sha256')
      .update(`${action}:${actorAddress}:${escrowId}:${payload}:${submittedAt}`)
      .digest('hex')}`;

    return {
      chainId: this.config.chainId,
      contractAddress: this.config.contractAddress,
      txHash,
      blockNumber: Number(escrowId) || 1,
      submittedAt,
      confirmedAt,
    };
  }
}
