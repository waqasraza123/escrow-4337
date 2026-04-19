const styles = {
  page: 'min-h-screen',
  console: 'mx-auto grid w-[min(1360px,calc(100vw-48px))] gap-6 py-12 pb-[4.5rem] max-md:w-[min(100vw-28px,1360px)] max-md:py-7 max-md:pb-12',
  topBar:
    'flex flex-wrap items-center justify-between gap-4 rounded-full bg-[rgba(10,15,22,0.5)] px-4 py-3.5 shadow-[inset_0_0_0_1px_rgba(145,164,189,0.16)]',
  topBarContent: 'grid gap-1',
  topBarLabel: 'text-[0.78rem] uppercase tracking-[0.12em] text-[var(--muted-foreground)]',
  topBarMeta: 'text-sm leading-6 text-[var(--muted-foreground)]',
  ltrValue: 'ltr-value',
  hero:
    'grid items-end gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)] [&_h1]:max-w-[11ch] [&_h1]:text-[clamp(2.8rem,5vw,5rem)] [&_h1]:leading-[0.95]',
  eyebrow: 'text-[0.74rem] uppercase tracking-[0.14em] text-[var(--muted-foreground)]',
  panelEyebrow: 'text-[0.74rem] uppercase tracking-[0.14em] text-[var(--muted-foreground)]',
  heroCopy: 'text-sm leading-7 text-[var(--muted-foreground)]',
  stateText: 'text-sm leading-7 text-[var(--muted-foreground)]',
  heroCard:
    'rounded-[1.75rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,rgba(12,17,24,0.84),rgba(22,31,44,0.9))] p-6 shadow-[var(--surface-shadow-strong)]',
  panel:
    'rounded-[1.75rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,rgba(12,17,24,0.84),rgba(22,31,44,0.9))] p-6 shadow-[var(--surface-shadow-strong)]',
  metaLabel: 'mb-1.5 block text-[0.72rem] uppercase tracking-[0.12em] text-[var(--muted-foreground)]',
  panelHeader:
    'mb-4 flex items-center justify-between gap-4 [&_h2]:mt-1 [&_h2]:text-2xl',
  lookupRow:
    'flex flex-wrap gap-3 [&_input]:min-h-12 [&_input]:flex-[1_1_420px] [&_input]:rounded-2xl [&_input]:border [&_input]:border-[rgba(145,164,189,0.2)] [&_input]:bg-[rgba(10,15,22,0.55)] [&_input]:px-4 [&_input]:py-3.5 [&_input]:text-[var(--foreground)]',
  inlineActions: 'flex flex-wrap gap-3',
  fieldGrid: 'flex flex-wrap items-stretch gap-3',
  field:
    'grid flex-[1_1_220px] gap-2 [&_span:first-child]:text-[0.78rem] [&_span:first-child]:uppercase [&_span:first-child]:tracking-[0.08em] [&_span:first-child]:text-[var(--muted-foreground)] [&_input]:min-h-12 [&_input]:rounded-2xl [&_input]:border [&_input]:border-[rgba(145,164,189,0.2)] [&_input]:bg-[rgba(10,15,22,0.55)] [&_input]:px-4 [&_input]:py-3.5 [&_input]:text-[var(--foreground)] [&_select]:min-h-12 [&_select]:rounded-2xl [&_select]:border [&_select]:border-[rgba(145,164,189,0.2)] [&_select]:bg-[rgba(10,15,22,0.55)] [&_select]:px-4 [&_select]:py-3.5 [&_select]:text-[var(--foreground)] [&_textarea]:min-h-28 [&_textarea]:resize-y [&_textarea]:rounded-2xl [&_textarea]:border [&_textarea]:border-[rgba(145,164,189,0.2)] [&_textarea]:bg-[rgba(10,15,22,0.55)] [&_textarea]:px-4 [&_textarea]:py-3.5 [&_textarea]:text-[var(--foreground)]',
  suggestionRow: 'mt-3.5 flex flex-wrap gap-2.5',
  secondaryButton:
    'inline-flex min-h-11 items-center justify-center rounded-full border border-[rgba(145,164,189,0.24)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(145,164,189,0.18)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(145,164,189,0.36)] hover:bg-white/5',
  suggestionChip:
    'inline-flex items-center justify-center rounded-full border border-[rgba(145,164,189,0.24)] bg-transparent px-3.5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(145,164,189,0.18)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(145,164,189,0.36)]',
  languageSwitcher:
    'inline-flex items-center gap-2 rounded-full bg-[rgba(10,15,22,0.62)] px-2.5 py-2 shadow-[inset_0_0_0_1px_rgba(145,164,189,0.16)] [&_[role=group]]:inline-flex [&_[role=group]]:gap-1.5',
  languageSwitcherLabel:
    'text-[0.74rem] uppercase tracking-[0.08em] text-[var(--muted-foreground)]',
  languageSwitcherOption:
    'rounded-full bg-transparent px-3.5 py-2.5 text-sm text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(145,164,189,0.16)]',
  languageSwitcherOptionActive:
    'bg-[linear-gradient(135deg,#eaf4ff,#b7cbe4)] text-[#0c1620] shadow-none',
  summaryGrid: 'grid gap-4 md:grid-cols-3',
  grid: 'grid gap-4 xl:grid-cols-2',
  pressureBadge:
    'inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[0.74rem] font-bold uppercase tracking-[0.08em]',
  pressureStable: 'bg-[rgba(74,156,123,0.2)] text-[#8af0c0]',
  pressureAttention: 'bg-[rgba(206,163,60,0.22)] text-[#f7d783]',
  pressureCritical: 'bg-[rgba(182,84,84,0.24)] text-[#ffb2b2]',
  stack: 'grid gap-3',
  timelineHead: 'flex items-center justify-between gap-3 [&_span]:inline-flex [&_span]:items-center [&_span]:justify-center [&_span]:rounded-full [&_span]:px-3 [&_span]:py-1.5 [&_span]:text-[0.74rem] [&_span]:font-bold [&_span]:uppercase [&_span]:tracking-[0.08em]',
  timelineCard:
    'rounded-[1.25rem] border border-[rgba(145,164,189,0.16)] bg-[rgba(10,15,22,0.52)] p-4 [&_code]:mt-2 [&_code]:block [&_code]:overflow-wrap-anywhere [&_code]:whitespace-pre-wrap [&_pre]:mt-2.5 [&_pre]:overflow-wrap-anywhere [&_pre]:whitespace-pre-wrap [&_small]:mt-2 [&_small]:block [&_small]:text-[var(--muted-foreground)]',
  walletCard:
    'rounded-[1.25rem] border border-[rgba(145,164,189,0.16)] bg-[rgba(10,15,22,0.52)] p-4 shadow-[var(--surface-shadow)]',
  emptyCard:
    'rounded-[1.25rem] border border-[rgba(145,164,189,0.16)] bg-[rgba(10,15,22,0.42)] p-[18px]',
  boundaryCard:
    'rounded-[1.25rem] border border-[rgba(145,164,189,0.16)] bg-[rgba(10,15,22,0.42)] p-[18px]',
  executionFailure:
    'bg-[rgba(74,18,18,0.42)] shadow-[inset_0_0_0_1px_rgba(182,84,84,0.22)]',
  postureStable: 'shadow-[inset_0_0_0_1px_rgba(74,156,123,0.18)]',
  postureReview:
    'bg-[rgba(55,43,18,0.44)] shadow-[inset_0_0_0_1px_rgba(206,163,60,0.24)]',
  postureResolved:
    'bg-[rgba(13,37,28,0.46)] shadow-[inset_0_0_0_1px_rgba(74,156,123,0.22)]',
  timelineNeutral: 'shadow-[inset_0_0_0_1px_rgba(145,164,189,0.16)]',
  timelineWarning:
    'bg-[rgba(55,43,18,0.44)] shadow-[inset_0_0_0_1px_rgba(206,163,60,0.24)]',
  timelineCritical:
    'bg-[rgba(74,18,18,0.42)] shadow-[inset_0_0_0_1px_rgba(182,84,84,0.24)]',
  timelineSuccess:
    'bg-[rgba(13,37,28,0.46)] shadow-[inset_0_0_0_1px_rgba(74,156,123,0.22)]',
} as const;

export default styles;
