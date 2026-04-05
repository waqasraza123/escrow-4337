import styles from "./page.module.css";
import { OperatorConsole } from "./operator-console";

export default function Home() {
  return (
    <main className={styles.page}>
      <OperatorConsole />
    </main>
  );
}
