import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Operator Manual',
  description:
    'Operator help and manual dispute-resolution guidance for milestone escrow cases.',
};

export default function HelpLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
