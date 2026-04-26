'use client';

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from 'motion/react';
import { Button } from './ui';
import { cn } from './utils';

export const spatialSprings = {
  panel: {
    stiffness: 170,
    damping: 24,
    mass: 0.85,
  },
  route: {
    stiffness: 120,
    damping: 22,
    mass: 1,
  },
  reveal: {
    stiffness: 150,
    damping: 20,
    mass: 0.9,
  },
} as const;

function getRouteMotion(reducedMotion: boolean) {
  if (reducedMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.18, ease: 'easeOut' as const },
    };
  }

  return {
    initial: { opacity: 0, y: 14, scale: 0.985, filter: 'blur(10px)' },
    animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -10, scale: 0.992, filter: 'blur(8px)' },
    transition: { type: 'spring' as const, ...spatialSprings.route },
  };
}

type SpatialShellProps = {
  children: ReactNode;
  stageKey: string;
  theme?: 'web' | 'admin';
  ambient?: ReactNode;
  toolbar?: ReactNode;
  className?: string;
  contentClassName?: string;
  stageClassName?: string;
};

export function SpatialShell(props: SpatialShellProps) {
  const {
    ambient,
    children,
    className,
    contentClassName,
    stageClassName,
    stageKey,
    theme = 'web',
    toolbar,
  } = props;
  const reducedMotion = useReducedMotion();
  const routeMotion = getRouteMotion(Boolean(reducedMotion));

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id={`spatial-shell-${theme}`}>
        <div
          className={cn(
            'relative min-h-screen overflow-x-clip',
            theme === 'web'
              ? 'bg-[var(--background)] text-[var(--foreground)]'
              : 'bg-[var(--background)] text-[var(--foreground)]',
            className,
          )}
        >
          <AmbientBackdrop theme={theme}>{ambient}</AmbientBackdrop>
          <div className={cn('relative z-10', contentClassName)}>
            {toolbar ? (
              <FloatingToolbar
                className={cn(
                  'mx-auto w-[min(1520px,calc(100vw-24px))] px-3 pt-4 md:px-4',
                  theme === 'admin' ? 'pt-5' : 'pt-4',
                )}
              >
                {toolbar}
              </FloatingToolbar>
            ) : null}
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={stageKey}
                animate={routeMotion.animate}
                className={cn('relative z-10', stageClassName)}
                exit={routeMotion.exit}
                initial={routeMotion.initial}
                transition={routeMotion.transition}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}

export function AmbientBackdrop(props: {
  children?: ReactNode;
  className?: string;
  theme?: 'web' | 'admin';
}) {
  const { children, className, theme = 'web' } = props;
  const reducedMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <motion.div
        animate={
          reducedMotion
            ? undefined
            : { x: [0, 24, -8, 0], y: [0, -18, 16, 0], scale: [1, 1.05, 0.98, 1] }
        }
        className={cn(
          'absolute left-[-10rem] top-[-10rem] h-[28rem] w-[28rem] rounded-full blur-3xl',
          theme === 'web'
            ? 'bg-[image:var(--ambient-backdrop-primary)]'
            : 'bg-[radial-gradient(circle,rgba(130,194,255,0.18),transparent_70%)]',
        )}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        animate={
          reducedMotion
            ? undefined
            : { x: [0, -28, 12, 0], y: [0, 24, -10, 0], scale: [1, 0.96, 1.04, 1] }
        }
        className={cn(
          'absolute bottom-[-14rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full blur-3xl',
          theme === 'web'
            ? 'bg-[image:var(--ambient-backdrop-secondary)]'
            : 'bg-[radial-gradient(circle,rgba(122,160,255,0.14),transparent_72%)]',
        )}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-[32rem]',
          theme === 'web'
            ? 'bg-[image:var(--ambient-top-overlay)]'
            : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent_72%)]',
        )}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_34%)]" />
      {children}
    </div>
  );
}

