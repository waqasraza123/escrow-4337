import { WalletSetupCard } from '@/features/wallet/MobileWalletSetupCard';
import type { UserProfile } from '@escrow4334/product-core';

export function SetupReadinessCard({ user }: { user: UserProfile | null }) {
  return <WalletSetupCard user={user} />;
}
