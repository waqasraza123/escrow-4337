import type { Metadata } from 'next';
import { MarketplaceBrowser } from './marketplace-browser';

export const metadata: Metadata = {
  title: 'Marketplace | Escrow4337',
  description:
    'Browse escrow-ready talent, review public briefs, and move hiring into milestone escrow.',
};

export default function MarketplacePage() {
  return <MarketplaceBrowser />;
}
