import styles from '../../../../page.module.css';
import { EscrowConsole } from '../../../../web-console';

export default async function DeliverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className={styles.page}>
      <EscrowConsole view="deliver" initialJobId={id} />
    </main>
  );
}
