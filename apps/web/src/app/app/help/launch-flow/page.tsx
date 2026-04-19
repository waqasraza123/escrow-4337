'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Button,
  FeatureCard,
  PageContainer,
  SectionHeading,
  SurfaceCard,
} from '@escrow4334/frontend-core';
import styles from '../../../page.styles';
import {
  startClientWalkthrough,
  startContractorWalkthrough,
} from '../../../launch-walkthrough';

export default function LaunchFlowHelpPage() {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <main className={styles.page}>
      <PageContainer className="mx-auto grid w-[min(1480px,calc(100vw-40px))] gap-7 py-7 pb-22">
      <section className={styles.hero}>
        <div>
          <SectionHeading
            eyebrow="Manual"
            title="Launch flow manual"
            titleClassName="text-[clamp(2.9rem,6vw,5.5rem)] leading-[0.92] max-w-[9.8ch]"
            description="Use this guide when you want the plain-language version of the launch-candidate flow without the overlay. Every section below follows the real supported escrow journey."
            descriptionClassName={styles.heroCopy}
          />
        </div>
        <SurfaceCard className={styles.heroCard} elevated>
          <div>
            <span className={styles.metaLabel}>Best starting point</span>
            <strong>/app/sign-in</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Primary outcome</span>
            <strong>Funded job plus contractor join link</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Restart the overlay</span>
            <strong>Use Walkthrough in the top bar</strong>
          </div>
        </SurfaceCard>
      </section>

      {notice ? (
        <FeatureCard
          body={notice}
          className={styles.statusBanner}
          title="Walkthrough ready"
        />
      ) : null}

      <div className={styles.grid}>
        <section className={styles.panel}>
          <SectionHeading eyebrow="Client" title="Create and launch the first escrow job" className={styles.panelHeader} />
          <div className={styles.stack}>
            <FeatureCard className={styles.statusBanner} title="1. Start with OTP sign-in" body="Use the client email that should own the job. After verification, confirm your email appears in Profile." />
            <FeatureCard className={styles.statusBanner} title="2. Clear setup blockers" body="In Setup readiness, follow the next blocker only. First link the browser wallet, then provision the smart account that will execute client actions." />
            <FeatureCard className={styles.statusBanner} title="3. Create the guided job" body="Complete Scope, Counterparty, and Plan. The contractor email and worker wallet must match later during join." />
            <FeatureCard className={styles.statusBanner} title="4. Finish launch on the contract page" body="Commit milestones, fund the job, then send or copy the contractor join link. You are on track when the selected job shows funding confirmation and the join access card shows a shareable link." />
            <div className={styles.inlineActions}>
              <Button
                type="button"
                onClick={() => {
                  startClientWalkthrough('/app/sign-in');
                  router.push('/app/sign-in');
                }}
              >
                Start client walkthrough
              </Button>
              <Button asChild variant="secondary" className={styles.secondaryButton}>
                <Link href="/app/sign-in">Go to sign-in</Link>
              </Button>
              <Button asChild variant="secondary" className={styles.secondaryButton}>
                <Link href="/app/new-contract">Go to guided composer</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <SectionHeading eyebrow="Contractor" title="Join and deliver from the invite link" className={styles.panelHeader} />
          <div className={styles.stack}>
            <FeatureCard className={styles.statusBanner} title="1. Open the exact invite-linked contract route" body="Stay on the provided contract link. That is where the product verifies that the invite token, email, and worker wallet match." />
            <FeatureCard className={styles.statusBanner} title="2. Join only when blockers are gone" body="The Contractor join access card tells you why join is blocked. You are ready when the Join button becomes available." />
            <FeatureCard className={styles.statusBanner} title="3. Deliver with evidence" body="Use the delivery route for the selected milestone, add a clear delivery note, and attach evidence links so the client can review confidently." />
            <div className={styles.inlineActions}>
              <Button
                type="button"
                onClick={() => {
                  startContractorWalkthrough();
                  setNotice(
                    'Contractor walkthrough armed. Open the invite-linked contract route to start it.',
                  );
                }}
              >
                Start contractor walkthrough
              </Button>
              <Button asChild variant="secondary" className={styles.secondaryButton}>
                <Link href="/app/sign-in">Go to sign-in</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
      </PageContainer>
    </main>
  );
}
