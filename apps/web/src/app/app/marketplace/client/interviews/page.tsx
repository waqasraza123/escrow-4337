import styles from '../../../../page.styles';
import { ClientConsole } from '../../../../marketplace/client-console';

export default function ClientInterviewsPage() {
  return (
    <main className={styles.page}>
      <ClientConsole section="interviews" />
    </main>
  );
}
