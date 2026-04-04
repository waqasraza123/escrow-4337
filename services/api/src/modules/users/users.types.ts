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

export type UserProfile = {
  id: string;
  email: string;
  shariahMode: boolean;
  defaultExecutionWalletAddress: string | null;
  wallets: UserWalletRecord[];
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

export function toUserProfile(user: UserRecord): UserProfile {
  return {
    id: user.id,
    email: user.email,
    shariahMode: user.shariahMode,
    defaultExecutionWalletAddress: user.defaultExecutionWalletAddress,
    wallets: structuredClone(user.wallets),
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
