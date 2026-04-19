const styles = {
  page: 'min-h-screen',
  console: 'mx-auto grid w-[min(1480px,calc(100vw-40px))] gap-7 py-7 pb-22',
  topBar:
    'flex flex-wrap items-center justify-between gap-4 rounded-[1.9rem] border border-[var(--surface-border)] bg-[rgba(255,251,245,0.84)] px-4 py-4 backdrop-blur-xl shadow-[var(--surface-shadow)]',
  topBarContent: 'grid max-w-3xl gap-1.5',
  topBarLabel:
    'text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]',
  topBarMeta: 'text-sm leading-6 text-[var(--foreground-soft)]',
  hero:
    'grid items-start gap-7 rounded-[1.9rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,249,242,0.96))] p-8 shadow-[var(--surface-shadow-strong)] lg:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)] [&_h1]:max-w-[9.8ch] [&_h1]:text-[clamp(2.9rem,6vw,5.5rem)] [&_h1]:leading-[0.92] [&_h1]:text-[var(--foreground)]',
  eyebrow:
    'text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]',
  panelEyebrow:
    'text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]',
  heroCopy: 'mt-4 max-w-[60ch] text-[1.04rem] leading-7 text-[var(--foreground-soft)]',
  heroCard:
    'grid content-start gap-4 rounded-[1.9rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,249,242,0.96))] p-6 shadow-[var(--surface-shadow)]',
  metaLabel:
    'mb-2 block text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[var(--foreground-muted)]',
  grid: 'grid gap-5 xl:grid-cols-2',
  panel:
    'rounded-[1.9rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,249,242,0.96))] p-7 shadow-[var(--surface-shadow)]',
  panelHeader:
    'mb-5 flex items-center justify-between gap-4 [&_h2]:mt-1.5 [&_h2]:text-[clamp(1.35rem,3vw,1.85rem)] [&_h2]:leading-[1.06]',
  stack: 'grid gap-4',
  field:
    'grid gap-2 [&_span:first-child]:text-[0.78rem] [&_span:first-child]:font-semibold [&_span:first-child]:tracking-[0.01em] [&_span:first-child]:text-[var(--foreground-soft)] [&_input]:min-h-12 [&_input]:w-full [&_input]:rounded-[1rem] [&_input]:border [&_input]:border-[rgba(92,67,46,0.12)] [&_input]:bg-white/95 [&_input]:px-4 [&_input]:py-3.5 [&_input]:text-[var(--foreground)] [&_input]:shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] [&_textarea]:min-h-[120px] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-[1rem] [&_textarea]:border [&_textarea]:border-[rgba(92,67,46,0.12)] [&_textarea]:bg-white/95 [&_textarea]:px-4 [&_textarea]:py-3.5 [&_textarea]:text-[var(--foreground)] [&_textarea]:shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] [&_select]:min-h-12 [&_select]:w-full [&_select]:rounded-[1rem] [&_select]:border [&_select]:border-[rgba(92,67,46,0.12)] [&_select]:bg-white/95 [&_select]:px-4 [&_select]:py-3.5 [&_select]:text-[var(--foreground)]',
  ltrValue: 'ltr-value',
  inlineActions: 'flex flex-wrap items-center gap-3',
  actionLink:
    'inline-flex min-h-12 items-center justify-center rounded-full border border-[rgba(92,67,46,0.12)] px-4 py-3 text-sm font-bold tracking-[-0.01em] transition duration-200 hover:-translate-y-0.5',
  actionLinkPrimary:
    'border-transparent bg-[linear-gradient(135deg,#2d1a11,#5d3620)] text-[#fffaf6] shadow-[0_16px_28px_rgba(48,29,17,0.16)] hover:bg-[linear-gradient(135deg,#27170f,#4c2d1d)]',
  actionLinkSecondary:
    'bg-white/92 text-[var(--foreground)] shadow-[0_10px_18px_rgba(47,31,18,0.06)] hover:border-[rgba(92,67,46,0.18)] hover:bg-white/98',
  stateText: 'text-sm leading-6 text-[var(--foreground-soft)]',
  muted: 'text-sm leading-6 text-[var(--foreground-soft)]',
  summaryGrid: 'grid gap-4 md:grid-cols-2',
  walletCard:
    'rounded-[1.4rem] border border-[var(--surface-border)] bg-white/92 p-4 shadow-[var(--surface-shadow)]',
  walletConnectionCard:
    'rounded-[1.4rem] border border-[var(--surface-border)] bg-white/92 p-4 shadow-[var(--surface-shadow)]',
  timelineCard:
    'rounded-[1.4rem] border border-[var(--surface-border)] bg-white/92 p-4 shadow-[var(--surface-shadow)]',
  actionPanel:
    'grid gap-4 rounded-[1.4rem] border border-[var(--surface-border)] bg-white/92 p-4 shadow-[var(--surface-shadow)]',
  walletList: 'grid gap-3.5',
  jobList: 'grid gap-3.5',
  auditPanel: 'grid gap-3.5',
  composerRail: 'grid gap-3.5 md:grid-cols-3',
  composerStep:
    'grid gap-2 rounded-[1.4rem] bg-white/90 p-4 text-left text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(92,67,46,0.1)] [&_small]:text-sm [&_small]:leading-6 [&_small]:text-[var(--foreground-soft)] [&_span:first-child]:text-[0.72rem] [&_span:first-child]:font-bold [&_span:first-child]:uppercase [&_span:first-child]:tracking-[0.14em] [&_span:first-child]:text-[var(--foreground-muted)]',
  composerStepActive:
    'bg-[rgba(255,245,233,0.98)] shadow-[inset_0_0_0_1px_rgba(164,105,61,0.28),0_12px_24px_rgba(93,54,32,0.08)]',
  composerSection:
    'grid gap-4 rounded-[1.4rem] bg-white/90 p-5 shadow-[inset_0_0_0_1px_rgba(92,67,46,0.1)]',
  composerSummaryCard:
    'grid gap-4 rounded-[1.4rem] bg-white/90 p-5 shadow-[inset_0_0_0_1px_rgba(92,67,46,0.1)]',
  composerSplit: 'grid gap-4 md:grid-cols-2',
  checklist: 'grid gap-3',
  checklistItem:
    'flex items-center justify-between gap-4 rounded-[1rem] bg-[rgba(249,241,231,0.86)] px-4 py-3.5 shadow-[inset_0_0_0_1px_rgba(92,67,46,0.08)] [&_strong:first-child]:min-w-16',
  roleBar: 'flex flex-wrap gap-2.5',
  statusBanner:
    'grid gap-2.5 rounded-[1.4rem] bg-[rgba(255,247,237,0.96)] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(164,105,61,0.16),0_8px_18px_rgba(93,54,32,0.04)]',
  roleBadge:
    'inline-flex items-center rounded-full bg-[rgba(243,227,210,0.96)] px-3 py-2 text-[0.74rem] font-bold uppercase tracking-[0.12em] text-[#744728]',
  roleBadgeMuted:
    'inline-flex items-center rounded-full bg-[rgba(117,99,83,0.1)] px-3 py-2 text-[0.74rem] font-bold uppercase tracking-[0.12em] text-[var(--foreground-soft)]',
  workspaceStack: 'grid gap-3.5',
  milestoneRail: 'grid gap-3',
  milestonePickerEmpty:
    'rounded-[1.4rem] border border-[var(--surface-border)] bg-white/92 p-4 shadow-[var(--surface-shadow)]',
  milestoneTile:
    'grid gap-3 rounded-[1.4rem] border border-[var(--surface-border)] bg-white/92 p-4 text-left shadow-[var(--surface-shadow)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--surface-border-strong)]',
  milestoneTileActive:
    'border-[rgba(164,105,61,0.28)] bg-[rgba(255,245,233,0.98)]',
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
    'grid gap-3.5 rounded-[1.4rem] border border-[var(--surface-border)] bg-white/92 p-4 shadow-[var(--surface-shadow)]',
  lifecycleReady:
    'shadow-[inset_0_0_0_1px_rgba(123,169,164,0.22)] [&_.lifecycle-state]:bg-[rgba(220,244,239,0.96)] [&_.lifecycle-state]:text-[#16605c]',
  lifecyclePending:
    'bg-[rgba(255,248,224,0.94)] shadow-[inset_0_0_0_1px_rgba(184,142,39,0.24)] [&_.lifecycle-state]:bg-[rgba(255,242,200,0.96)] [&_.lifecycle-state]:text-[#946d14]',
  lifecycleConfirmed:
    'bg-[rgba(240,249,244,0.94)] shadow-[inset_0_0_0_1px_rgba(67,140,98,0.22)] [&_.lifecycle-state]:bg-[rgba(220,244,239,0.96)] [&_.lifecycle-state]:text-[#1b6d41]',
  lifecycleFailed:
    'bg-[rgba(255,240,236,0.94)] shadow-[inset_0_0_0_1px_rgba(195,84,52,0.22)] [&_.lifecycle-state]:bg-[rgba(255,228,220,0.96)] [&_.lifecycle-state]:text-[#a1482a]',
  lifecycleBlocked:
    'bg-[rgba(244,239,232,0.94)] shadow-[inset_0_0_0_1px_rgba(116,94,74,0.18)] [&_.lifecycle-state]:bg-[rgba(117,99,83,0.1)] [&_.lifecycle-state]:text-[var(--foreground-soft)]',
  detailGrid: 'grid gap-5 2xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.9fr)]',
  taskBoard: 'grid gap-3',
  taskCardContext: 'flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]',
  jobRow:
    'grid gap-3 rounded-[1.4rem] border border-[var(--surface-border)] bg-white/92 p-4 text-left shadow-[var(--surface-shadow)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--surface-border-strong)]',
  jobRowActive:
    'border-[rgba(164,105,61,0.28)] bg-[rgba(255,245,233,0.98)] shadow-[0_14px_28px_rgba(93,54,32,0.08)]',
  linkList: 'grid gap-2',
  milestoneDelivered: 'bg-[rgba(220,244,239,0.96)] text-[#16605c]',
  milestoneDisputed: 'bg-[rgba(255,228,220,0.96)] text-[#a1482a]',
  milestoneEditor: 'grid gap-3 rounded-[1.25rem] border border-[var(--surface-border)] bg-[var(--surface-soft)] p-4',
  milestonePending: 'bg-[rgba(255,242,200,0.96)] text-[#946d14]',
  milestoneRefunded: 'bg-[rgba(255,228,220,0.96)] text-[#a1482a]',
  milestoneReleased: 'bg-[rgba(220,244,239,0.96)] text-[#1b6d41]',
  secondaryButton:
    'inline-flex min-h-11 items-center justify-center rounded-full border border-[rgba(92,67,46,0.12)] bg-white/92 px-4 py-2.5 text-sm font-semibold tracking-[-0.01em] text-[var(--foreground)] shadow-[0_10px_18px_rgba(47,31,18,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(92,67,46,0.18)] hover:bg-white/98',
  languageSwitcher:
    'inline-flex items-center gap-2 rounded-full bg-white/92 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(92,67,46,0.1)] [&_[role=group]]:inline-flex [&_[role=group]]:gap-1.5',
  languageSwitcherLabel:
    'text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]',
  languageSwitcherOption:
    'min-h-10 rounded-full bg-transparent px-3.5 py-2.5 text-sm text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(92,67,46,0.08)]',
  languageSwitcherOptionActive:
    'bg-[linear-gradient(135deg,#2d1a11,#5d3620)] text-[#fffaf6] shadow-[0_10px_18px_rgba(48,29,17,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]',
} as const;

export default styles;
