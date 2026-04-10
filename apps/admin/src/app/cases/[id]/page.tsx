import styles from '../../page.module.css';
import { OperatorConsole } from '../../operator-console';

export default async function OperatorCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className={styles.page}>
      <OperatorConsole view="case" initialJobId={id} />
    </main>
  );
}
