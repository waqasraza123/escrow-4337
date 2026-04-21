'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  defaultWebTheme,
  webThemeCookieName,
  type WebTheme,
} from './theme.shared';

export {
  defaultWebTheme,
  resolveWebTheme,
  webThemeCookieName,
  type WebTheme,
} from './theme.shared';

type WebThemeContextValue = {
  theme: WebTheme;
  setTheme: Dispatch<SetStateAction<WebTheme>>;
};

const webThemeContext = createContext<WebThemeContextValue>({
  theme: defaultWebTheme,
  setTheme: () => undefined,
});

export function persistWebThemeCookie(theme: WebTheme) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${webThemeCookieName}=${theme}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

export function syncDocumentTheme(theme: WebTheme) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = theme;
}

export function WebThemeProvider(props: {
  children: ReactNode;
  initialTheme: WebTheme;
}) {
  const { children, initialTheme } = props;
  const [theme, setTheme] = useState<WebTheme>(initialTheme);

  useEffect(() => {
    syncDocumentTheme(theme);
    persistWebThemeCookie(theme);
  }, [theme]);

  return (
    <webThemeContext.Provider
      value={{
        theme,
        setTheme,
      }}
    >
      {children}
    </webThemeContext.Provider>
  );
}

export function useWebTheme() {
  return useContext(webThemeContext);
}
