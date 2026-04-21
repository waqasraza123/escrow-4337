import type { Metadata } from 'next';
import { MarketplaceProfileDetail } from './profile-detail';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} | Marketplace Talent | Escrow4337`,
    description:
      'Public escrow-first talent profile with delivery history, trust signals, and marketplace fit context.',
  };
}

export default async function MarketplaceProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <MarketplaceProfileDetail slug={slug} />;
}
