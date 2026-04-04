import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { EscrowContractGatewayError } from './escrow-contract.errors';
import { EscrowContractConfigService } from './escrow-contract.config';
import type {
  CreateJobContractInput,
  CreateJobExecution,
  DeliverMilestoneContractInput,
  EscrowContractAction,
  EscrowContractGateway,
  EscrowContractReceipt,
  FundJobContractInput,
  OpenDisputeContractInput,
  ReleaseMilestoneContractInput,
  ResolveDisputeContractInput,
  SetMilestonesContractInput,
} from './escrow-contract.types';

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const hashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/);

const receiptSchema = z.object({
  chainId: z.number().int().positive(),
  contractAddress: addressSchema,
  txHash: hashSchema,
  blockNumber: z.number().int().nonnegative(),
  submittedAt: z.number().int().positive(),
  confirmedAt: z.number().int().positive(),
});

const createJobReceiptSchema = receiptSchema.extend({
  escrowId: z.string().regex(/^\d+$/),
});

const relayErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  txHash: hashSchema.optional(),
  submittedAt: z.number().int().positive().optional(),
});

type RelayBody = {
  actorAddress: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class RelayEscrowContractGateway implements EscrowContractGateway {
  constructor(private readonly config: EscrowContractConfigService) {}

  async createJob(input: CreateJobContractInput): Promise<CreateJobExecution> {
    return this.execute<CreateJobExecution>(
      'create_job',
      input.actorAddress,
      {
        workerAddress: input.workerAddress,
        currencyAddress: input.currencyAddress,
        jobHash: input.jobHash,
      },
      createJobReceiptSchema,
    );
  }

  async fundJob(input: FundJobContractInput): Promise<EscrowContractReceipt> {
    return this.execute(
      'fund_job',
      input.actorAddress,
      {
        escrowId: input.escrowId,
        amountMinorUnits: input.amountMinorUnits,
      },
      receiptSchema,
    );
  }

  async setMilestones(
    input: SetMilestonesContractInput,
  ): Promise<EscrowContractReceipt> {
    return this.execute(
      'set_milestones',
      input.actorAddress,
      {
        escrowId: input.escrowId,
        amountsMinorUnits: input.amountsMinorUnits,
      },
      receiptSchema,
    );
  }

  async deliverMilestone(
    input: DeliverMilestoneContractInput,
  ): Promise<EscrowContractReceipt> {
    return this.execute(
      'deliver_milestone',
      input.actorAddress,
      {
        escrowId: input.escrowId,
        milestoneIndex: input.milestoneIndex,
        deliverableHash: input.deliverableHash,
      },
      receiptSchema,
    );
  }

  async releaseMilestone(
    input: ReleaseMilestoneContractInput,
  ): Promise<EscrowContractReceipt> {
    return this.execute(
      'release_milestone',
      input.actorAddress,
      {
        escrowId: input.escrowId,
        milestoneIndex: input.milestoneIndex,
      },
      receiptSchema,
    );
  }

  async openDispute(
    input: OpenDisputeContractInput,
  ): Promise<EscrowContractReceipt> {
    return this.execute(
      'open_dispute',
      input.actorAddress,
      {
        escrowId: input.escrowId,
        milestoneIndex: input.milestoneIndex,
        reasonHash: input.reasonHash,
      },
      receiptSchema,
    );
  }

  async resolveDispute(
    input: ResolveDisputeContractInput,
  ): Promise<EscrowContractReceipt> {
    return this.execute(
      'resolve_dispute',
      input.actorAddress,
      {
        escrowId: input.escrowId,
        milestoneIndex: input.milestoneIndex,
        splitBpsClient: input.splitBpsClient,
      },
      receiptSchema,
    );
  }

  private async execute<T>(
    action: EscrowContractAction,
    actorAddress: string,
    payload: Record<string, unknown>,
    schema: z.ZodSchema<T>,
  ) {
    const url = `${this.config.relayBaseUrl}/escrow/execute`;
    const headers = new Headers({
      'content-type': 'application/json',
    });

    if (this.config.relayApiKey) {
      headers.set('x-api-key', this.config.relayApiKey);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(this.createBody(action, actorAddress, payload)),
      });
    } catch {
      throw new EscrowContractGatewayError('Escrow relay is unavailable', {
        code: 'relay_unavailable',
        action,
        chainId: this.config.chainId,
        contractAddress: this.config.contractAddress,
      });
    }

    const bodyText = await response.text();
    let parsedBody: unknown = null;
    if (bodyText.length > 0) {
      try {
        parsedBody = JSON.parse(bodyText);
      } catch {
        throw new EscrowContractGatewayError(
          'Escrow relay returned invalid JSON',
          {
            code: 'relay_invalid_json',
            action,
            chainId: this.config.chainId,
            contractAddress: this.config.contractAddress,
          },
        );
      }
    }

    if (!response.ok) {
      const relayError = relayErrorSchema.safeParse(parsedBody);
      if (relayError.success) {
        throw new EscrowContractGatewayError(relayError.data.message, {
          code: relayError.data.code,
          action,
          chainId: this.config.chainId,
          contractAddress: this.config.contractAddress,
          txHash: relayError.data.txHash,
          submittedAt: relayError.data.submittedAt,
        });
      }

      throw new EscrowContractGatewayError(
        'Escrow relay rejected the request',
        {
          code: 'relay_request_failed',
          action,
          chainId: this.config.chainId,
          contractAddress: this.config.contractAddress,
        },
      );
    }

    return schema.parse(parsedBody);
  }

  private createBody(
    action: EscrowContractAction,
    actorAddress: string,
    payload: Record<string, unknown>,
  ): RelayBody & {
    action: EscrowContractAction;
    chainId: number;
    contractAddress: string;
  } {
    return {
      action,
      chainId: this.config.chainId,
      contractAddress: this.config.contractAddress,
      actorAddress,
      payload,
    };
  }
}
