import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  defaultLocale,
  getLocaleDefinition,
  localePreferenceKey,
  resolveSupportedLocale,
  type LocaleDefinition,
  type SupportedLocale,
} from '@escrow4334/product-core';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { I18nManager } from 'react-native';

type LocaleContextValue = {
  locale: SupportedLocale;
  definition: LocaleDefinition;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  isRtl: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(localePreferenceKey)
      .then((value) => {
        if (mounted) {
          setLocaleState(resolveSupportedLocale(value));
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const definition = getLocaleDefinition(locale);
  const isRtl = definition.dir === 'rtl';

  useEffect(() => {
    I18nManager.allowRTL(isRtl);
  }, [isRtl]);

  const setLocale = async (nextLocale: SupportedLocale) => {
    setLocaleState(nextLocale);
    await AsyncStorage.setItem(localePreferenceKey, nextLocale);
  };

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      definition,
      setLocale,
      isRtl,
    }),
    [definition, isRtl, locale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error('useLocale must be used inside LocaleProvider.');
  }

  return value;
}
