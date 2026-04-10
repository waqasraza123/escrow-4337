import type { Dispatch, SetStateAction } from 'react';

export type SupportedLocale = 'en' | 'ar';
export type LocaleDirection = 'ltr' | 'rtl';

export type LocaleDefinition = {
  locale: SupportedLocale;
  langTag: string;
  dir: LocaleDirection;
  englishLabel: string;
  nativeLabel: string;
};

export const localeCookieName = 'escrow4337.locale';
export const defaultLocale: SupportedLocale = 'en';

export const localeDefinitions: Record<SupportedLocale, LocaleDefinition> = {
  en: {
    locale: 'en',
    langTag: 'en',
    dir: 'ltr',
    englishLabel: 'English',
    nativeLabel: 'English',
  },
  ar: {
    locale: 'ar',
    langTag: 'ar',
    dir: 'rtl',
    englishLabel: 'Arabic',
    nativeLabel: 'العربية',
  },
};

export const supportedLocales = Object.keys(localeDefinitions) as SupportedLocale[];

export type LocaleContextValue<TMessages> = {
  locale: SupportedLocale;
  definition: LocaleDefinition;
  messages: TMessages;
  setLocale: Dispatch<SetStateAction<SupportedLocale>>;
};

export function resolveSupportedLocale(
  value?: string | null,
): SupportedLocale {
  return value && value in localeDefinitions
    ? (value as SupportedLocale)
    : defaultLocale;
}

export function getLocaleDefinition(locale: SupportedLocale): LocaleDefinition {
  return localeDefinitions[locale];
}

export function readLocaleCookie(cookieValue?: string | null): SupportedLocale {
  return resolveSupportedLocale(cookieValue);
}

export function syncDocumentLocale(locale: SupportedLocale) {
  if (typeof document === 'undefined') {
    return;
  }

  const definition = getLocaleDefinition(locale);
  const root = document.documentElement;
  root.lang = definition.langTag;
  root.dir = definition.dir;
  root.dataset.locale = locale;
}

export function persistLocaleCookie(locale: SupportedLocale) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${localeCookieName}=${locale}; Max-Age=31536000; Path=/; SameSite=Lax`;
}
