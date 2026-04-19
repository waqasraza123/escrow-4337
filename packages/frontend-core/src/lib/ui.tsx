import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from 'react';
import { cn } from './utils';
import {
  getLocaleDefinition,
  supportedLocales,
  type SupportedLocale,
} from './i18n';

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold tracking-[-0.01em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--button-primary-bg)] text-[var(--button-primary-fg)] shadow-[var(--button-primary-shadow)] hover:-translate-y-0.5 hover:bg-[var(--button-primary-bg-hover)]',
        secondary:
          'border border-[var(--button-secondary-border)] bg-[var(--button-secondary-bg)] text-[var(--button-secondary-fg)] shadow-[var(--button-secondary-shadow)] hover:-translate-y-0.5 hover:border-[var(--button-secondary-border-strong)]',
        ghost:
          'border border-transparent bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-soft)]',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]',
  {
    variants: {
      tone: {
        neutral: 'bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]',
        success: 'bg-[var(--badge-success-bg)] text-[var(--badge-success-fg)]',
        warning: 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-fg)]',
        danger: 'bg-[var(--badge-danger-bg)] text-[var(--badge-danger-fg)]',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
);

const localeSwitcherVariants = cva(
  'inline-flex items-center gap-2 rounded-full px-3 py-2 [&_[role=group]]:inline-flex [&_[role=group]]:gap-1.5',
  {
    variants: {
      theme: {
        web: 'bg-white/92 shadow-[inset_0_0_0_1px_rgba(92,67,46,0.1)]',
        admin:
          'bg-[rgba(10,15,22,0.62)] shadow-[inset_0_0_0_1px_rgba(145,164,189,0.16)]',
      },
    },
    defaultVariants: {
      theme: 'web',
    },
  },
);

const localeSwitcherLabelVariants = cva(
  'text-[0.72rem] uppercase tracking-[0.12em]',
  {
    variants: {
      theme: {
        web: 'font-semibold text-[var(--foreground-muted)]',
        admin: 'text-[var(--muted-foreground)]',
      },
    },
    defaultVariants: {
      theme: 'web',
    },
  },
);

const localeSwitcherOptionVariants = cva(
  'min-h-10 rounded-full px-3.5 py-2.5 text-sm transition duration-200',
  {
    variants: {
      theme: {
        web: 'bg-transparent text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(92,67,46,0.08)]',
        admin:
          'bg-transparent text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(145,164,189,0.16)]',
      },
      active: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        theme: 'web',
        active: true,
        className:
          'bg-[linear-gradient(135deg,#2d1a11,#5d3620)] text-[#fffaf6] shadow-[0_10px_18px_rgba(48,29,17,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]',
      },
      {
        theme: 'admin',
        active: true,
        className:
          'bg-[linear-gradient(135deg,#eaf4ff,#b7cbe4)] text-[#0c1620] shadow-none',
      },
    ],
    defaultVariants: {
      theme: 'web',
      active: false,
    },
  },
);

export function Button(
  props: ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    },
) {
  const { asChild = false, className, variant, ...rest } = props;
  const Comp = asChild ? Slot : 'button';

  return <Comp className={cn(buttonVariants({ variant }), className)} {...rest} />;
}

export function Badge(
  props: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>,
) {
  const { className, tone, ...rest } = props;

  return <span className={cn(badgeVariants({ tone }), className)} {...rest} />;
}

