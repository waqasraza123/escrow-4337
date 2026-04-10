import styles from '../../../../page.module.css';
import { EscrowConsole } from '../../../../web-console';

export default function DisputePage({ params }: { params: { id: string } }) {
  return (
    <main className={styles.page}>
      <EscrowConsole view="dispute" initialJobId={params.id} />
    </main>
  );
}
