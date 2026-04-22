import styles from '../../../page.styles';
import { ClientConsole } from '../../../marketplace/client-console';

export default function ClientDashboardPage() {
  return (
    <main className={styles.page}>
      <ClientConsole section="dashboard" />
    </main>
  );
}
