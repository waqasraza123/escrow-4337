import type { Metadata } from 'next';
import styles from '../../../page.styles';
import { OperatorConsole } from '../../../operator-console';

export const metadata: Metadata = {
  title: 'Operator Case Review',
  description:
    'Operator case route for milestone dispute review, receipts, and final resolution.',
};

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
