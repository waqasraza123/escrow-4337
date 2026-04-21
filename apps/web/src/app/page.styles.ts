const styles = {
  page: 'min-h-screen',
  console:
    'mx-auto grid w-[min(1480px,calc(100vw-40px))] gap-7 py-8 pb-22 max-md:w-[min(100vw-24px,1480px)]',
  topBar:
    'relative overflow-hidden rounded-[1.8rem] border border-[var(--surface-border-strong)] bg-[var(--panel-bg)] px-5 py-5 shadow-[var(--surface-shadow)] backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[image:var(--panel-top-border)]',
  topBarContent: 'grid max-w-3xl gap-2',
  topBarLabel:
    'text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--foreground-muted)]',
  topBarMeta: 'text-sm leading-6 text-[var(--foreground-soft)]',
  hero:
    'relative overflow-hidden rounded-[2rem] border border-[var(--surface-border-strong)] bg-[image:var(--hero-bg)] p-8 shadow-[var(--surface-shadow-strong)] before:absolute before:-right-24 before:top-[-7rem] before:h-56 before:w-56 before:rounded-full before:bg-[image:var(--hero-orb-primary)] before:content-[\'\'] after:absolute after:bottom-[-8rem] after:left-[-5rem] after:h-64 after:w-64 after:rounded-full after:bg-[image:var(--hero-orb-secondary)] after:content-[\'\'] lg:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)] [&_h1]:max-w-[10ch] [&_h1]:text-[clamp(3.1rem,6vw,5.8rem)] [&_h1]:leading-[0.9] [&_h1]:text-[var(--foreground)]',
  eyebrow:
    'text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--accent-eyebrow)]',
  panelEyebrow:
    'text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--accent-eyebrow-soft)]',
  heroCopy: 'mt-4 max-w-[60ch] text-[1.02rem] leading-7 text-[var(--foreground-soft)]',
  heroCard:
    'relative grid content-start gap-4 overflow-hidden rounded-[1.7rem] border border-[var(--surface-border)] bg-[image:var(--card-strong-bg)] p-6 shadow-[var(--surface-shadow)] backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[image:var(--panel-top-border)]',
  metaLabel:
    'mb-2 block text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]',
  grid: 'grid gap-5 xl:grid-cols-2',
  panel:
    'relative overflow-hidden rounded-[1.75rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-6 shadow-[var(--surface-shadow)] backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[image:var(--panel-top-border)]',
  panelHeader:
    'mb-5 flex items-center justify-between gap-4 [&_h2]:mt-1 [&_h2]:text-[clamp(1.4rem,3vw,1.95rem)] [&_h2]:leading-[1.02]',
  stack: 'grid gap-4',
  field:
    'grid gap-2 [&_span:first-child]:text-[0.76rem] [&_span:first-child]:font-semibold [&_span:first-child]:uppercase [&_span:first-child]:tracking-[0.1em] [&_span:first-child]:text-[var(--foreground-muted)] [&_input]:min-h-12 [&_input]:w-full [&_input]:rounded-[1rem] [&_input]:border [&_input]:border-[var(--field-border)] [&_input]:bg-[var(--field-bg)] [&_input]:px-4 [&_input]:py-3.5 [&_input]:text-[var(--foreground)] [&_input]:shadow-[var(--field-shadow)] [&_input]:backdrop-blur-xl [&_textarea]:min-h-[120px] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-[1rem] [&_textarea]:border [&_textarea]:border-[var(--field-border)] [&_textarea]:bg-[var(--field-bg)] [&_textarea]:px-4 [&_textarea]:py-3.5 [&_textarea]:text-[var(--foreground)] [&_textarea]:shadow-[var(--field-shadow)] [&_textarea]:backdrop-blur-xl [&_select]:min-h-12 [&_select]:w-full [&_select]:rounded-[1rem] [&_select]:border [&_select]:border-[var(--field-border)] [&_select]:bg-[var(--field-bg)] [&_select]:px-4 [&_select]:py-3.5 [&_select]:text-[var(--foreground)] [&_select]:backdrop-blur-xl',
  ltrValue: 'ltr-value',
  inlineActions: 'flex flex-wrap items-center gap-3',
  actionLink:
    'inline-flex min-h-12 items-center justify-center rounded-full border px-4 py-3 text-sm font-bold tracking-[-0.01em] transition duration-200 ease-out hover:-translate-y-0.5',
  actionLinkPrimary:
    'border-transparent bg-[image:var(--accent-gradient)] text-[var(--accent-strong-fg)] shadow-[var(--button-primary-shadow)]',
  actionLinkSecondary:
    'border-[var(--button-secondary-border)] bg-[var(--button-secondary-bg)] text-[var(--foreground)] shadow-[var(--button-secondary-shadow)] backdrop-blur-xl hover:border-[var(--button-secondary-border-strong)]',
  stateText: 'text-sm leading-6 text-[var(--foreground-soft)]',
  muted: 'text-sm leading-6 text-[var(--foreground-soft)]',
  summaryGrid: 'grid gap-4 md:grid-cols-2 xl:grid-cols-3',
  walletCard:
    'rounded-[1.35rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  walletConnectionCard:
    'rounded-[1.35rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  timelineCard:
    'rounded-[1.35rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  actionPanel:
    'grid gap-4 rounded-[1.35rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  walletList: 'grid gap-3.5',
  jobList: 'grid gap-3.5',
  auditPanel: 'grid gap-3.5',
  composerRail: 'grid gap-3.5 md:grid-cols-3',
  composerStep:
    'grid gap-2 rounded-[1.35rem] border border-[var(--interactive-border)] bg-[var(--panel-bg)] p-4 text-left text-[var(--foreground)] shadow-[var(--interactive-shadow)] backdrop-blur-xl [&_small]:text-sm [&_small]:leading-6 [&_small]:text-[var(--foreground-soft)] [&_span:first-child]:text-[0.72rem] [&_span:first-child]:font-bold [&_span:first-child]:uppercase [&_span:first-child]:tracking-[0.16em] [&_span:first-child]:text-[var(--foreground-muted)]',
  composerStepActive:
    'border-[var(--highlighted-surface-border)] bg-[image:var(--highlighted-surface-bg)] shadow-[var(--surface-shadow-strong)]',
  composerSection:
    'grid gap-4 rounded-[1.35rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-5 shadow-[var(--interactive-shadow)] backdrop-blur-xl',
  composerSummaryCard:
    'grid gap-4 rounded-[1.35rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-5 shadow-[var(--interactive-shadow)] backdrop-blur-xl',
  composerSplit: 'grid gap-4 md:grid-cols-2',
  checklist: 'grid gap-3',
  checklistItem:
    'flex items-center justify-between gap-4 rounded-[1rem] border border-[var(--interactive-border)] bg-[var(--panel-bg)] px-4 py-3.5 shadow-[var(--interactive-shadow)] [&_strong:first-child]:min-w-16',
  roleBar: 'flex flex-wrap gap-2.5',
  statusBanner:
    'grid gap-2.5 rounded-[1.35rem] border border-[var(--status-info-border)] bg-[image:var(--highlighted-surface-bg)] px-4 py-4 shadow-[var(--surface-shadow)]',
  roleBadge:
    'inline-flex items-center rounded-full border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-3 py-2 text-[0.74rem] font-bold uppercase tracking-[0.12em] text-[var(--status-info-fg)]',
  roleBadgeMuted:
    'inline-flex items-center rounded-full border border-[var(--status-muted-border)] bg-[var(--status-muted-bg)] px-3 py-2 text-[0.74rem] font-bold uppercase tracking-[0.12em] text-[var(--status-muted-fg)]',
  workspaceStack: 'grid gap-3.5',
  milestoneRail: 'grid gap-3',
  milestonePickerEmpty:
    'rounded-[1.35rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  milestoneTile:
    'grid gap-3 rounded-[1.35rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-4 text-left shadow-[var(--surface-shadow)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--surface-border-strong)]',
  milestoneTileActive:
    'border-[var(--highlighted-surface-border)] bg-[image:var(--highlighted-surface-bg)]',
  milestoneBadge:
    'inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[0.74rem] font-bold uppercase tracking-[0.08em]',
  lifecycleState:
    'lifecycle-state inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[0.74rem] font-bold uppercase tracking-[0.08em]',
  milestoneMetaRow: 'flex flex-wrap justify-between gap-2.5 [&_small]:text-[var(--foreground-muted)]',
  lifecycleMeta: 'flex flex-wrap justify-between gap-2.5 [&_small]:text-[var(--foreground-muted)]',
  workspaceHead: 'flex items-start justify-between gap-3',
  walletTitleRow: 'flex items-center justify-between gap-3',
  timelineHead: 'flex items-center justify-between gap-3',
  lifecycleHead: 'flex items-start justify-between gap-3',
  selectedMilestoneHeader: 'flex items-start justify-between gap-3',
  lifecycleCard:
    'grid gap-3.5 rounded-[1.35rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  lifecycleReady:
    'border-[var(--status-info-border)] [&_.lifecycle-state]:bg-[var(--status-info-bg)] [&_.lifecycle-state]:text-[var(--status-info-fg)]',
  lifecyclePending:
    'border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] [&_.lifecycle-state]:bg-[var(--status-warning-bg)] [&_.lifecycle-state]:text-[var(--status-warning-fg)]',
  lifecycleConfirmed:
    'border-[var(--status-success-border)] bg-[var(--status-success-bg)] [&_.lifecycle-state]:bg-[var(--status-success-bg)] [&_.lifecycle-state]:text-[var(--status-success-fg)]',
  lifecycleFailed:
    'border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] [&_.lifecycle-state]:bg-[var(--status-danger-bg)] [&_.lifecycle-state]:text-[var(--status-danger-fg)]',
  lifecycleBlocked:
    'border-[var(--status-muted-border)] bg-[var(--status-muted-bg)] [&_.lifecycle-state]:bg-[var(--status-muted-bg)] [&_.lifecycle-state]:text-[var(--status-muted-fg)]',
  detailGrid: 'grid gap-5 2xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.9fr)]',
  taskBoard: 'grid gap-3',
  taskCardContext:
    'flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]',
  jobRow:
    'grid gap-3 rounded-[1.35rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-4 text-left shadow-[var(--surface-shadow)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--surface-border-strong)]',
  jobRowActive:
    'border-[var(--highlighted-surface-border)] bg-[image:var(--highlighted-surface-bg)] shadow-[var(--surface-shadow-strong)]',
  linkList: 'grid gap-2',
  milestoneDisputed: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]',
  milestoneEditor:
    'grid gap-3 rounded-[1.25rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-4 backdrop-blur-xl',
  milestonePending: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]',
  milestoneRefunded: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]',
  milestoneReleased: 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]',
  milestoneDelivered: 'bg-[var(--status-info-bg)] text-[var(--status-info-fg)]',
  secondaryButton:
    'inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--button-secondary-border)] bg-[var(--button-secondary-bg)] px-4 py-2.5 text-sm font-semibold tracking-[-0.01em] text-[var(--foreground)] shadow-[var(--button-secondary-shadow)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--button-secondary-border-strong)]',
  languageSwitcher:
    'inline-flex items-center gap-2 rounded-full bg-[var(--theme-switcher-bg)] px-3 py-2 shadow-[var(--theme-switcher-shadow)] backdrop-blur-xl [&_[role=group]]:inline-flex [&_[role=group]]:gap-1.5',
  languageSwitcherLabel:
    'text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]',
  languageSwitcherOption:
    'min-h-10 rounded-full bg-transparent px-3.5 py-2.5 text-sm text-[var(--foreground)] shadow-[var(--theme-switcher-option-shadow)]',
  languageSwitcherOptionActive:
    'bg-[image:var(--theme-switcher-option-active-bg)] text-[var(--theme-switcher-option-active-fg)] shadow-[var(--theme-switcher-option-active-shadow)]',
} as const;

export default styles;
