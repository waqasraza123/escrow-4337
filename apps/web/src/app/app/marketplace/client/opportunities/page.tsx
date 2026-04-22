import styles from '../../../../page.styles';
import { ClientConsole } from '../../../../marketplace/client-console';

export default function ClientOpportunitiesPage() {
  return (
    <main className={styles.page}>
      <ClientConsole section="opportunities" />
    </main>
  );
}
