export type UserWalletKind = 'eoa' | 'smart_account';

export type UserWalletRecord = {
  address: string;
  walletKind: UserWalletKind;
  label?: string;
  createdAt: number;
  updatedAt: number;
};

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

export type LinkUserWalletInput = {
  address: string;
  walletKind: UserWalletKind;
  label?: string;
};

export function toUserProfile(user: UserRecord): UserProfile {
  return {
    id: user.id,
    email: user.email,
    shariahMode: user.shariahMode,
    defaultExecutionWalletAddress: user.defaultExecutionWalletAddress,
    wallets: structuredClone(user.wallets),
  };
}
