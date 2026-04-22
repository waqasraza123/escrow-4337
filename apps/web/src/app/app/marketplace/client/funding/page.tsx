import styles from '../../../../page.styles';
import { ClientConsole } from '../../../../marketplace/client-console';

export default function ClientFundingPage() {
  return (
    <main className={styles.page}>
      <ClientConsole section="funding" />
    </main>
  );
}
