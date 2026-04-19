export type UserWalletKind = 'eoa' | 'smart_account';
export type WalletVerificationMethod = 'siwe' | 'legacy_link';
export type SmartAccountProviderKind = 'mock' | 'relay';
export type SmartAccountSponsorshipPolicy = 'disabled' | 'sponsored';

type BaseUserWalletRecord = {
  address: string;
  label?: string;
  createdAt: number;
  updatedAt: number;
};

export type EoaUserWalletRecord = BaseUserWalletRecord & {
  walletKind: 'eoa';
  verificationMethod: WalletVerificationMethod;
  verificationChainId?: number;
  verifiedAt: number;
};

export type SmartAccountUserWalletRecord = BaseUserWalletRecord & {
  walletKind: 'smart_account';
  ownerAddress: string;
  recoveryAddress: string;
  chainId: number;
  providerKind: SmartAccountProviderKind;
  entryPointAddress: string;
  factoryAddress: string;
  sponsorshipPolicy: SmartAccountSponsorshipPolicy;
  provisionedAt: number;
};

export type UserWalletRecord =
  | EoaUserWalletRecord
  | SmartAccountUserWalletRecord;

export type UserRecord = {
  id: string;
  email: string;
  shariahMode: boolean;
  defaultExecutionWalletAddress: string | null;
  wallets: UserWalletRecord[];
  createdAt: number;
  updatedAt: number;
};

export type UserCapabilityName =
  | 'escrowResolution'
  | 'escrowOperations'
  | 'chainAuditSync'
  | 'jobHistoryImport'
  | 'marketplaceModeration';

export type UserCapabilityGrantSource = 'linked_arbitrator_wallet' | 'none';

export type UserCapability = {
  allowed: boolean;
  reason: string | null;
  grantedBy: UserCapabilityGrantSource;
  requiredWalletAddress: string | null;
};

export type UserCapabilities = Record<UserCapabilityName, UserCapability>;

export type UserProfile = {
  id: string;
  email: string;
  shariahMode: boolean;
  defaultExecutionWalletAddress: string | null;
  wallets: UserWalletRecord[];
  capabilities: UserCapabilities;
};

export type LinkEoaWalletInput = {
  address: string;
  walletKind: 'eoa';
  verificationMethod: WalletVerificationMethod;
  verificationChainId?: number;
  verifiedAt: number;
  label?: string;
};

export type LinkSmartAccountWalletInput = {
  address: string;
  walletKind: 'smart_account';
  ownerAddress: string;
  recoveryAddress: string;
  chainId: number;
  providerKind: SmartAccountProviderKind;
  entryPointAddress: string;
  factoryAddress: string;
  sponsorshipPolicy: SmartAccountSponsorshipPolicy;
  provisionedAt: number;
  label?: string;
};

export type LinkUserWalletInput =
  | LinkEoaWalletInput
  | LinkSmartAccountWalletInput;

export function createEmptyUserCapabilities(): UserCapabilities {
  return {
    escrowResolution: {
      allowed: false,
      reason: null,
      grantedBy: 'none',
      requiredWalletAddress: null,
    },
    escrowOperations: {
      allowed: false,
      reason: null,
      grantedBy: 'none',
      requiredWalletAddress: null,
    },
    chainAuditSync: {
      allowed: false,
      reason: null,
      grantedBy: 'none',
      requiredWalletAddress: null,
    },
    jobHistoryImport: {
      allowed: false,
      reason: null,
      grantedBy: 'none',
      requiredWalletAddress: null,
    },
    marketplaceModeration: {
      allowed: false,
      reason: null,
      grantedBy: 'none',
      requiredWalletAddress: null,
    },
  };
}

export function toUserProfile(
  user: UserRecord,
  capabilities: UserCapabilities = createEmptyUserCapabilities(),
): UserProfile {
  return {
    id: user.id,
    email: user.email,
    shariahMode: user.shariahMode,
    defaultExecutionWalletAddress: user.defaultExecutionWalletAddress,
    wallets: structuredClone(user.wallets),
    capabilities: structuredClone(capabilities),
  };
}

export function isSmartAccountWallet(
  wallet: UserWalletRecord,
): wallet is SmartAccountUserWalletRecord {
  return wallet.walletKind === 'smart_account';
}

export function isEoaWallet(
  wallet: UserWalletRecord,
): wallet is EoaUserWalletRecord {
  return wallet.walletKind === 'eoa';
}
