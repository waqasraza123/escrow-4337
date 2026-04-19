import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from './utils';

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
