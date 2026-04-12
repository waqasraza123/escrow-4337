import { MarketplaceOpportunityDetail } from './opportunity-detail';

export default async function MarketplaceOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <MarketplaceOpportunityDetail id={id} />;
}
