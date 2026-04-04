import type { UserWalletRecord } from '../users/users.types';

export type WalletStateResponse = {
  defaultExecutionWalletAddress: string | null;
  wallets: UserWalletRecord[];
};
