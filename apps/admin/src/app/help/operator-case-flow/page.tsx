'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Button,
  FeatureCard,
  PageContainer,
  SectionHeading,
  SurfaceCard,
} from '@escrow4334/frontend-core';
import styles from '../../page.styles';
import { startOperatorWalkthrough } from '../../operator-walkthrough';

export default function OperatorCaseFlowHelpPage() {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <main className={styles.page}>
      <PageContainer className="mx-auto grid w-[min(1360px,calc(100vw-48px))] gap-6 py-12 pb-[4.5rem] max-md:w-[min(100vw-28px,1360px)] max-md:py-7 max-md:pb-12">
      <section className={styles.hero}>
        <SectionHeading
          eyebrow="Manual"
          title="Operator case-flow manual"
          titleClassName="text-[clamp(2.8rem,5vw,5rem)] leading-[0.95] max-w-[11ch]"
          description="This guide explains the real dispute-resolution path the operator console supports today. Use it when you want quick instructions without the walkthrough overlay."
          descriptionClassName={styles.heroCopy}
        />
        <SurfaceCard className={styles.heroCard} elevated>
          <div>
            <span className={styles.metaLabel}>Best starting point</span>
            <strong>/cases/&lt;job-id&gt;</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Required authority</span>
            <strong>Authenticated session plus configured arbitrator wallet</strong>
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
          className={styles.panel}
          title="Walkthrough ready"
        />
      ) : null}

      <section className={styles.panel}>
        <SectionHeading
          eyebrow="Operator"
          title="Resolve a disputed milestone safely"
          className={styles.panelHeader}
        />
        <div className={styles.stack}>
          <FeatureCard className={styles.panel} title="1. Load the disputed case" body="Open the specific `/cases/<job-id>` route so the console can load the public bundle, dispute state, and receipts for that escrow job." />
          <FeatureCard className={styles.panel} title="2. Authenticate the operator session" body="Use OTP sign-in in the Operator session and wallet authority panel. Protected actions do not unlock until the session is authenticated." />
          <FeatureCard className={styles.panel} title="3. Link the configured arbitrator wallet" body="Create the SIWE challenge, sign it with the configured arbitrator wallet, and verify the signature. Resolution stays blocked until this succeeds." />
          <FeatureCard className={styles.panel} title="4. Resolve with a clear note" body="Review the disputed milestone, choose release or refund, add the operator note, and submit the decision. You are on track when the disputed milestone disappears from the case and the resolution state confirms submission." />
          <div className={styles.inlineActions}>
            <Button
              type="button"
              onClick={() => {
                startOperatorWalkthrough();
                setNotice(
                  'Operator walkthrough armed. Open a disputed case route to start it automatically.',
                );
              }}
            >
              Start operator walkthrough
            </Button>
            <Button asChild variant="secondary" className={styles.secondaryButton}>
              <Link href="/">Go to dashboard</Link>
            </Button>
          </div>
        </div>
      </section>
      </PageContainer>
    </main>
  );
}
