'use client';

import Link from 'next/link';
import styles from '../marketing.styles';
import { LanguageSwitcher } from '../language-switcher';
import { useWebI18n } from '../../lib/i18n';

export default function TrustPage() {
  const { messages } = useWebI18n();
  const trustMessages = messages.marketing.trustPage;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <strong className={styles.brand}>{messages.common.brand}</strong>
          <div className={styles.navLinks}>
            <Link href="/">{messages.common.home}</Link>
            <Link href="/app/sign-in">{messages.common.signIn}</Link>
            <Link href="/app/new-contract">{messages.common.startContract}</Link>
          </div>
          <LanguageSwitcher
            className={styles.languageSwitcher}
            labelClassName={styles.languageSwitcherLabel}
            optionClassName={styles.languageSwitcherOption}
            optionActiveClassName={styles.languageSwitcherOptionActive}
          />
        </nav>

        <section className={styles.section}>
          <h2>{trustMessages.escrowTitle}</h2>
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
          <h2>{trustMessages.disputesTitle}</h2>
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
          <h2>{trustMessages.implementedTitle}</h2>
          <div className={styles.proofGrid}>
            {trustMessages.proofCards.map((card) => (
              <article key={card.title} className={styles.proofCard}>
                <strong>{card.title}</strong>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
