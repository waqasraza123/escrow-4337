import styles from '../../page.styles';
import { EscrowConsole } from '../../web-console';

export default function NewContractPage() {
  return (
    <main className={styles.page}>
      <EscrowConsole view="new-contract" />
    </main>
  );
}