export function SurfaceCard(
  props: HTMLAttributes<HTMLDivElement> & {
    elevated?: boolean;
  },
) {
  const { children, className, elevated = false, ...rest } = props;

  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface-card)] p-5',
        elevated ? 'shadow-[var(--surface-shadow-strong)]' : 'shadow-[var(--surface-shadow)]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function PageContainer(props: HTMLAttributes<HTMLDivElement>) {
  const { children, className, ...rest } = props;

  return (
    <div
      className={cn(
        'mx-auto grid w-[min(1240px,calc(100vw-40px))] gap-7 py-7 pb-22 max-md:w-[min(100vw-24px,1240px)] max-md:gap-5 max-md:pb-13',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function PageTopBar(props: {
  eyebrow: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const {
    actions,
    className,
    contentClassName,
    description,
    eyebrow,
    title,
  } = props;

  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-4 rounded-[1.7rem] border border-[var(--surface-border)] bg-[var(--surface-card)] px-4 py-4 shadow-[var(--surface-shadow)]',
        className,
      )}
    >
      <div className={cn('grid max-w-3xl gap-1.5', contentClassName)}>
        <Eyebrow>{eyebrow}</Eyebrow>
        {title ? <strong className="text-[1.02rem] leading-6">{title}</strong> : null}
        {description ? (
          <p className="text-sm leading-6 text-[var(--muted-foreground,var(--foreground-soft))]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function Eyebrow(props: HTMLAttributes<HTMLParagraphElement>) {
  const { children, className, ...rest } = props;

  return (
    <p
      className={cn(
        'text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]',
        className,
      )}
      {...rest}
    >
      {children}
    </p>
  );
}

export function SectionCard(props: {
  title: ReactNode;
  children?: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  elevated?: boolean;
}) {
  const {
    actions,
    children,
    className,
    contentClassName,
    description,
    descriptionClassName,
    eyebrow,
    elevated = false,
    headerClassName,
    title,
    titleClassName,
  } = props;

  return (
    <SurfaceCard
      className={cn('rounded-[1.75rem] p-6', className)}
      elevated={elevated}
    >
      <SectionHeading
        actions={actions}
        className={headerClassName}
        description={description}
        descriptionClassName={descriptionClassName}
        eyebrow={eyebrow}
        title={title}
        titleClassName={cn('text-[clamp(1.35rem,3vw,1.85rem)] leading-[1.06]', titleClassName)}
      />
      {children ? <div className={cn('grid gap-4', contentClassName)}>{children}</div> : null}
    </SurfaceCard>
  );
}

export function SectionHeading(props: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  actions?: ReactNode;
}) {
  const {
    actions,
    className,
    description,
    descriptionClassName,
    eyebrow,
    title,
    titleClassName,
  } = props;

  return (
    <header className={cn('flex items-start justify-between gap-4', className)}>
      <div className="grid gap-3">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h2
          className={cn(
            'text-[clamp(1.7rem,3vw,2.3rem)] leading-[1.05]',
            titleClassName,
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              'max-w-[60ch] text-[1.02rem] leading-7 text-[var(--muted-foreground,var(--foreground-soft))]',
              descriptionClassName,
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}

export function FactGrid(props: HTMLAttributes<HTMLDivElement>) {
  const { children, className, ...rest } = props;

  return (
    <div className={cn('grid gap-4 md:grid-cols-2', className)} {...rest}>
      {children}
    </div>
  );
}

export function FactItem(props: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
}) {
  const { className, dir, label, labelClassName, value, valueClassName } = props;

  return (
    <article className={cn('grid gap-2', className)}>
      <span
        className={cn(
          'text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[var(--foreground-muted)]',
          labelClassName,
        )}
      >
        {label}
      </span>
      <strong
        className={cn('text-[1.02rem] leading-6', valueClassName)}
        data-ltr={dir === 'ltr' ? 'true' : undefined}
        dir={dir}
      >
        {value}
      </strong>
    </article>
  );
}

export function FeatureCard(props: {
  title: ReactNode;
  body: ReactNode;
  className?: string;
  leading?: ReactNode;
}) {
  const { body, className, leading, title } = props;

  return (
    <SurfaceCard
      className={cn(
        'relative rounded-[1.4rem] bg-[var(--surface-card)] p-5.5 before:absolute before:left-0 before:top-0 before:h-[3px] before:w-full before:rounded-full before:bg-[linear-gradient(90deg,rgba(126,80,43,0.35),rgba(126,80,43,0))]',
        className,
      )}
    >
      {leading ? <div className="mb-3">{leading}</div> : null}
      <strong className="mb-2.5 block text-[1.1rem] leading-6">{title}</strong>
      <p className="leading-7 text-[var(--muted-foreground,var(--foreground-soft))]">
        {body}
      </p>
    </SurfaceCard>
  );
}

export function LocaleSwitcher(props: {
  locale: SupportedLocale;
  currentLanguageLabel: string;
  onChange: (locale: SupportedLocale) => void;
  theme?: 'web' | 'admin';
  className?: string;
  labelClassName?: string;
  optionClassName?: string;
  activeOptionClassName?: string;
  optionActiveClassName?: string;
}) {
  const {
    activeOptionClassName,
    className,
    currentLanguageLabel,
    labelClassName,
    locale,
    onChange,
    optionClassName,
    optionActiveClassName,
    theme = 'web',
  } = props;

  return (
    <div className={cn(localeSwitcherVariants({ theme }), className)}>
      <span className={cn(localeSwitcherLabelVariants({ theme }), labelClassName)}>
        {currentLanguageLabel}
      </span>
      <div role="group" aria-label={currentLanguageLabel}>
        {supportedLocales.map((supportedLocale) => {
          const isActive = supportedLocale === locale;
          const localeDefinition = getLocaleDefinition(supportedLocale);

          return (
            <button
              key={supportedLocale}
              type="button"
              className={cn(
                localeSwitcherOptionVariants({
                  theme,
                  active: isActive,
                }),
                optionClassName,
                isActive ? activeOptionClassName ?? optionActiveClassName : null,
              )}
              onClick={() => onChange(supportedLocale)}
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

export function StatusNotice(props: {
  title?: string;
  message?: string;
  className?: string;
  titleClassName?: string;
  messageClassName?: string;
  children?: ReactNode;
}) {
  const { children, className, message, messageClassName, title, titleClassName } =
    props;

  if (!title && !message && !children) {
    return null;
  }

  return (
    <div className={cn('grid gap-2', className)}>
      {title ? <strong className={cn('text-sm font-semibold', titleClassName)}>{title}</strong> : null}
      {message ? <p className={cn('text-sm leading-6', messageClassName)}>{message}</p> : null}
      {children}
    </div>
  );
}

export function EmptyStateCard(props: {
  title: string;
  message: string;
  className?: string;
  titleClassName?: string;
  messageClassName?: string;
  children?: ReactNode;
}) {
  const {
    children,
    className,
    message,
    messageClassName,
    title,
    titleClassName,
  } = props;

  return (
    <article
      className={cn(
        'grid gap-3 rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface-card)] p-5 shadow-[var(--surface-shadow)]',
        className,
      )}
    >
      <strong className={cn('text-base font-semibold leading-6', titleClassName)}>{title}</strong>
      <p className={cn('text-sm leading-6 text-[var(--muted-foreground)]', messageClassName)}>{message}</p>
      {children}
    </article>
  );
}

export { badgeVariants, buttonVariants };
