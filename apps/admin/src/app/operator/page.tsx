import type { Metadata } from 'next';
import styles from '../page.styles';
import { OperatorConsole } from '../operator-console';

export const metadata: Metadata = {
  title: 'Milestone Escrow Operator',
  description:
    'Operator dashboard for dispute review, moderation, and escrow operations health.',
};

export default function OperatorHomePage() {
  return (
    <main className={styles.page}>
      <OperatorConsole view="dashboard" />
    </main>
  );
}
