import type {
  EscrowContractAction,
  EscrowContractGatewayErrorContext,
} from './escrow-contract.types';

export class EscrowContractGatewayError extends Error {
  readonly code: string;
  readonly action: EscrowContractAction;
  readonly chainId: number;
  readonly contractAddress: string;
  readonly txHash?: string;
  readonly submittedAt?: number;

  constructor(message: string, context: EscrowContractGatewayErrorContext) {
    super(message);
    this.name = 'EscrowContractGatewayError';
    this.code = context.code;
    this.action = context.action;
    this.chainId = context.chainId;
    this.contractAddress = context.contractAddress;
    this.txHash = context.txHash;
    this.submittedAt = context.submittedAt;
  }
}
