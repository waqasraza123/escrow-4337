import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Mono, Fraunces, Noto_Naskh_Arabic } from "next/font/google";
import { getLocaleDefinition, resolveSupportedLocale } from "@escrow4334/frontend-core";
import { AdminI18nProvider } from "../lib/i18n";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  weight: ["500", "700"],
  subsets: ["latin"],
});

const arabicDisplay = Noto_Naskh_Arabic({
  variable: "--font-display-ar",
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic"],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = resolveSupportedLocale(cookieStore.get('escrow4337.locale')?.value);
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
        <AdminI18nProvider initialLocale={locale}>{children}</AdminI18nProvider>
      </body>
    </html>
  );
}
