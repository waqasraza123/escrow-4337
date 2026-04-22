const styles = {
  page: 'min-h-screen',
  console:
    'mx-auto grid w-[min(1480px,calc(100vw-40px))] gap-7 py-8 pb-22 max-md:w-[min(100vw-24px,1480px)]',
  topBar:
    'relative overflow-hidden flex flex-wrap items-center justify-between gap-4 rounded-[1.8rem] border border-[var(--surface-border-strong)] bg-[var(--panel-bg)] px-5 py-5 shadow-[var(--surface-shadow)] backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[image:var(--panel-top-border)]',
  topBarContent: 'grid max-w-3xl gap-2',
  topBarLabel:
    'text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--foreground-muted)]',
  topBarMeta: 'text-sm leading-6 text-[var(--foreground-soft)]',
  ltrValue: 'ltr-value',
  hero:
    'relative overflow-hidden rounded-[2rem] border border-[var(--surface-border-strong)] bg-[image:var(--hero-bg)] p-8 shadow-[var(--surface-shadow-strong)]',
  eyebrow:
    'text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--accent-eyebrow)]',
  panelEyebrow:
    'text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--accent-eyebrow-soft)]',
  heroCopy: 'mt-4 max-w-[60ch] text-[1.02rem] leading-7 text-[var(--foreground-soft)]',
  stateText: 'text-sm leading-6 text-[var(--foreground-soft)]',
  heroCard:
    'relative grid content-start gap-4 overflow-hidden rounded-[1.7rem] border border-[var(--surface-border)] bg-[image:var(--card-strong-bg)] p-6 shadow-[var(--surface-shadow)] backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[image:var(--panel-top-border)]',
  panel:
    'relative overflow-hidden rounded-[1.75rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-6 shadow-[var(--surface-shadow)] backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[image:var(--panel-top-border)]',
  metaLabel:
    'mb-2 block text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]',
  panelHeader:
    'mb-5 flex items-center justify-between gap-4 [&_h2]:mt-1 [&_h2]:text-[clamp(1.4rem,3vw,1.95rem)] [&_h2]:leading-[1.02]',
  lookupRow:
    'flex flex-wrap gap-3 [&_input]:min-h-12 [&_input]:flex-[1_1_420px] [&_input]:rounded-[1rem] [&_input]:border [&_input]:border-[var(--field-border)] [&_input]:bg-[var(--field-bg)] [&_input]:px-4 [&_input]:py-3.5 [&_input]:text-[var(--foreground)] [&_input]:shadow-[var(--field-shadow)] [&_input]:backdrop-blur-xl',
  inlineActions: 'flex flex-wrap items-center gap-3',
  fieldGrid: 'flex flex-wrap items-stretch gap-3',
  field:
    'grid flex-[1_1_220px] gap-2 [&_span:first-child]:text-[0.76rem] [&_span:first-child]:font-semibold [&_span:first-child]:uppercase [&_span:first-child]:tracking-[0.1em] [&_span:first-child]:text-[var(--foreground-muted)] [&_input]:min-h-12 [&_input]:rounded-[1rem] [&_input]:border [&_input]:border-[var(--field-border)] [&_input]:bg-[var(--field-bg)] [&_input]:px-4 [&_input]:py-3.5 [&_input]:text-[var(--foreground)] [&_input]:shadow-[var(--field-shadow)] [&_input]:backdrop-blur-xl [&_select]:min-h-12 [&_select]:rounded-[1rem] [&_select]:border [&_select]:border-[var(--field-border)] [&_select]:bg-[var(--field-bg)] [&_select]:px-4 [&_select]:py-3.5 [&_select]:text-[var(--foreground)] [&_select]:backdrop-blur-xl [&_textarea]:min-h-28 [&_textarea]:resize-y [&_textarea]:rounded-[1rem] [&_textarea]:border [&_textarea]:border-[var(--field-border)] [&_textarea]:bg-[var(--field-bg)] [&_textarea]:px-4 [&_textarea]:py-3.5 [&_textarea]:text-[var(--foreground)] [&_textarea]:shadow-[var(--field-shadow)] [&_textarea]:backdrop-blur-xl',
  suggestionRow: 'mt-3.5 flex flex-wrap gap-2.5',
  secondaryButton:
    'inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--button-secondary-border)] bg-[var(--button-secondary-bg)] px-4 py-2.5 text-sm font-semibold tracking-[-0.01em] text-[var(--foreground)] shadow-[var(--button-secondary-shadow)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--button-secondary-border-strong)]',
  suggestionChip:
    'inline-flex items-center justify-center rounded-full border border-[var(--button-secondary-border)] bg-[var(--button-secondary-bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-[var(--button-secondary-shadow)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--button-secondary-border-strong)]',
  languageSwitcher:
    'inline-flex items-center gap-2 rounded-full bg-[var(--theme-switcher-bg)] px-3 py-2 shadow-[var(--theme-switcher-shadow)] backdrop-blur-xl [&_[role=group]]:inline-flex [&_[role=group]]:gap-1.5',
  languageSwitcherLabel:
    'text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]',
  languageSwitcherOption:
    'min-h-10 rounded-full bg-transparent px-3.5 py-2.5 text-sm text-[var(--foreground)] shadow-[var(--theme-switcher-option-shadow)]',
  languageSwitcherOptionActive:
    'bg-[image:var(--theme-switcher-option-active-bg)] text-[var(--theme-switcher-option-active-fg)] shadow-[var(--theme-switcher-option-active-shadow)]',
  summaryGrid: 'grid gap-4 md:grid-cols-2 xl:grid-cols-3',
  grid: 'grid gap-5 xl:grid-cols-2',
  pressureBadge:
    'inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[0.74rem] font-bold uppercase tracking-[0.08em]',
  pressureStable: 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]',
  pressureAttention: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]',
  pressureCritical: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]',
  stack: 'grid gap-4',
  timelineHead: 'flex items-center justify-between gap-3 [&_span]:inline-flex [&_span]:items-center [&_span]:justify-center [&_span]:rounded-full [&_span]:px-3 [&_span]:py-1.5 [&_span]:text-[0.74rem] [&_span]:font-bold [&_span]:uppercase [&_span]:tracking-[0.08em]',
  timelineCard:
    'rounded-[1.35rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl [&_code]:mt-2 [&_code]:block [&_code]:overflow-wrap-anywhere [&_code]:whitespace-pre-wrap [&_pre]:mt-2.5 [&_pre]:overflow-wrap-anywhere [&_pre]:whitespace-pre-wrap [&_small]:mt-2 [&_small]:block [&_small]:text-[var(--foreground-muted)]',
  walletCard:
    'rounded-[1.35rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  emptyCard:
    'rounded-[1.35rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-[18px] shadow-[var(--surface-shadow)] backdrop-blur-xl',
  boundaryCard:
    'rounded-[1.35rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-[18px] shadow-[var(--surface-shadow)] backdrop-blur-xl',
  executionFailure:
    'border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] shadow-[var(--surface-shadow)]',
  postureStable:
    'border-[var(--status-success-border)] bg-[var(--status-success-bg)] shadow-[var(--surface-shadow)]',
  postureReview:
    'border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] shadow-[var(--surface-shadow)]',
  postureResolved:
    'border-[var(--status-success-border)] bg-[var(--status-success-bg)] shadow-[var(--surface-shadow)]',
  timelineNeutral: 'border-[var(--surface-border)]',
  timelineWarning:
    'border-[var(--status-warning-border)] bg-[var(--status-warning-bg)]',
  timelineCritical:
    'border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]',
  timelineSuccess:
    'border-[var(--status-success-border)] bg-[var(--status-success-bg)]',
} as const;

export default styles;
