import { MarketplaceProfileDetail } from './profile-detail';

export default async function MarketplaceProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <MarketplaceProfileDetail slug={slug} />;
}
