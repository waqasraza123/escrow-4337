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
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold tracking-[-0.01em] transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary:
          'border border-transparent bg-[var(--button-primary-bg)] text-[var(--button-primary-fg)] shadow-[var(--button-primary-shadow)] hover:-translate-y-0.5 hover:brightness-105',
        secondary:
          'border border-[var(--button-secondary-border)] bg-[var(--button-secondary-bg)] text-[var(--button-secondary-fg)] shadow-[var(--button-secondary-shadow)] backdrop-blur-xl hover:-translate-y-0.5 hover:border-[var(--button-secondary-border-strong)]',
        ghost:
          'border border-transparent bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]',
  {
    variants: {
      tone: {
        neutral: 'border-[rgba(135,160,255,0.18)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]',
        success: 'border-[rgba(46,227,181,0.18)] bg-[var(--badge-success-bg)] text-[var(--badge-success-fg)]',
        warning: 'border-[rgba(255,183,84,0.18)] bg-[var(--badge-warning-bg)] text-[var(--badge-warning-fg)]',
        danger: 'border-[rgba(255,110,140,0.2)] bg-[var(--badge-danger-bg)] text-[var(--badge-danger-fg)]',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
);

const localeSwitcherVariants = cva(
  'inline-flex items-center gap-2 rounded-full px-3 py-2 backdrop-blur-xl [&_[role=group]]:inline-flex [&_[role=group]]:gap-1.5',
  {
    variants: {
      theme: {
        web: 'bg-[var(--theme-switcher-bg)] shadow-[var(--theme-switcher-shadow)]',
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
        web: 'bg-transparent text-[var(--foreground)] shadow-[var(--theme-switcher-option-shadow)]',
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
          'bg-[image:var(--theme-switcher-option-active-bg)] text-[var(--theme-switcher-option-active-fg)] shadow-[var(--theme-switcher-option-active-shadow)]',
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

const consolePageVariants = cva('mx-auto grid', {
  variants: {
    theme: {
      web: 'w-[min(1480px,calc(100vw-40px))] gap-7 py-8 pb-22 max-md:w-[min(100vw-24px,1480px)]',
      admin:
        'w-[min(1360px,calc(100vw-48px))] gap-6 py-12 pb-[4.5rem] max-md:w-[min(100vw-28px,1360px)] max-md:py-7 max-md:pb-12',
    },
  },
  defaultVariants: {
    theme: 'web',
  },
});

const heroPanelVariants = cva(
  'relative grid rounded-[1.9rem] border border-[var(--surface-border)] p-8 shadow-[var(--surface-shadow-strong)]',
  {
    variants: {
      theme: {
        web:
          'items-start gap-7 overflow-hidden bg-[var(--surface-card-strong)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[image:var(--panel-top-border)] lg:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)]',
        admin:
          'items-end gap-6 bg-[linear-gradient(180deg,rgba(12,17,24,0.84),rgba(22,31,44,0.9))] xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]',
      },
    },
    defaultVariants: {
      theme: 'web',
    },
  },
);

const heroPanelAsideVariants = cva(
  'grid content-start gap-4 rounded-[1.9rem] border border-[var(--surface-border)] p-6',
  {
    variants: {
      theme: {
        web:
          'bg-[linear-gradient(180deg,rgba(12,24,42,0.92),rgba(7,15,29,0.96))] shadow-[var(--surface-shadow)]',
        admin:
          'bg-[linear-gradient(180deg,rgba(12,17,24,0.84),rgba(22,31,44,0.9))] shadow-[var(--surface-shadow-strong)]',
      },
    },
    defaultVariants: {
      theme: 'web',
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

  if (asChild) {
    return <Slot className={cn(buttonVariants({ variant }), className)} {...rest} />;
  }

  return <button className={cn(buttonVariants({ variant }), className)} {...rest} />;
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
        'backdrop-blur-xl',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function VisualSceneCard(
  props: HTMLAttributes<HTMLDivElement> & {
    eyebrow?: ReactNode;
    title?: ReactNode;
    description?: ReactNode;
    visual?: ReactNode;
    footer?: ReactNode;
    tone?: 'market' | 'trust' | 'operator';
  },
) {
  const {
    children,
    className,
    description,
    eyebrow,
    footer,
    title,
    tone = 'trust',
    visual,
    ...rest
  } = props;

  return (
    <SurfaceCard
      elevated
      className={cn(
        'relative isolate grid gap-4 overflow-hidden p-5 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px',
        tone === 'market'
          ? 'before:bg-[linear-gradient(90deg,transparent,rgba(46,161,91,0.58),transparent)]'
          : tone === 'operator'
            ? 'before:bg-[linear-gradient(90deg,transparent,rgba(208,145,58,0.5),transparent)]'
            : 'before:bg-[linear-gradient(90deg,transparent,rgba(14,96,51,0.52),transparent)]',
        className,
      )}
      {...rest}
    >
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute right-[-4rem] top-[-5rem] h-44 w-44 rounded-full blur-3xl',
          tone === 'operator'
            ? 'bg-[radial-gradient(circle,rgba(208,145,58,0.18),transparent_70%)]'
            : 'bg-[var(--spotlight-glow)]',
        )}
      />
      {visual ? (
        <div className="relative z-10 overflow-hidden rounded-[1.35rem] border border-[var(--surface-border)] bg-[var(--surface-soft)]">
          {visual}
        </div>
      ) : null}
      {eyebrow || title || description ? (
        <div className="relative z-10 grid gap-2">
          {eyebrow ? (
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[var(--accent-eyebrow-soft)]">
              {eyebrow}
            </span>
          ) : null}
          {title ? (
            <strong className="text-[1.05rem] leading-6 text-[var(--foreground)]">
              {title}
            </strong>
          ) : null}
          {description ? (
            <p className="text-sm leading-6 text-[var(--foreground-soft)]">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children ? <div className="relative z-10 grid gap-3">{children}</div> : null}
      {footer ? <div className="relative z-10">{footer}</div> : null}
    </SurfaceCard>
  );
}

export function TrustSignalStrip(
  props: HTMLAttributes<HTMLDivElement> & {
    items: Array<{
      label: ReactNode;
      value: ReactNode;
      detail?: ReactNode;
      tone?: 'neutral' | 'success' | 'warning' | 'danger';
    }>;
  },
) {
  const { className, items, ...rest } = props;

  return (
    <div
      className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}
      {...rest}
    >
      {items.map((item, index) => (
        <div
          key={`${String(item.label)}-${index}`}
          className={cn(
            'relative overflow-hidden rounded-[1.2rem] border bg-[var(--surface-soft)] px-4 py-3.5 shadow-[var(--interactive-shadow)]',
            item.tone === 'success'
              ? 'border-[var(--status-success-border)]'
              : item.tone === 'warning'
                ? 'border-[var(--status-warning-border)]'
                : item.tone === 'danger'
                  ? 'border-[var(--status-danger-border)]'
                  : 'border-[var(--surface-border)]',
          )}
        >
          <span className="block text-[0.66rem] font-bold uppercase tracking-[0.15em] text-[var(--foreground-muted)]">
            {item.label}
          </span>
          <strong className="mt-1.5 block text-[1rem] leading-6 text-[var(--foreground)]">
            {item.value}
          </strong>
          {item.detail ? (
            <span className="mt-1 block text-xs leading-5 text-[var(--foreground-soft)]">
              {item.detail}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ActionTimeline(
  props: HTMLAttributes<HTMLOListElement> & {
    items: Array<{
      label: ReactNode;
      body?: ReactNode;
      status?: ReactNode;
      tone?: 'neutral' | 'success' | 'warning' | 'danger';
    }>;
  },
) {
  const { className, items, ...rest } = props;

  return (
    <ol className={cn('grid gap-3', className)} {...rest}>
      {items.map((item, index) => (
        <li
          key={`${String(item.label)}-${index}`}
          className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[1.15rem] border border-[var(--surface-border)] bg-[var(--surface-soft)] p-3.5"
        >
          <span
            className={cn(
              'mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold',
              item.tone === 'success'
                ? 'border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-fg)]'
                : item.tone === 'warning'
                  ? 'border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]'
                  : item.tone === 'danger'
                    ? 'border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]'
                    : 'border-[var(--status-info-border)] bg-[var(--status-info-bg)] text-[var(--status-info-fg)]',
            )}
          >
            {index + 1}
          </span>
          <span className="grid gap-1">
            <strong className="text-sm leading-5 text-[var(--foreground)]">
              {item.label}
            </strong>
            {item.body ? (
              <span className="text-xs leading-5 text-[var(--foreground-soft)]">
                {item.body}
              </span>
            ) : null}
            {item.status ? (
              <span className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                {item.status}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function ProofMetricCard(
  props: HTMLAttributes<HTMLDivElement> & {
    label: ReactNode;
    value: ReactNode;
    detail?: ReactNode;
    tone?: 'neutral' | 'success' | 'warning' | 'danger';
  },
) {
  const { className, detail, label, tone = 'neutral', value, ...rest } = props;

  return (
    <SurfaceCard
      className={cn(
        'grid gap-2 p-4',
        tone === 'success'
          ? 'border-[var(--status-success-border)]'
          : tone === 'warning'
            ? 'border-[var(--status-warning-border)]'
            : tone === 'danger'
              ? 'border-[var(--status-danger-border)]'
              : '',
        className,
      )}
      {...rest}
    >
      <span className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-[var(--foreground-muted)]">
        {label}
      </span>
      <strong className="text-[1.2rem] leading-7 tracking-[-0.03em] text-[var(--foreground)]">
        {value}
      </strong>
      {detail ? (
        <span className="text-sm leading-6 text-[var(--foreground-soft)]">{detail}</span>
      ) : null}
    </SurfaceCard>
  );
}

export function ScreenSectionHeader(
  props: HTMLAttributes<HTMLDivElement> & {
    eyebrow?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
  },
) {
  const { actions, className, description, eyebrow, title, ...rest } = props;

  return (
    <div
      className={cn(
        'flex flex-wrap items-end justify-between gap-4 rounded-[1.45rem] border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl',
        className,
      )}
      {...rest}
    >
      <div className="grid max-w-3xl gap-1.5">
        {eyebrow ? (
          <span className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[var(--accent-eyebrow-soft)]">
            {eyebrow}
          </span>
        ) : null}
        <strong className="text-[clamp(1.25rem,2.2vw,1.8rem)] leading-tight text-[var(--foreground)]">
          {title}
        </strong>
        {description ? (
          <p className="text-sm leading-6 text-[var(--foreground-soft)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}

export function EmptyStateVisual(
  props: HTMLAttributes<HTMLDivElement> & {
    title: ReactNode;
    message?: ReactNode;
    action?: ReactNode;
  },
) {
  const { action, className, message, title, ...rest } = props;

  return (
    <VisualSceneCard
      className={cn('items-center text-center', className)}
      tone="trust"
      visual={
        <svg aria-hidden="true" viewBox="0 0 360 180" className="h-44 w-full">
          <rect width="360" height="180" rx="28" fill="url(#empty-bg)" />
          <rect x="52" y="52" width="120" height="76" rx="22" fill="var(--background-strong)" />
          <rect x="188" y="38" width="120" height="104" rx="24" fill="var(--background-strong)" />
          <rect x="76" y="74" width="72" height="12" rx="6" fill="var(--accent-eyebrow)" opacity="0.28" />
          <rect x="76" y="98" width="52" height="12" rx="6" fill="var(--accent-eyebrow)" opacity="0.6" />
          <circle cx="224" cy="80" r="18" fill="var(--accent-eyebrow)" opacity="0.18" />
          <path d="M212 108L225 121L252 88" stroke="var(--accent-eyebrow)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="empty-bg" x1="24" y1="12" x2="336" y2="168" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--surface-soft)" />
              <stop offset="1" stopColor="var(--background-strong)" />
            </linearGradient>
          </defs>
        </svg>
      }
      title={title}
      description={message}
      footer={action}
      {...rest}
    />
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

export function ConsolePage(
  props: HTMLAttributes<HTMLDivElement> & VariantProps<typeof consolePageVariants>,
) {
  const { children, className, theme, ...rest } = props;

  return (
    <div className={cn(consolePageVariants({ theme }), className)} {...rest}>
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
        'backdrop-blur-xl',
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

export function HeroPanel(
  props: VariantProps<typeof heroPanelVariants> & {
    eyebrow?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    summary?: ReactNode;
    className?: string;
    headingClassName?: string;
    titleClassName?: string;
    descriptionClassName?: string;
    summaryClassName?: string;
  },
) {
  const {
    className,
    description,
    descriptionClassName,
    eyebrow,
    headingClassName,
    summary,
    summaryClassName,
    theme,
    title,
    titleClassName,
  } = props;

  return (
    <section className={cn(heroPanelVariants({ theme }), className)}>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        className={headingClassName}
        titleClassName={cn(
          theme === 'admin'
            ? 'max-w-[11ch] text-[clamp(2.8rem,5vw,5rem)] leading-[0.95]'
            : 'max-w-[9.8ch] text-[clamp(2.9rem,6vw,5.5rem)] leading-[0.92]',
          titleClassName,
        )}
        descriptionClassName={cn(
          theme === 'admin'
            ? 'text-sm leading-7 text-[var(--muted-foreground)]'
            : 'text-[1.04rem] leading-7 text-[var(--foreground-soft)]',
          descriptionClassName,
        )}
      />
      {summary ? (
        <div className={cn(heroPanelAsideVariants({ theme }), summaryClassName)}>
          {summary}
        </div>
      ) : null}
    </section>
  );
}

export function Eyebrow(props: HTMLAttributes<HTMLParagraphElement>) {
  const { children, className, ...rest } = props;

  return (
    <p
      className={cn(
        'text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--foreground-muted)]',
        className,
      )}
      {...rest}
    >
      {children}
    </p>
  );
}

export function SectionCard(
  props: HTMLAttributes<HTMLDivElement> & {
    title: ReactNode;
    eyebrow?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    contentClassName?: string;
    headerClassName?: string;
    titleClassName?: string;
    descriptionClassName?: string;
    elevated?: boolean;
  },
) {
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
    ...rest
  } = props;

  return (
    <SurfaceCard
      className={cn('rounded-[1.75rem] p-6', className)}
      elevated={elevated}
      {...rest}
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
            'text-[clamp(1.7rem,3vw,2.3rem)] leading-[1.02]',
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
    <article
      className={cn(
        'grid gap-2 rounded-[1.15rem] border border-[var(--surface-border)] bg-[var(--surface-soft)] px-4 py-3.5 shadow-[var(--interactive-shadow)] backdrop-blur-xl',
        className,
      )}
    >
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
        'relative overflow-hidden rounded-[1.4rem] bg-[var(--surface-card)] p-5.5 before:absolute before:left-0 before:top-0 before:h-px before:w-full before:bg-[image:var(--panel-top-border)]',
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