export function GlassPanel(
  props: HTMLMotionProps<'div'> & {
    as?: 'div' | 'section' | 'article' | 'aside';
    tone?: 'default' | 'hero' | 'quiet';
    elevated?: boolean;
  },
) {
  const {
    as = 'div',
    children,
    className,
    elevated = false,
    tone = 'default',
    ...rest
  } = props;
  const panelClassName = cn(
    'relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--surface-border)] backdrop-blur-[var(--panel-blur,24px)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.38),transparent)]',
    tone === 'hero'
      ? 'bg-[var(--surface-card-strong)]'
      : tone === 'quiet'
        ? 'bg-[var(--surface-soft)]'
        : 'bg-[var(--surface-card)]',
    elevated ? 'shadow-[var(--surface-shadow-strong)]' : 'shadow-[var(--surface-shadow)]',
    className,
  );

  if (as === 'section') {
    return (
      <motion.section
        className={panelClassName}
        transition={{ type: 'spring', ...spatialSprings.panel }}
        {...(rest as HTMLMotionProps<'section'>)}
      >
        {children}
      </motion.section>
    );
  }

  if (as === 'article') {
    return (
      <motion.article
        className={panelClassName}
        transition={{ type: 'spring', ...spatialSprings.panel }}
        {...(rest as HTMLMotionProps<'article'>)}
      >
        {children}
      </motion.article>
    );
  }

  if (as === 'aside') {
    return (
      <motion.aside
        className={panelClassName}
        transition={{ type: 'spring', ...spatialSprings.panel }}
        {...(rest as HTMLMotionProps<'aside'>)}
      >
        {children}
      </motion.aside>
    );
  }

  return (
    <motion.div
      className={panelClassName}
      transition={{ type: 'spring', ...spatialSprings.panel }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function FloatingToolbar(props: HTMLMotionProps<'div'>) {
  const { children, className, ...rest } = props;
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      className={cn('relative z-20', className)}
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
      transition={{ type: 'spring', ...spatialSprings.panel }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function RevealSection(
  props: HTMLMotionProps<'section'> & {
    as?: 'section' | 'div' | 'article';
    delay?: number;
    disabled?: boolean;
  },
) {
  const { as = 'section', children, className, delay = 0, disabled = false, ...rest } = props;
  const reducedMotion = useReducedMotion();
  const canObserveViewport =
    typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function';
  const isStaticReveal = disabled || reducedMotion;
  const revealInitial = isStaticReveal
    ? { opacity: 1 }
    : { opacity: 0, y: 12, scale: 0.992, filter: 'blur(8px)' };
  const revealTarget = isStaticReveal
    ? { opacity: 1 }
    : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' };
  const revealTransition = isStaticReveal
    ? { duration: 0.01 }
    : { type: 'spring' as const, delay, ...spatialSprings.reveal };
  const revealProps = {
    className,
    initial: revealInitial,
    transition: revealTransition,
    ...(isStaticReveal || !canObserveViewport
      ? { animate: revealTarget }
      : { viewport: { amount: 0.2, once: true }, whileInView: revealTarget }),
  };

  if (as === 'div') {
    return (
      <motion.div {...revealProps} {...(rest as HTMLMotionProps<'div'>)}>
        {children}
      </motion.div>
    );
  }

  if (as === 'article') {
    return (
      <motion.article {...revealProps} {...(rest as HTMLMotionProps<'article'>)}>
        {children}
      </motion.article>
    );
  }

  return (
    <motion.section {...revealProps} {...rest}>
      {children}
    </motion.section>
  );
}

export function SharedCard(
  props: HTMLMotionProps<'div'> & {
    layoutId?: string;
    interactive?: boolean;
  },
) {
  const { children, className, interactive = false, layoutId, ...rest } = props;

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface-card)] shadow-[var(--surface-shadow)] backdrop-blur-[var(--panel-blur,24px)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.42),transparent)]',
        interactive &&
          'transition duration-200 ease-out hover:-translate-y-[2px] hover:border-[var(--surface-border-strong)] hover:shadow-[var(--surface-shadow-strong)]',
        className,
      )}
      layout
      layoutId={layoutId}
      transition={{ type: 'spring', ...spatialSprings.panel }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

type SpotlightButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  glowClassName?: string;
};

export function SpotlightButton(props: SpotlightButtonProps) {
  const { className, glowClassName, ...rest } = props;
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={cn('relative inline-flex', glowClassName)}
      transition={{ type: 'spring', ...spatialSprings.panel }}
      whileHover={reducedMotion ? undefined : { y: -2, scale: 1.01 }}
      whileTap={reducedMotion ? undefined : { scale: 0.99 }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[image:var(--spotlight-glow)] opacity-60 blur-xl" />
      <Button className={cn('relative z-10', className)} {...rest} />
    </motion.div>
  );
}

type StickyActionRailProps = {
  children?: ReactNode;
  className?: string;
};

export function StickyActionRail(props: StickyActionRailProps) {
  const { children, className } = props;

  return (
    <div className={cn('grid content-start gap-3 lg:sticky lg:top-24', className)}>
      {children}
    </div>
  );
}

export function MotionEmptyState(props: HTMLMotionProps<'div'>) {
  const { children, className, ...rest } = props;
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      className={className}
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      transition={{ type: 'spring', ...spatialSprings.reveal }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

type MotionTabItem = {
  value: string;
  label: ReactNode;
};

export function MotionTabs(props: {
  items: MotionTabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  tabClassName?: string;
  activeTabClassName?: string;
  groupId?: string;
}) {
  const {
    activeTabClassName,
    className,
    groupId = 'motion-tabs',
    items,
    onChange,
    tabClassName,
    value,
  } = props;

  return (
    <div
      className={cn(
        'inline-flex flex-wrap items-center gap-2 rounded-full border border-[var(--surface-border)] bg-[var(--surface-soft)] p-1.5 shadow-[var(--surface-shadow)] backdrop-blur-xl',
        className,
      )}
      role="tablist"
    >
      {items.map((item) => {
        const isActive = item.value === value;

        return (
          <button
            key={item.value}
            aria-selected={isActive}
            className={cn(
              'relative inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold text-[var(--foreground-soft)] transition duration-200',
              isActive ? cn('text-[var(--foreground)]', activeTabClassName) : null,
              tabClassName,
            )}
            role="tab"
            type="button"
            onClick={() => onChange(item.value)}
          >
            {isActive ? (
              <motion.span
                className="absolute inset-0 rounded-full border border-[var(--surface-border-strong)] bg-[var(--motion-tab-active-bg)] shadow-[var(--motion-tab-active-shadow)]"
                layoutId={`${groupId}-highlight`}
                transition={{ type: 'spring', ...spatialSprings.panel }}
              />
            ) : null}
            <span className="relative z-10">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
