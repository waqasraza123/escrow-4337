import type { Metadata } from 'next';
import styles from '../../page.styles';
import { MarketplaceModerationConsole } from '../../marketplace/moderation-console';

export const metadata: Metadata = {
  title: 'Operator Marketplace Moderation',
  description:
    'Operator moderation dashboard for marketplace profiles, briefs, reports, and trust signals.',
};

export default function OperatorMarketplacePage() {
  return (
    <main className={styles.page}>
      <MarketplaceModerationConsole />
    </main>
  );
}
