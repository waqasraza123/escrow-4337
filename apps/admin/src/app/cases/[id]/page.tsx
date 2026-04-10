import styles from '../../page.module.css';
import { OperatorConsole } from '../../operator-console';

export default function OperatorCasePage({ params }: { params: { id: string } }) {
  return (
    <main className={styles.page}>
      <OperatorConsole view="case" initialJobId={params.id} />
    </main>
  );
}
