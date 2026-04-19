import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Mono, Noto_Sans_Arabic, Space_Grotesk } from "next/font/google";
import {
  getLocaleDefinition,
  localeCookieName,
  resolveSupportedLocale,
} from "@escrow4334/frontend-core";
import { WebI18nProvider } from "../lib/i18n";
import { WebSpatialShell } from "./spatial-shell";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const arabicDisplay = Noto_Sans_Arabic({
  variable: "--font-display-ar",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Milestone Escrow",
  description:
    "Milestone escrow for crypto-native agency and client service work on Base.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = resolveSupportedLocale(cookieStore.get(localeCookieName)?.value);
  const localeDefinition = getLocaleDefinition(locale);

  return (
    <html
      lang={localeDefinition.langTag}
      dir={localeDefinition.dir}
      data-locale={locale}
    >
      <body
        className={`${display.variable} ${arabicDisplay.variable} ${mono.variable}`}
      >
        <WebI18nProvider initialLocale={locale}>
          <WebSpatialShell>{children}</WebSpatialShell>
        </WebI18nProvider>
      </body>
    </html>
  );
}
