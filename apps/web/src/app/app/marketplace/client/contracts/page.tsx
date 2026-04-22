import styles from '../../../../page.styles';
import { ClientConsole } from '../../../../marketplace/client-console';

export default function ClientContractsPage() {
  return (
    <main className={styles.page}>
      <ClientConsole section="contracts" />
    </main>
  );
}
