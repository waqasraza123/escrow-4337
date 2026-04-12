import styles from '../../page.module.css';
import { MarketplaceWorkspace } from '../../marketplace/workspace';

export default function MarketplaceWorkspacePage() {
  return (
    <main className={styles.page}>
      <MarketplaceWorkspace />
    </main>
  );
}
