import type { Metadata } from 'next';
import { MarketplaceOpportunityDetail } from './opportunity-detail';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `${id} | Marketplace Brief | Escrow4337`,
    description:
      'Public escrow-first hiring brief with requirements, trust posture, and conversion path into milestone escrow.',
  };
}

export default async function MarketplaceOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <MarketplaceOpportunityDetail id={id} />;
}
