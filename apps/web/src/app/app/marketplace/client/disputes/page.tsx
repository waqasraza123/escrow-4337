import styles from '../../../../page.styles';
import { ClientConsole } from '../../../../marketplace/client-console';

export default function ClientDisputesPage() {
  return (
    <main className={styles.page}>
      <ClientConsole section="disputes" />
    </main>
  );
}
