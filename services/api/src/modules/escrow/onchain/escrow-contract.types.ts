export type EscrowContractAction =
  | 'create_job'
  | 'fund_job'
  | 'set_milestones'
  | 'deliver_milestone'
  | 'release_milestone'
  | 'open_dispute'
  | 'resolve_dispute';

export type EscrowContractReceipt = {
  chainId: number;
  contractAddress: string;
  txHash: string;
  blockNumber: number;
  submittedAt: number;
  confirmedAt: number;
};

export type CreateJobExecution = EscrowContractReceipt & {
  escrowId: string;
};

export type EscrowContractGatewayErrorContext = {
  code: string;
  action: EscrowContractAction;
  chainId: number;
  contractAddress: string;
  txHash?: string;
  submittedAt?: number;
};

export type EscrowContractRequestContext = {
  requestId: string;
  correlationId: string;
  operationKey: string;
  idempotencyKey?: string | null;
};

export type CreateJobContractInput = {
  actorAddress: string;
  workerAddress: string;
  currencyAddress: string;
  jobHash: string;
  requestContext?: EscrowContractRequestContext;
};

export type FundJobContractInput = {
  actorAddress: string;
  escrowId: string;
  amountMinorUnits: string;
  requestContext?: EscrowContractRequestContext;
};

export type SetMilestonesContractInput = {
  actorAddress: string;
  escrowId: string;
  amountsMinorUnits: string[];
  requestContext?: EscrowContractRequestContext;
};

export type DeliverMilestoneContractInput = {
  actorAddress: string;
  escrowId: string;
  milestoneIndex: number;
  deliverableHash: string;
  requestContext?: EscrowContractRequestContext;
};

export type ReleaseMilestoneContractInput = {
  actorAddress: string;
  escrowId: string;
  milestoneIndex: number;
  requestContext?: EscrowContractRequestContext;
};

export type OpenDisputeContractInput = {
  actorAddress: string;
  escrowId: string;
  milestoneIndex: number;
  reasonHash: string;
  requestContext?: EscrowContractRequestContext;
};

export type ResolveDisputeContractInput = {
  actorAddress: string;
  escrowId: string;
  milestoneIndex: number;
  splitBpsClient: number;
  requestContext?: EscrowContractRequestContext;
};

export interface EscrowContractGateway {
  createJob(input: CreateJobContractInput): Promise<CreateJobExecution>;
  fundJob(input: FundJobContractInput): Promise<EscrowContractReceipt>;
  setMilestones(
    input: SetMilestonesContractInput,
  ): Promise<EscrowContractReceipt>;
  deliverMilestone(
    input: DeliverMilestoneContractInput,
  ): Promise<EscrowContractReceipt>;
  releaseMilestone(
    input: ReleaseMilestoneContractInput,
  ): Promise<EscrowContractReceipt>;
  openDispute(input: OpenDisputeContractInput): Promise<EscrowContractReceipt>;
  resolveDispute(
    input: ResolveDisputeContractInput,
  ): Promise<EscrowContractReceipt>;
}
