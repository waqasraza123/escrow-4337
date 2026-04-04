import type {
  SmartAccountProviderKind,
  SmartAccountSponsorshipPolicy,
  SmartAccountUserWalletRecord,
} from '../../users/users.types';

export type SmartAccountProvisioningMode = 'mock' | 'relay';
export type SmartAccountSponsorshipMode = 'disabled' | 'verified_owner';

export type SmartAccountProvisioningRequest = {
  ownerAddress: string;
  recoveryAddress: string;
  sponsorshipPolicy: SmartAccountSponsorshipPolicy;
};

export type SmartAccountProvisioningResult = Omit<
  SmartAccountUserWalletRecord,
  'label' | 'createdAt' | 'updatedAt'
>;

export type SmartAccountSponsorshipDecision = {
  mode: SmartAccountSponsorshipMode;
  policy: SmartAccountSponsorshipPolicy;
  eligible: boolean;
  reason?: string;
};

export type SmartAccountProviderErrorContext = {
  code: string;
  chainId: number;
  ownerAddress: string;
  providerKind: SmartAccountProviderKind;
};

export interface SmartAccountProvider {
  readonly providerKind: SmartAccountProviderKind;
  provision(
    request: SmartAccountProvisioningRequest,
  ): Promise<SmartAccountProvisioningResult>;
}
