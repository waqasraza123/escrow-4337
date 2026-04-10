import styles from '../../../page.module.css';
import { EscrowConsole } from '../../../web-console';

export default async function ContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className={styles.page}>
      <EscrowConsole view="contract" initialJobId={id} />
    </main>
  );
}
