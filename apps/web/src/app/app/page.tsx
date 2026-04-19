import styles from '../page.styles';
import { EscrowConsole } from '../web-console';

export default function AppHomePage() {
  return (
    <main className={styles.page}>
      <EscrowConsole view="overview" />
    </main>
  );
}
