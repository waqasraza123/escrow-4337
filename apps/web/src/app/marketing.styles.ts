const styles = {
  page: 'min-h-screen',
  shell:
    'mx-auto grid w-[min(1280px,calc(100vw-40px))] gap-7 py-8 pb-24 max-md:w-[min(100vw-24px,1280px)] max-md:gap-5 max-md:pb-16',
  nav:
    'sticky top-4 z-20 flex flex-wrap items-center justify-between gap-4 rounded-full border border-[var(--surface-border)] bg-[rgba(255,255,255,0.88)] px-4 py-4 shadow-[var(--surface-shadow)] backdrop-blur-xl max-md:static max-md:items-stretch max-md:rounded-[1.5rem] max-md:p-3.5 dark:bg-[rgba(7,14,23,0.82)]',
  brand:
    'text-[0.76rem] font-bold uppercase tracking-[0.22em] text-[var(--accent-eyebrow)]',
  navLinks:
    'inline-flex flex-wrap items-center gap-2.5 max-md:w-full [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:justify-center [&_a]:rounded-full [&_a]:border [&_a]:border-[var(--interactive-border)] [&_a]:bg-[var(--interactive-bg)] [&_a]:px-4 [&_a]:py-2.5 [&_a]:font-semibold [&_a]:text-[var(--foreground)] [&_a]:shadow-[var(--interactive-shadow)] [&_a]:backdrop-blur-xl [&_a]:transition [&_a]:duration-200 [&_a]:ease-out hover:[&_a]:-translate-y-0.5 hover:[&_a]:border-[var(--interactive-hover-border)] max-md:[&_a]:w-full max-md:[&_a]:flex-1',
  controlCluster: 'inline-flex flex-wrap items-center gap-2.5 max-md:w-full',
  languageSwitcher:
    'inline-flex items-center gap-2 rounded-full bg-[var(--theme-switcher-bg)] px-3 py-2 shadow-[var(--theme-switcher-shadow)] backdrop-blur-xl [&_[role=group]]:inline-flex [&_[role=group]]:gap-1.5 max-md:flex-1 max-md:justify-between',
  languageSwitcherLabel:
    'text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]',
  languageSwitcherOption:
    'min-h-10 rounded-full bg-transparent px-3.5 py-2.5 text-sm text-[var(--foreground)] shadow-[var(--theme-switcher-option-shadow)]',
  languageSwitcherOptionActive:
    'bg-[image:var(--theme-switcher-option-active-bg)] text-[var(--theme-switcher-option-active-fg)] shadow-[var(--theme-switcher-option-active-shadow)]',

  hero:
    'relative grid gap-6 overflow-hidden rounded-[2rem] border border-[rgba(24,108,62,0.28)] bg-[linear-gradient(145deg,#08161d_0%,#0b1f24_38%,#10311d_100%)] p-7 shadow-[0_36px_100px_rgba(10,32,22,0.28)] lg:grid-cols-[minmax(0,1.04fr)_minmax(360px,0.96fr)] max-md:rounded-[1.5rem] max-md:p-5.5 before:absolute before:inset-y-0 before:right-[-10%] before:w-[48%] before:bg-[radial-gradient(circle,rgba(62,176,110,0.18),transparent_68%)] before:content-[\'\'] after:absolute after:left-[-8%] after:top-[-20%] after:h-56 after:w-56 after:rounded-full after:bg-[radial-gradient(circle,rgba(112,227,162,0.14),transparent_72%)] after:content-[\'\']',
  heroContent: 'relative z-10 grid content-start gap-5 self-center',
  eyebrow:
    'text-[0.74rem] font-bold uppercase tracking-[0.22em] text-[rgba(138,240,184,0.92)]',
  heroTitle:
    'max-w-[11ch] text-[clamp(2.7rem,5vw,4.9rem)] font-semibold leading-[0.94] tracking-[-0.045em] text-[rgba(247,255,250,0.98)]',
  heroHeadingTitleTone:
    'font-semibold tracking-[-0.045em] text-[rgba(247,255,250,0.98)]',
  heroHeadingDescription:
    'text-[1.04rem] leading-7 text-[rgba(222,236,228,0.92)] max-md:text-[1rem]',
  lead:
    'max-w-[56ch] text-[1.06rem] leading-7 text-[rgba(222,236,228,0.92)] max-md:text-[1rem]',
  ctaRow: 'flex flex-wrap items-center gap-3 max-md:w-full',
  ctaLink:
    'inline-flex min-h-[52px] items-center justify-center rounded-full border px-5.5 py-3.5 text-sm font-bold tracking-[-0.01em] transition duration-200 ease-out hover:-translate-y-0.5 max-md:w-full max-md:flex-1',
  ctaPrimary:
    'border-transparent bg-[image:var(--accent-gradient)] text-[var(--accent-strong-fg)] shadow-[var(--button-primary-shadow)]',
  ctaSecondary:
    'border-[rgba(255,255,255,0.16)] bg-[rgba(247,252,248,0.95)] text-[#173423] shadow-[0_18px_38px_rgba(6,18,12,0.18)] backdrop-blur-xl hover:border-[rgba(255,255,255,0.28)]',
  ctaTertiary:
    'border-[rgba(171,220,191,0.18)] bg-[rgba(255,255,255,0.06)] text-[rgba(238,247,242,0.96)] hover:border-[rgba(171,220,191,0.34)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white',
  heroBadgeRow: 'flex flex-wrap items-center gap-2.5',
  heroBadge:
    'inline-flex items-center rounded-full border border-[rgba(46,161,91,0.18)] bg-[rgba(255,255,255,0.76)] px-3.5 py-2 text-[0.74rem] font-semibold text-[var(--foreground)] shadow-[var(--interactive-shadow)] backdrop-blur-xl dark:bg-[rgba(7,15,24,0.72)]',
  heroIllustrationShell:
    'grid gap-4 rounded-[1.7rem] border border-[var(--surface-border)] bg-[rgba(255,255,255,0.82)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl dark:bg-[rgba(10,19,28,0.82)]',
  heroIllustrationMeta: 'grid gap-3 sm:grid-cols-2',
  heroIllustrationCard:
    'rounded-[1.2rem] border border-[var(--surface-border)] bg-[var(--surface-soft)] px-4 py-3 text-sm leading-6 text-[var(--foreground-soft)]',
  heroIllustrationLabel:
    'mb-1 block text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]',

  section:
    'relative grid gap-5 rounded-[1.85rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-7 shadow-[var(--surface-shadow)] backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[image:var(--panel-top-border)] max-md:rounded-[1.5rem] max-md:p-5.5 [&_h2]:text-[clamp(1.8rem,3vw,2.45rem)] [&_h2]:leading-[1.01]',
  sectionBody: 'grid gap-4 text-[var(--foreground-soft)]',
  splitSection: 'grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)]',
  proofGrid: 'grid gap-4 lg:grid-cols-3',
  objectionGrid: 'grid gap-4 lg:grid-cols-3',
  laneGrid: 'grid gap-4 lg:grid-cols-3',
  laneCard:
    'grid gap-4 rounded-[1.55rem] border border-[var(--surface-border)] bg-[var(--surface-card)] p-5 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  laneHeader: 'flex items-start gap-3.5',
  laneMeta: 'grid gap-1.5',
  laneTitle: 'text-[1.02rem] font-semibold leading-6 text-[var(--foreground)]',
  laneBody: 'text-sm leading-6 text-[var(--foreground-soft)]',

  flowSection: 'grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]',
  steps: 'grid gap-4',
  stepCard:
    'rounded-[1.45rem] border border-[var(--surface-border)] bg-[var(--surface-card)] p-5 backdrop-blur-xl shadow-[var(--surface-shadow)] [&_strong]:mb-2 [&_strong]:block [&_strong]:text-[1.04rem] [&_strong]:leading-6 [&_p]:leading-6.5 [&_p]:text-[var(--foreground-soft)] [&_span:first-child]:mb-3 [&_span:first-child]:inline-flex [&_span:first-child]:rounded-full [&_span:first-child]:border [&_span:first-child]:border-[var(--status-info-border)] [&_span:first-child]:bg-[var(--status-info-bg)] [&_span:first-child]:px-3 [&_span:first-child]:py-1.5 [&_span:first-child]:text-[0.74rem] [&_span:first-child]:font-bold [&_span:first-child]:tracking-[0.1em] [&_span:first-child]:text-[var(--status-info-fg)]',
  flowVisualCard:
    'grid gap-4 rounded-[1.55rem] border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  flowProofStrip: 'grid gap-3',
  proofStrip: 'grid gap-4 md:grid-cols-3',
  proofPill:
    'rounded-[1.25rem] border border-[var(--surface-border)] bg-[var(--surface-soft)] px-4 py-4 shadow-[var(--interactive-shadow)]',
  proofPillTitle:
    'mb-1 block text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]',
  proofPillBody: 'text-sm leading-6 text-[var(--foreground)]',

  panelEyebrow:
    'text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--accent-eyebrow-soft)]',
  cardStack: 'grid gap-4',
  statCard:
    'rounded-[1.5rem] border border-[var(--surface-border)] bg-[image:var(--card-strong-bg)] p-5.5 shadow-[var(--surface-shadow)] backdrop-blur-xl [&_strong]:mb-2.5 [&_strong]:block [&_strong]:text-[1.08rem] [&_strong]:leading-6 [&_p]:leading-7 [&_p]:text-[var(--foreground-soft)]',
  proofCard:
    'rounded-[1.45rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-5.5 backdrop-blur-xl [&_strong]:mb-2.5 [&_strong]:block [&_strong]:text-[1.08rem] [&_strong]:leading-6 [&_p]:leading-7 [&_p]:text-[var(--foreground-soft)]',
  objectionCard:
    'rounded-[1.45rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-5.5 backdrop-blur-xl [&_strong]:mb-2.5 [&_strong]:block [&_strong]:text-[1.08rem] [&_strong]:leading-6 [&_p]:leading-7 [&_p]:text-[var(--foreground-soft)]',
  cardLink:
    'mt-3 inline-flex w-fit items-center justify-center rounded-full border border-[var(--interactive-border)] bg-[var(--interactive-bg)] px-4 py-2.5 font-semibold text-[var(--foreground)] shadow-[var(--interactive-shadow)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--interactive-hover-border)] max-md:w-full',
  secondaryLink:
    'inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--interactive-border)] bg-[var(--interactive-bg)] px-4 py-2.5 font-semibold text-[var(--foreground)] shadow-[var(--interactive-shadow)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--interactive-hover-border)] max-md:w-full',
  list: 'grid gap-3 ps-5 marker:text-[var(--accent-eyebrow)]',
  railCard:
    'rounded-[1.45rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-5 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  railList: 'grid gap-3',
  railItem:
    'rounded-[1rem] border border-[var(--interactive-border)] bg-[var(--interactive-bg)] px-4 py-3 text-sm leading-6 text-[var(--foreground-soft)]',

  searchHero:
    'grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]',
  searchHeroShell:
    'relative z-10 grid gap-4 rounded-[1.7rem] border border-[rgba(171,220,191,0.14)] bg-[rgba(4,18,15,0.34)] p-5 shadow-[0_24px_58px_rgba(3,14,10,0.28)] backdrop-blur-xl',
  searchHeroBadges: 'flex flex-wrap gap-2.5',
  searchHeroBadge:
    'inline-flex items-center rounded-full border border-[rgba(171,220,191,0.18)] bg-[rgba(255,255,255,0.05)] px-3.5 py-1.5 text-[0.74rem] font-semibold text-[rgba(233,244,237,0.95)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  statStrip: 'grid gap-3 md:grid-cols-3',
  statPill:
    'rounded-[1.25rem] border border-[rgba(219,235,225,0.82)] bg-[rgba(248,252,249,0.96)] px-4 py-3.5 shadow-[0_16px_32px_rgba(8,21,15,0.16)]',
  statPillLabel:
    'block text-[0.68rem] font-bold uppercase tracking-[0.15em] text-[#5a7a67]',
  statPillValue:
    'mt-2 block text-[0.98rem] font-semibold leading-6 text-[#143120]',

  directoryShell: 'grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]',
  directoryRail:
    'grid content-start gap-4 rounded-[1.5rem] border border-[var(--surface-border)] bg-[var(--surface-card)] p-5 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  directoryMain: 'grid gap-4',
  directoryTopBar:
    'flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  directoryTabs: 'flex flex-wrap items-center gap-2',
  tabPill:
    'inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--interactive-border)] bg-[var(--interactive-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-[var(--interactive-shadow)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--interactive-hover-border)]',
  tabPillActive:
    'border-transparent bg-[image:var(--accent-gradient)] text-[var(--accent-strong-fg)] shadow-[var(--button-primary-shadow)]',
  filterGrid: 'grid gap-3',
  field:
    'grid gap-2 [&_span]:text-[0.72rem] [&_span]:font-bold [&_span]:uppercase [&_span]:tracking-[0.12em] [&_span]:text-[var(--foreground-muted)] [&_input]:min-h-11 [&_input]:rounded-[1rem] [&_input]:border [&_input]:border-[var(--interactive-border)] [&_input]:bg-[var(--interactive-bg)] [&_input]:px-4 [&_input]:py-2.5 [&_input]:text-[var(--foreground)] [&_select]:min-h-11 [&_select]:rounded-[1rem] [&_select]:border [&_select]:border-[var(--interactive-border)] [&_select]:bg-[var(--interactive-bg)] [&_select]:px-4 [&_select]:py-2.5 [&_select]:text-[var(--foreground)]',
  inlineActions: 'flex flex-wrap items-center gap-3',
  resultGrid: 'grid gap-4 md:grid-cols-2 xl:grid-cols-3',
  resultCard:
    'grid gap-4 rounded-[1.5rem] border border-[var(--surface-border)] bg-[var(--surface-card)] p-5 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  resultHeader: 'flex items-start gap-3.5',
  resultGlyphWrap:
    'inline-flex h-14 w-14 items-center justify-center rounded-[1.2rem] border border-[var(--surface-border)] bg-[var(--surface-soft)]',
  resultHeaderCopy: 'grid gap-1.5',
  resultKicker:
    'text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]',
  resultTitle: 'text-[1rem] font-semibold leading-6 text-[var(--foreground)]',
  resultSummary: 'text-sm leading-6 text-[var(--foreground-soft)]',
  resultFactRow: 'flex flex-wrap gap-2',
  chipRow: 'flex flex-wrap gap-2',
  chip:
    'inline-flex items-center rounded-full border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-3 py-1.5 text-[0.78rem] font-semibold text-[var(--status-info-fg)]',
  resultMetaChip:
    'inline-flex items-center rounded-full border border-[var(--surface-border)] bg-[var(--surface-soft)] px-3 py-1.5 text-[0.74rem] font-semibold text-[var(--foreground)]',
  mutedNote: 'text-sm leading-6 text-[var(--foreground-soft)]',

  heroSignalGrid: 'mt-7 grid gap-3 sm:grid-cols-3',
  heroSignal:
    'rounded-[1.15rem] border border-[var(--surface-border)] bg-[var(--surface-soft)] px-4 py-3.5 shadow-[var(--interactive-shadow)] backdrop-blur-xl',
  heroSignalLabel:
    'block text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]',
  heroSignalValue:
    'mt-2 block text-[1.15rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]',
} as const;

export default styles;
