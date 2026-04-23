import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Mono, Noto_Sans_Arabic, Space_Grotesk } from "next/font/google";
import { getLocaleDefinition, resolveSupportedLocale } from "@escrow4334/frontend-core";
import { AdminI18nProvider } from "../lib/i18n";
import { adminThemeCookieName, resolveAdminTheme } from "../lib/theme.shared";
import { AdminSpatialShell } from "./spatial-shell";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const arabicDisplay = Noto_Sans_Arabic({
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
  title: "Milestone Escrow Admin",
  description:
    "Client-facing entry and operator tooling for milestone escrow hiring workflows.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = resolveSupportedLocale(cookieStore.get('escrow4337.locale')?.value);
  const theme = resolveAdminTheme(cookieStore.get(adminThemeCookieName)?.value);
  const localeDefinition = getLocaleDefinition(locale);

  return (
    <html
      lang={localeDefinition.langTag}
      dir={localeDefinition.dir}
      data-locale={locale}
      data-theme={theme}
    >
      <body
        className={`${display.variable} ${arabicDisplay.variable} ${mono.variable}`}
      >
        <AdminI18nProvider initialLocale={locale}>
          <AdminSpatialShell initialTheme={theme}>{children}</AdminSpatialShell>
        </AdminI18nProvider>
      </body>
    </html>
  );
}
