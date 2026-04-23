import type { Metadata } from 'next';
import { AdminLandingPage } from './landing-page';

export const metadata: Metadata = {
  title: 'Milestone Escrow',
  description:
    'Escrow-first hiring on Base with milestone funding, decision-ready briefs, and operator-backed trust workflows.',
};

export default function Home() {
  return <AdminLandingPage />;
}
