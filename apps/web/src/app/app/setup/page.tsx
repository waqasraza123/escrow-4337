import styles from '../../page.styles';
import { EscrowConsole } from '../../web-console';

export default function SetupPage() {
  return (
    <main className={styles.page}>
      <EscrowConsole view="setup" />
    </main>
  );
}
