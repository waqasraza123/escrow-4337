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
  adminThemeCookieName,
  defaultAdminTheme,
  type AdminTheme,
} from './theme.shared';

export {
  adminThemeCookieName,
  defaultAdminTheme,
  resolveAdminTheme,
  type AdminTheme,
} from './theme.shared';

type AdminThemeContextValue = {
  theme: AdminTheme;
  setTheme: Dispatch<SetStateAction<AdminTheme>>;
};

const adminThemeContext = createContext<AdminThemeContextValue>({
  theme: defaultAdminTheme,
  setTheme: () => undefined,
});

export function persistAdminThemeCookie(theme: AdminTheme) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${adminThemeCookieName}=${theme}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

export function syncAdminDocumentTheme(theme: AdminTheme) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = theme;
}

export function AdminThemeProvider(props: {
  children: ReactNode;
  initialTheme: AdminTheme;
}) {
  const { children, initialTheme } = props;
  const [theme, setTheme] = useState<AdminTheme>(initialTheme);

  useEffect(() => {
    syncAdminDocumentTheme(theme);
    persistAdminThemeCookie(theme);
  }, [theme]);

  return (
    <adminThemeContext.Provider
      value={{
        theme,
        setTheme,
      }}
    >
      {children}
    </adminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  return useContext(adminThemeContext);
}
