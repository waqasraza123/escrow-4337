import { Injectable } from '@nestjs/common';
import type { EoaUserWalletRecord } from '../../users/users.types';
import { SmartAccountConfigService } from './smart-account.config';
import type { SmartAccountSponsorshipDecision } from './smart-account.types';

@Injectable()
export class SmartAccountPolicyService {
  constructor(private readonly config: SmartAccountConfigService) {}

  getRecoveryAddress(ownerWallet: EoaUserWalletRecord) {
    return ownerWallet.address;
  }

  getSponsorshipDecision(
    ownerWallet: EoaUserWalletRecord,
  ): SmartAccountSponsorshipDecision {
    if (this.config.sponsorshipMode === 'disabled') {
      return {
        mode: this.config.sponsorshipMode,
        policy: 'disabled',
        eligible: false,
        reason: 'Gas sponsorship is disabled',
      };
    }

    if (ownerWallet.verificationMethod !== 'siwe') {
      return {
        mode: this.config.sponsorshipMode,
        policy: 'disabled',
        eligible: false,
        reason: 'Gas sponsorship requires a SIWE-verified owner wallet',
      };
    }

    return {
      mode: this.config.sponsorshipMode,
      policy: 'sponsored',
      eligible: true,
    };
  }
}
