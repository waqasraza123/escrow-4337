import styles from '../../../../page.styles';
import { ProjectRoom } from '../../../../project-room';

export default async function ProjectRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className={styles.page}>
      <ProjectRoom initialJobId={id} />
    </main>
  );
}
