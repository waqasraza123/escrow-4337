import styles from '../../../../page.module.css';
import { EscrowConsole } from '../../../../web-console';

export default function DeliverPage({ params }: { params: { id: string } }) {
  return (
    <main className={styles.page}>
      <EscrowConsole view="deliver" initialJobId={params.id} />
    </main>
  );
}
