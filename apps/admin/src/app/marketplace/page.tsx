import { redirect } from 'next/navigation';

export default function LegacyMarketplaceRedirectPage() {
  redirect('/operator/marketplace');
}
