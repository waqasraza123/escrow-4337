'use client';

import {
  LocaleSwitcher as SharedLocaleSwitcher,
  type SupportedLocale,
} from '@escrow4334/frontend-core';
import { useWebI18n } from '../lib/i18n';

type LanguageSwitcherProps = {
  className?: string;
  theme?: 'web' | 'admin';
  labelClassName?: string;
  optionClassName?: string;
  activeOptionClassName?: string;
  optionActiveClassName?: string;
};

export function LanguageSwitcher(props: LanguageSwitcherProps) {
  const {
    activeOptionClassName,
    className,
    labelClassName,
    optionActiveClassName,
    optionClassName,
    theme = 'web',
  } = props;
  const { locale, messages, setLocale } = useWebI18n();

  return (
    <SharedLocaleSwitcher
      activeOptionClassName={activeOptionClassName}
      className={className}
      currentLanguageLabel={messages.common.currentLanguage}
      labelClassName={labelClassName}
      locale={locale as SupportedLocale}
      onChange={setLocale}
      optionActiveClassName={optionActiveClassName}
      optionClassName={optionClassName}
      theme={theme}
    />
  );
}
