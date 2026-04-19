import styles from '../../page.styles';
import { EscrowConsole } from '../../web-console';

export default function SignInPage() {
  return (
    <main className={styles.page}>
      <EscrowConsole view="sign-in" />
    </main>
  );
}
