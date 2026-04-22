import styles from '../../../../page.styles';
import { ClientConsole } from '../../../../marketplace/client-console';

export default function ClientApplicantsPage() {
  return (
    <main className={styles.page}>
      <ClientConsole section="applicants" />
    </main>
  );
}
