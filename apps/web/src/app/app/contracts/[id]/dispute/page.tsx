import styles from '../../../../page.module.css';
import { EscrowConsole } from '../../../../web-console';

export default async function DisputePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className={styles.page}>
      <EscrowConsole view="dispute" initialJobId={id} />
    </main>
  );
}
