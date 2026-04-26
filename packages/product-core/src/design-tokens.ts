export type ProductThemeName = 'light' | 'dark';
export type ProductStatusTone = 'info' | 'success' | 'warning' | 'danger' | 'muted';

export const productRadii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const productSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const productTypeScale = {
  caption: 12,
  body: 15,
  bodyLarge: 17,
  title: 22,
  display: 34,
} as const;

export const productMotion = {
  fastMs: 180,
  mediumMs: 280,
  slowMs: 520,
} as const;

export const productThemes = {
  light: {
    name: 'light',
    colors: {
      background: '#eff8f0',
      backgroundStrong: '#f8fcf7',
      foreground: '#15311f',
      foregroundSoft: '#365341',
      foregroundMuted: '#4a6755',
      surface: '#ffffff',
      surfaceSoft: '#e8f4eb',
      surfaceStrong: '#f8fcf7',
      border: 'rgba(14, 96, 51, 0.14)',
      borderStrong: 'rgba(14, 96, 51, 0.28)',
      primary: '#0b6b3a',
      primaryStrong: '#0f7b44',
      primarySoft: '#dff3e4',
      primaryForeground: '#f7fff8',
      accent: '#249458',
      shadow: 'rgba(17, 77, 43, 0.14)',
    },
    status: {
      info: {
        background: 'rgba(36, 148, 88, 0.12)',
        foreground: '#127448',
        border: 'rgba(36, 148, 88, 0.24)',
      },
      success: {
        background: 'rgba(36, 148, 88, 0.12)',
        foreground: '#127448',
        border: 'rgba(36, 148, 88, 0.24)',
      },
      warning: {
        background: 'rgba(208, 145, 58, 0.14)',
        foreground: '#8a5a17',
        border: 'rgba(208, 145, 58, 0.24)',
      },
      danger: {
        background: 'rgba(190, 79, 104, 0.14)',
        foreground: '#8f2f49',
        border: 'rgba(190, 79, 104, 0.22)',
      },
      muted: {
        background: 'rgba(38, 79, 55, 0.07)',
        foreground: '#365341',
        border: 'rgba(38, 79, 55, 0.12)',
      },
    },
  },
  dark: {
    name: 'dark',
    colors: {
      background: '#091224',
      backgroundStrong: '#050916',
      foreground: '#edf6ff',
      foregroundSoft: '#aec3de',
      foregroundMuted: '#8ea5bf',
      surface: '#0b1628',
      surfaceSoft: '#07101e',
      surfaceStrong: '#0d1a2f',
      border: 'rgba(162, 198, 255, 0.18)',
      borderStrong: 'rgba(179, 241, 255, 0.34)',
      primary: '#8defff',
      primaryStrong: '#d6ecff',
      primarySoft: 'rgba(107, 243, 255, 0.12)',
      primaryForeground: '#05101d',
      accent: '#8792ff',
      shadow: 'rgba(2, 8, 19, 0.46)',
    },
    status: {
      info: {
        background: 'rgba(107, 243, 255, 0.12)',
        foreground: '#8defff',
        border: 'rgba(107, 243, 255, 0.28)',
      },
      success: {
        background: 'rgba(46, 227, 181, 0.14)',
        foreground: '#82f4d5',
        border: 'rgba(46, 227, 181, 0.28)',
      },
      warning: {
        background: 'rgba(255, 183, 84, 0.14)',
        foreground: '#ffd38e',
        border: 'rgba(255, 183, 84, 0.28)',
      },
      danger: {
        background: 'rgba(255, 110, 140, 0.14)',
        foreground: '#ffafbf',
        border: 'rgba(255, 110, 140, 0.28)',
      },
      muted: {
        background: 'rgba(115, 170, 232, 0.08)',
        foreground: '#aec3de',
        border: 'rgba(115, 170, 232, 0.16)',
      },
    },
  },
} as const;

export const defaultProductTheme: ProductThemeName = 'light';

export function resolveProductTheme(value?: string | null): ProductThemeName {
  return value === 'dark' ? 'dark' : defaultProductTheme;
}
