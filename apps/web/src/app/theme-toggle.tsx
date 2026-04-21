'use client';

import { cn } from '@escrow4334/frontend-core';
import { useWebI18n } from '../lib/i18n';
import { useWebTheme, type WebTheme } from '../lib/theme';

type ThemeToggleProps = {
  className?: string;
  labelClassName?: string;
  optionClassName?: string;
  optionActiveClassName?: string;
};

const themeOrder: WebTheme[] = ['light', 'dark'];

export function ThemeToggle(props: ThemeToggleProps) {
  const {
    className,
    labelClassName,
    optionActiveClassName,
    optionClassName,
  } = props;
  const { messages } = useWebI18n();
  const { theme, setTheme } = useWebTheme();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-[var(--theme-switcher-bg)] px-3 py-2 shadow-[var(--theme-switcher-shadow)] backdrop-blur-xl [&_[role=group]]:inline-flex [&_[role=group]]:gap-1.5',
        className,
      )}
    >
      <span
        className={cn(
          'text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]',
          labelClassName,
        )}
      >
        {messages.common.theme}
      </span>
      <div role="group" aria-label={messages.common.theme}>
        {themeOrder.map((value) => {
          const isActive = value === theme;

          return (
            <button
              key={value}
              type="button"
              aria-pressed={isActive}
              className={cn(
                'min-h-10 rounded-full bg-transparent px-3.5 py-2.5 text-sm text-[var(--foreground)] shadow-[var(--theme-switcher-option-shadow)] transition duration-200',
                isActive
                  ? 'bg-[image:var(--theme-switcher-option-active-bg)] text-[var(--theme-switcher-option-active-fg)] shadow-[var(--theme-switcher-option-active-shadow)]'
                  : null,
                optionClassName,
                isActive ? optionActiveClassName : null,
              )}
              onClick={() => setTheme(value)}
            >
              {value === 'light' ? messages.common.lightTheme : messages.common.darkTheme}
            </button>
          );
        })}
      </div>
    </div>
  );
}
