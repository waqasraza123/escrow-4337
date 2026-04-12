'use client';

import { getLocaleDefinition, supportedLocales } from '@escrow4334/frontend-core';
import { useAdminI18n } from '../lib/i18n';

type LanguageSwitcherProps = {
  className?: string;
  labelClassName?: string;
  optionClassName?: string;
  optionActiveClassName?: string;
};

export function LanguageSwitcher(props: LanguageSwitcherProps) {
  const { className, labelClassName, optionActiveClassName, optionClassName } = props;
  const { locale, messages, setLocale } = useAdminI18n();

  return (
    <div className={className}>
      <span className={labelClassName}>{messages.common.currentLanguage}</span>
      <div role="group" aria-label={messages.common.currentLanguage}>
        {supportedLocales.map((supportedLocale) => {
          const isActive = supportedLocale === locale;
          const localeDefinition = getLocaleDefinition(supportedLocale);

          return (
            <button
              key={supportedLocale}
              type="button"
              className={`${optionClassName || ''} ${
                isActive ? optionActiveClassName || '' : ''
              }`.trim()}
              onClick={() => setLocale(supportedLocale)}
              aria-pressed={isActive}
              lang={localeDefinition.langTag}
              dir={localeDefinition.dir}
              title={localeDefinition.englishLabel}
            >
              {localeDefinition.nativeLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
