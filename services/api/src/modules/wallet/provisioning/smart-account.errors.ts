import type { SmartAccountProviderErrorContext } from './smart-account.types';
import type { SmartAccountProviderKind } from '../../users/users.types';

export class SmartAccountProviderError extends Error {
  readonly code: string;
  readonly chainId: number;
  readonly ownerAddress: string;
  readonly providerKind: SmartAccountProviderKind;

  constructor(message: string, context: SmartAccountProviderErrorContext) {
    super(message);
    this.name = 'SmartAccountProviderError';
    this.code = context.code;
    this.chainId = context.chainId;
    this.ownerAddress = context.ownerAddress;
    this.providerKind = context.providerKind;
  }
}
