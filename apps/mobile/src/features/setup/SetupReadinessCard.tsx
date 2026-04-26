import { SurfaceCard, Heading, BodyText, ReadinessChecklist } from '@/ui/primitives';
import type { UserProfile } from '@escrow4334/product-core';

export function SetupReadinessCard({ user }: { user: UserProfile | null }) {
  const linkedWallet = Boolean(user?.wallets.some((wallet) => wallet.walletKind === 'eoa'));
  const smartAccount = Boolean(
    user?.wallets.some((wallet) => wallet.walletKind === 'smart_account'),
  );

  return (
    <SurfaceCard>
      <Heading style={{ fontSize: 20, lineHeight: 26 }}>Setup readiness</Heading>
      <BodyText>
        Wallet and smart-account state are read from the same API profile used
        by the web app.
      </BodyText>
      <ReadinessChecklist
        items={[
          { label: 'Email session restored', ready: Boolean(user) },
          { label: 'Execution wallet linked', ready: linkedWallet },
          { label: 'Smart account provisioned', ready: smartAccount },
        ]}
      />
    </SurfaceCard>
  );
}
