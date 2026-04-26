import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  defaultProductTheme,
  productRadii,
  productSpacing,
  productThemes,
  productTypeScale,
  resolveProductTheme,
  type ProductThemeName,
} from '@escrow4334/product-core';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance } from 'react-native';

const themePreferenceKey = 'escrow4337.mobile.theme';

export type ThemePreference = ProductThemeName | 'system';

type MobileThemeContextValue = {
  themeName: ProductThemeName;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
  colors: (typeof productThemes)[ProductThemeName]['colors'];
  status: (typeof productThemes)[ProductThemeName]['status'];
  spacing: typeof productSpacing;
  radii: typeof productRadii;
  type: typeof productTypeScale;
};

const MobileThemeContext = createContext<MobileThemeContextValue | null>(null);

function resolveThemeFromPreference(
  preference: ThemePreference,
  colorScheme: ProductThemeName,
) {
  if (preference !== 'system') {
    return preference;
  }

  return resolveProductTheme(colorScheme);
}

export function MobileThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] =
    useState<ThemePreference>(defaultProductTheme);
  const [colorScheme, setColorScheme] = useState<ProductThemeName>(
    () => resolveProductTheme(Appearance.getColorScheme()),
  );

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(themePreferenceKey)
      .then((value) => {
        if (!mounted) {
          return;
        }
        setPreferenceState(
          value === 'system' ? 'system' : resolveProductTheme(value),
        );
      })
      .catch(() => undefined);

    const subscription = Appearance.addChangeListener((event) => {
      setColorScheme(resolveProductTheme(event.colorScheme));
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const setPreference = async (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    await AsyncStorage.setItem(themePreferenceKey, nextPreference);
  };

  const themeName = resolveThemeFromPreference(preference, colorScheme);
  const tokens = productThemes[themeName];

  const value = useMemo<MobileThemeContextValue>(
    () => ({
      themeName,
      preference,
      setPreference,
      colors: tokens.colors,
      status: tokens.status,
      spacing: productSpacing,
      radii: productRadii,
      type: productTypeScale,
    }),
    [preference, themeName, tokens.colors, tokens.status],
  );

  return (
    <MobileThemeContext.Provider value={value}>
      {children}
    </MobileThemeContext.Provider>
  );
}

export function useMobileTheme() {
  const value = useContext(MobileThemeContext);
  if (!value) {
    throw new Error('useMobileTheme must be used inside MobileThemeProvider.');
  }

  return value;
}
