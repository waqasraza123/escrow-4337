const styles = {
  page: 'min-h-screen',
  console:
    'mx-auto grid w-[min(1480px,calc(100vw-40px))] gap-7 py-8 pb-22 max-md:w-[min(100vw-24px,1480px)]',
  topBar:
    'relative overflow-hidden rounded-[1.8rem] border border-[var(--surface-border-strong)] bg-[rgba(6,15,28,0.72)] px-5 py-5 shadow-[var(--surface-shadow)] backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(107,243,255,0.88),transparent)]',
  topBarContent: 'grid max-w-3xl gap-2',
  topBarLabel:
    'text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--foreground-muted)]',
  topBarMeta: 'text-sm leading-6 text-[var(--foreground-soft)]',
  hero:
    'relative overflow-hidden rounded-[2rem] border border-[var(--surface-border-strong)] bg-[linear-gradient(145deg,rgba(10,22,38,0.96),rgba(5,11,21,0.98))] p-8 shadow-[var(--surface-shadow-strong)] before:absolute before:-right-24 before:top-[-7rem] before:h-56 before:w-56 before:rounded-full before:bg-[radial-gradient(circle,rgba(110,232,255,0.2),transparent_68%)] before:content-[\'\'] after:absolute after:bottom-[-8rem] after:left-[-5rem] after:h-64 after:w-64 after:rounded-full after:bg-[radial-gradient(circle,rgba(145,121,255,0.18),transparent_70%)] after:content-[\'\'] lg:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)] [&_h1]:max-w-[10ch] [&_h1]:text-[clamp(3.1rem,6vw,5.8rem)] [&_h1]:leading-[0.9] [&_h1]:text-[var(--foreground)]',
  eyebrow:
    'text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#8adfff]',
  panelEyebrow:
    'text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#8adfff]',
  heroCopy: 'mt-4 max-w-[60ch] text-[1.02rem] leading-7 text-[var(--foreground-soft)]',
  heroCard:
    'relative grid content-start gap-4 overflow-hidden rounded-[1.7rem] border border-[var(--surface-border)] bg-[rgba(9,18,32,0.82)] p-6 shadow-[var(--surface-shadow)] backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(107,243,255,0.76),transparent)]',
  metaLabel:
    'mb-2 block text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]',
  grid: 'grid gap-5 xl:grid-cols-2',
  panel:
    'relative overflow-hidden rounded-[1.75rem] border border-[var(--surface-border)] bg-[rgba(7,16,30,0.78)] p-6 shadow-[var(--surface-shadow)] backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(107,243,255,0.72),transparent)]',
  panelHeader:
    'mb-5 flex items-center justify-between gap-4 [&_h2]:mt-1 [&_h2]:text-[clamp(1.4rem,3vw,1.95rem)] [&_h2]:leading-[1.02]',
  stack: 'grid gap-4',
  field:
    'grid gap-2 [&_span:first-child]:text-[0.76rem] [&_span:first-child]:font-semibold [&_span:first-child]:uppercase [&_span:first-child]:tracking-[0.1em] [&_span:first-child]:text-[var(--foreground-muted)] [&_input]:min-h-12 [&_input]:w-full [&_input]:rounded-[1rem] [&_input]:border [&_input]:border-[rgba(115,170,232,0.18)] [&_input]:bg-[rgba(3,10,18,0.7)] [&_input]:px-4 [&_input]:py-3.5 [&_input]:text-[var(--foreground)] [&_input]:shadow-[inset_0_1px_0_rgba(144,190,255,0.06)] [&_input]:backdrop-blur-xl [&_textarea]:min-h-[120px] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-[1rem] [&_textarea]:border [&_textarea]:border-[rgba(115,170,232,0.18)] [&_textarea]:bg-[rgba(3,10,18,0.7)] [&_textarea]:px-4 [&_textarea]:py-3.5 [&_textarea]:text-[var(--foreground)] [&_textarea]:shadow-[inset_0_1px_0_rgba(144,190,255,0.06)] [&_textarea]:backdrop-blur-xl [&_select]:min-h-12 [&_select]:w-full [&_select]:rounded-[1rem] [&_select]:border [&_select]:border-[rgba(115,170,232,0.18)] [&_select]:bg-[rgba(3,10,18,0.7)] [&_select]:px-4 [&_select]:py-3.5 [&_select]:text-[var(--foreground)] [&_select]:backdrop-blur-xl',
  ltrValue: 'ltr-value',
  inlineActions: 'flex flex-wrap items-center gap-3',
  actionLink:
    'inline-flex min-h-12 items-center justify-center rounded-full border px-4 py-3 text-sm font-bold tracking-[-0.01em] transition duration-200 ease-out hover:-translate-y-0.5',
  actionLinkPrimary:
    'border-transparent bg-[linear-gradient(135deg,#6bf3ff,#8792ff,#c86dff)] text-[#04101d] shadow-[0_20px_40px_rgba(101,181,255,0.24)]',
  actionLinkSecondary:
    'border-[rgba(112,170,236,0.24)] bg-[rgba(7,17,31,0.68)] text-[var(--foreground)] shadow-[0_16px_30px_rgba(4,11,24,0.24)] backdrop-blur-xl hover:border-[rgba(107,243,255,0.46)]',
  stateText: 'text-sm leading-6 text-[var(--foreground-soft)]',
  muted: 'text-sm leading-6 text-[var(--foreground-soft)]',
  summaryGrid: 'grid gap-4 md:grid-cols-2 xl:grid-cols-3',
  walletCard:
    'rounded-[1.35rem] border border-[var(--surface-border)] bg-[rgba(7,16,30,0.7)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  walletConnectionCard:
    'rounded-[1.35rem] border border-[var(--surface-border)] bg-[rgba(7,16,30,0.7)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  timelineCard:
    'rounded-[1.35rem] border border-[var(--surface-border)] bg-[rgba(7,16,30,0.7)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  actionPanel:
    'grid gap-4 rounded-[1.35rem] border border-[var(--surface-border)] bg-[rgba(7,16,30,0.7)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  walletList: 'grid gap-3.5',
  jobList: 'grid gap-3.5',
  auditPanel: 'grid gap-3.5',
  composerRail: 'grid gap-3.5 md:grid-cols-3',
  composerStep:
    'grid gap-2 rounded-[1.35rem] border border-[rgba(115,170,232,0.12)] bg-[rgba(7,16,30,0.68)] p-4 text-left text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(144,190,255,0.05)] backdrop-blur-xl [&_small]:text-sm [&_small]:leading-6 [&_small]:text-[var(--foreground-soft)] [&_span:first-child]:text-[0.72rem] [&_span:first-child]:font-bold [&_span:first-child]:uppercase [&_span:first-child]:tracking-[0.16em] [&_span:first-child]:text-[var(--foreground-muted)]',
  composerStepActive:
    'border-[rgba(107,243,255,0.42)] bg-[linear-gradient(160deg,rgba(10,24,41,0.92),rgba(20,24,54,0.92))] shadow-[0_24px_48px_rgba(4,11,24,0.26),inset_0_1px_0_rgba(107,243,255,0.16)]',
  composerSection:
    'grid gap-4 rounded-[1.35rem] border border-[rgba(115,170,232,0.14)] bg-[rgba(7,16,30,0.72)] p-5 shadow-[inset_0_1px_0_rgba(144,190,255,0.06)] backdrop-blur-xl',
  composerSummaryCard:
    'grid gap-4 rounded-[1.35rem] border border-[rgba(115,170,232,0.14)] bg-[rgba(7,16,30,0.72)] p-5 shadow-[inset_0_1px_0_rgba(144,190,255,0.06)] backdrop-blur-xl',
  composerSplit: 'grid gap-4 md:grid-cols-2',
  checklist: 'grid gap-3',
  checklistItem:
    'flex items-center justify-between gap-4 rounded-[1rem] border border-[rgba(115,170,232,0.12)] bg-[rgba(7,16,30,0.7)] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(144,190,255,0.05)] [&_strong:first-child]:min-w-16',
  roleBar: 'flex flex-wrap gap-2.5',
  statusBanner:
    'grid gap-2.5 rounded-[1.35rem] border border-[rgba(107,243,255,0.2)] bg-[linear-gradient(135deg,rgba(8,25,42,0.92),rgba(11,18,36,0.94))] px-4 py-4 shadow-[0_16px_34px_rgba(4,11,24,0.22)]',
  roleBadge:
    'inline-flex items-center rounded-full border border-[rgba(107,243,255,0.26)] bg-[rgba(107,243,255,0.12)] px-3 py-2 text-[0.74rem] font-bold uppercase tracking-[0.12em] text-[#8defff]',
  roleBadgeMuted:
    'inline-flex items-center rounded-full border border-[rgba(115,170,232,0.12)] bg-[rgba(115,170,232,0.08)] px-3 py-2 text-[0.74rem] font-bold uppercase tracking-[0.12em] text-[var(--foreground-soft)]',
  workspaceStack: 'grid gap-3.5',
  milestoneRail: 'grid gap-3',
  milestonePickerEmpty:
    'rounded-[1.35rem] border border-[var(--surface-border)] bg-[rgba(7,16,30,0.7)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  milestoneTile:
    'grid gap-3 rounded-[1.35rem] border border-[var(--surface-border)] bg-[rgba(7,16,30,0.72)] p-4 text-left shadow-[var(--surface-shadow)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--surface-border-strong)]',
  milestoneTileActive:
    'border-[rgba(107,243,255,0.42)] bg-[linear-gradient(160deg,rgba(10,24,41,0.92),rgba(20,24,54,0.92))]',
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
    'grid gap-3.5 rounded-[1.35rem] border border-[var(--surface-border)] bg-[rgba(7,16,30,0.72)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  lifecycleReady:
    'border-[rgba(107,243,255,0.28)] [&_.lifecycle-state]:bg-[rgba(107,243,255,0.12)] [&_.lifecycle-state]:text-[#8defff]',
  lifecyclePending:
    'border-[rgba(255,183,84,0.28)] bg-[rgba(42,28,10,0.36)] [&_.lifecycle-state]:bg-[rgba(255,183,84,0.14)] [&_.lifecycle-state]:text-[#ffd38e]',
  lifecycleConfirmed:
    'border-[rgba(46,227,181,0.28)] bg-[rgba(8,37,29,0.36)] [&_.lifecycle-state]:bg-[rgba(46,227,181,0.14)] [&_.lifecycle-state]:text-[#82f4d5]',
  lifecycleFailed:
    'border-[rgba(255,110,140,0.28)] bg-[rgba(44,12,22,0.42)] [&_.lifecycle-state]:bg-[rgba(255,110,140,0.14)] [&_.lifecycle-state]:text-[#ffafbf]',
  lifecycleBlocked:
    'border-[rgba(115,170,232,0.16)] bg-[rgba(12,20,34,0.5)] [&_.lifecycle-state]:bg-[rgba(115,170,232,0.08)] [&_.lifecycle-state]:text-[var(--foreground-soft)]',
  detailGrid: 'grid gap-5 2xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,0.9fr)]',
  taskBoard: 'grid gap-3',
  taskCardContext:
    'flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]',
  jobRow:
    'grid gap-3 rounded-[1.35rem] border border-[var(--surface-border)] bg-[rgba(7,16,30,0.72)] p-4 text-left shadow-[var(--surface-shadow)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--surface-border-strong)]',
  jobRowActive:
    'border-[rgba(107,243,255,0.42)] bg-[linear-gradient(160deg,rgba(10,24,41,0.92),rgba(20,24,54,0.92))] shadow-[0_22px_44px_rgba(4,11,24,0.26)]',
  linkList: 'grid gap-2',
  milestoneDelivered: 'bg-[rgba(107,243,255,0.14)] text-[#8defff]',
  milestoneDisputed: 'bg-[rgba(255,110,140,0.14)] text-[#ffafbf]',
  milestoneEditor:
    'grid gap-3 rounded-[1.25rem] border border-[var(--surface-border)] bg-[rgba(7,16,30,0.72)] p-4 backdrop-blur-xl',
  milestonePending: 'bg-[rgba(255,183,84,0.14)] text-[#ffd38e]',
  milestoneRefunded: 'bg-[rgba(255,110,140,0.14)] text-[#ffafbf]',
  milestoneReleased: 'bg-[rgba(46,227,181,0.14)] text-[#82f4d5]',
  secondaryButton:
    'inline-flex min-h-11 items-center justify-center rounded-full border border-[rgba(112,170,236,0.24)] bg-[rgba(7,17,31,0.68)] px-4 py-2.5 text-sm font-semibold tracking-[-0.01em] text-[var(--foreground)] shadow-[0_16px_30px_rgba(4,11,24,0.24)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[rgba(107,243,255,0.44)]',
  languageSwitcher:
    'inline-flex items-center gap-2 rounded-full bg-[rgba(7,17,31,0.68)] px-3 py-2 shadow-[inset_0_0_0_1px_rgba(112,170,236,0.18),0_16px_30px_rgba(4,11,24,0.24)] backdrop-blur-xl [&_[role=group]]:inline-flex [&_[role=group]]:gap-1.5',
  languageSwitcherLabel:
    'text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]',
  languageSwitcherOption:
    'min-h-10 rounded-full bg-transparent px-3.5 py-2.5 text-sm text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(112,170,236,0.15)]',
  languageSwitcherOptionActive:
    'bg-[linear-gradient(135deg,#6bf3ff,#8792ff,#c86dff)] text-[#04101d] shadow-[0_16px_34px_rgba(101,181,255,0.28)]',
} as const;

export default styles;
