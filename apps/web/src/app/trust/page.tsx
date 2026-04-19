'use client';

import Link from 'next/link';
import {
  FeatureCard,
  PageContainer,
  SectionHeading,
} from '@escrow4334/frontend-core';
import styles from '../marketing.styles';
import { LanguageSwitcher } from '../language-switcher';
import { useWebI18n } from '../../lib/i18n';

export default function TrustPage() {
  const { messages } = useWebI18n();
  const trustMessages = messages.marketing.trustPage;

  return (
    <main className={styles.page}>
      <PageContainer className={styles.shell}>
        <nav className={styles.nav}>
          <strong className={styles.brand}>{messages.common.brand}</strong>
          <div className={styles.navLinks}>
            <Link href="/">{messages.common.home}</Link>
            <Link href="/app/sign-in">{messages.common.signIn}</Link>
            <Link href="/app/new-contract">{messages.common.startContract}</Link>
          </div>
          <LanguageSwitcher className={styles.languageSwitcher} theme="web" />
        </nav>

        <section className={styles.section}>
          <SectionHeading title={trustMessages.escrowTitle} />
          <div className={styles.sectionBody}>
            <p>{trustMessages.escrowIntro}</p>
            <ul className={styles.list}>
              {trustMessages.escrowList.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeading title={trustMessages.disputesTitle} />
          <div className={styles.sectionBody}>
            <p>{trustMessages.disputesIntro}</p>
            <ul className={styles.list}>
              {trustMessages.disputesList.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeading title={trustMessages.implementedTitle} />
          <div className={styles.proofGrid}>
            {trustMessages.proofCards.map((card) => (
              <FeatureCard
                key={card.title}
                body={card.body}
                className={styles.proofCard}
                title={card.title}
              />
            ))}
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
