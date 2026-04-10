import styles from '../../../page.module.css';
import { EscrowConsole } from '../../../web-console';

export default function ContractPage({ params }: { params: { id: string } }) {
  return (
    <main className={styles.page}>
      <EscrowConsole view="contract" initialJobId={params.id} />
    </main>
  );
}
