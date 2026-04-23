import { redirect } from 'next/navigation';

export default async function LegacyOperatorCaseRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/operator/cases/${encodeURIComponent(id)}`);
}
