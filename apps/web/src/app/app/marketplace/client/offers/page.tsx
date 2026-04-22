import styles from '../../../../page.styles';
import { ClientConsole } from '../../../../marketplace/client-console';

export default function ClientOffersPage() {
  return (
    <main className={styles.page}>
      <ClientConsole section="offers" />
    </main>
  );
}
