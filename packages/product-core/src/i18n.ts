export type SupportedLocale = 'en' | 'ar';
export type LocaleDirection = 'ltr' | 'rtl';

export type LocaleDefinition = {
  locale: SupportedLocale;
  langTag: string;
  dir: LocaleDirection;
  englishLabel: string;
  nativeLabel: string;
};

export const localePreferenceKey = 'escrow4337.locale';
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

export const supportedLocales = Object.keys(
  localeDefinitions,
) as SupportedLocale[];

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

export function isRtlLocale(locale: SupportedLocale) {
  return getLocaleDefinition(locale).dir === 'rtl';
}
