'use client';

import Link from 'next/link';
import styles from '../marketing.styles';
import { LanguageSwitcher } from '../language-switcher';
import { ThemeToggle } from '../theme-toggle';
import { useWebI18n } from '../../lib/i18n';

export function PublicMarketplaceNav() {
  const { messages } = useWebI18n();

  return (
    <nav className={styles.nav}>
      <strong className={styles.brand}>{messages.common.brand}</strong>
      <div className={styles.navLinks}>
        <Link href="/">{messages.common.home}</Link>
        <Link href="/marketplace">{messages.common.marketplace}</Link>
        <Link href="/trust">{messages.common.trust}</Link>
        <Link href="/app/marketplace">{messages.publicMarketplace.navWorkspace}</Link>
      </div>
      <div className={styles.controlCluster}>
        <ThemeToggle
          className={styles.languageSwitcher}
          labelClassName={styles.languageSwitcherLabel}
          optionClassName={styles.languageSwitcherOption}
          optionActiveClassName={styles.languageSwitcherOptionActive}
        />
        <LanguageSwitcher
          className={styles.languageSwitcher}
          labelClassName={styles.languageSwitcherLabel}
          optionClassName={styles.languageSwitcherOption}
          optionActiveClassName={styles.languageSwitcherOptionActive}
        />
      </div>
    </nav>
  );
}
