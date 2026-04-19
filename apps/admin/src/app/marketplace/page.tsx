import styles from '../page.styles';
import { MarketplaceModerationConsole } from './moderation-console';

export default function MarketplaceModerationPage() {
  return (
    <main className={styles.page}>
      <MarketplaceModerationConsole />
    </main>
  );
}
