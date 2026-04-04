import type {
  SmartAccountProviderKind,
  SmartAccountSponsorshipPolicy,
  SmartAccountUserWalletRecord,
  UserWalletRecord,
} from '../users/users.types';

export type WalletLinkChallengeRecord = {
  id: string;
  userId: string;
  address: string;
  walletKind: 'eoa';
  label?: string;
  chainId: number;
  nonce: string;
  message: string;
  issuedAt: number;
  expiresAt: number;
  failedAttempts: number;
  consumedAt?: number;
  lastFailedAt?: number;
};

export type WalletStateResponse = {
  defaultExecutionWalletAddress: string | null;
  wallets: UserWalletRecord[];
};

export type WalletLinkChallengeResponse = {
  challengeId: string;
  message: string;
  issuedAt: number;
  expiresAt: number;
};

export type SmartAccountProvisionResponse = WalletStateResponse & {
  smartAccount: SmartAccountUserWalletRecord;
  sponsorship: {
    eligible: boolean;
    policy: SmartAccountSponsorshipPolicy;
    providerKind: SmartAccountProviderKind;
    chainId: number;
    reason?: string;
  };
};
