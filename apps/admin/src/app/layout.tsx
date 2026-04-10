import type { Metadata } from "next";
import { IBM_Plex_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  weight: ["500", "700"],
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Milestone Escrow Operator",
  description:
    "Dispute review and operator case resolution for milestone escrow contracts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
