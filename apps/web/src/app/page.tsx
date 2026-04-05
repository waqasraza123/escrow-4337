import styles from './page.module.css';
import { EscrowConsole } from './web-console';

export default function Home() {
  return (
    <main className={styles.page}>
      <EscrowConsole />
    </main>
  );
}
