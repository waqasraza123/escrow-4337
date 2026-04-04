import type { UserWalletRecord } from '../users/users.types';

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
