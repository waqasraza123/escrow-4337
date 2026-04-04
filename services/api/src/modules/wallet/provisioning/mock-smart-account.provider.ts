import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { normalizeEvmAddress } from '../../../common/evm-address';
import { SmartAccountConfigService } from './smart-account.config';
import type {
  SmartAccountProvider,
  SmartAccountProvisioningRequest,
} from './smart-account.types';

@Injectable()
export class MockSmartAccountProvider implements SmartAccountProvider {
  readonly providerKind = 'mock' as const;

  constructor(private readonly config: SmartAccountConfigService) {}

  provision(request: SmartAccountProvisioningRequest) {
    const provisionedAt = Date.now();
    return Promise.resolve({
      address: this.createAddress(
        request.ownerAddress,
        request.recoveryAddress,
      ),
      walletKind: 'smart_account' as const,
      ownerAddress: normalizeEvmAddress(request.ownerAddress),
      recoveryAddress: normalizeEvmAddress(request.recoveryAddress),
      chainId: this.config.chainId,
      providerKind: this.providerKind,
      entryPointAddress: this.config.entryPointAddress,
      factoryAddress: this.config.factoryAddress,
      sponsorshipPolicy: request.sponsorshipPolicy,
      provisionedAt,
    });
  }

  private createAddress(ownerAddress: string, recoveryAddress: string) {
    const digest = createHash('sha256')
      .update(
        [
          this.config.chainId.toString(),
          this.config.entryPointAddress,
          this.config.factoryAddress,
          normalizeEvmAddress(ownerAddress),
          normalizeEvmAddress(recoveryAddress),
        ].join(':'),
      )
      .digest('hex');
    return `0x${digest.slice(0, 40)}`;
  }
}
