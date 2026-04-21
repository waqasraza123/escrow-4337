const styles = {
  page: 'min-h-screen',
  shell:
    'mx-auto grid w-[min(1280px,calc(100vw-40px))] gap-7 py-8 pb-24 max-md:w-[min(100vw-24px,1280px)] max-md:gap-5 max-md:pb-16',
  nav:
    'sticky top-4 z-20 flex flex-wrap items-center justify-between gap-4 rounded-full border border-[var(--surface-border)] bg-[var(--panel-bg)] px-4 py-4 shadow-[var(--surface-shadow)] backdrop-blur-xl max-md:static max-md:items-stretch max-md:rounded-[1.5rem] max-md:p-3.5',
  brand:
    'text-[0.76rem] font-bold uppercase tracking-[0.22em] text-[var(--accent-eyebrow)]',
  navLinks:
    'inline-flex flex-wrap items-center gap-2.5 max-md:w-full [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:justify-center [&_a]:rounded-full [&_a]:border [&_a]:border-[var(--interactive-border)] [&_a]:bg-[var(--interactive-bg)] [&_a]:px-4 [&_a]:py-2.5 [&_a]:font-semibold [&_a]:text-[var(--foreground)] [&_a]:shadow-[var(--interactive-shadow)] [&_a]:backdrop-blur-xl [&_a]:transition [&_a]:duration-200 [&_a]:ease-out hover:[&_a]:-translate-y-0.5 hover:[&_a]:border-[var(--interactive-hover-border)] max-md:[&_a]:w-full max-md:[&_a]:flex-1',
  controlCluster: 'inline-flex flex-wrap items-center gap-2.5 max-md:w-full',
  ctaRow: 'mt-6 flex flex-wrap items-center gap-3.5 max-md:w-full',
  proofGrid: 'grid gap-4 lg:grid-cols-3',
  objectionGrid: 'grid gap-4 lg:grid-cols-3',
  languageSwitcher:
    'inline-flex items-center gap-2 rounded-full bg-[var(--theme-switcher-bg)] px-3 py-2 shadow-[var(--theme-switcher-shadow)] backdrop-blur-xl [&_[role=group]]:inline-flex [&_[role=group]]:gap-1.5 max-md:flex-1 max-md:justify-between',
  languageSwitcherLabel:
    'text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]',
  languageSwitcherOption:
    'min-h-10 rounded-full bg-transparent px-3.5 py-2.5 text-sm text-[var(--foreground)] shadow-[var(--theme-switcher-option-shadow)]',
  languageSwitcherOptionActive:
    'bg-[image:var(--theme-switcher-option-active-bg)] text-[var(--theme-switcher-option-active-fg)] shadow-[var(--theme-switcher-option-active-shadow)]',
  hero:
    'relative overflow-hidden rounded-[2rem] border border-[var(--surface-border-strong)] bg-[image:var(--hero-bg)] p-8 shadow-[var(--surface-shadow-strong)] before:absolute before:-right-20 before:top-[-6rem] before:h-52 before:w-52 before:rounded-full before:bg-[image:var(--hero-orb-primary)] before:content-[\'\'] after:absolute after:bottom-[-8rem] after:left-[-5rem] after:h-72 after:w-72 after:rounded-full after:bg-[image:var(--hero-orb-secondary)] after:content-[\'\'] lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] max-md:rounded-[1.5rem] max-md:p-5.5 [&_h1]:mt-4 [&_h1]:max-w-[10ch] [&_h1]:text-[clamp(3.5rem,7vw,6.4rem)] [&_h1]:leading-[0.88] [&_h1]:text-[var(--foreground)] max-md:[&_h1]:max-w-none max-md:[&_h1]:text-[clamp(2.8rem,15vw,4.1rem)]',
  section:
    'relative overflow-hidden grid gap-5 rounded-[1.85rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-7 shadow-[var(--surface-shadow)] backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[image:var(--panel-top-border)] max-md:rounded-[1.5rem] max-md:p-5.5 [&_h2]:text-[clamp(1.85rem,3vw,2.5rem)] [&_h2]:leading-[1.01]',
  eyebrow:
    'text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[var(--accent-eyebrow)]',
  panelEyebrow:
    'text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--accent-eyebrow-soft)]',
  lead: 'mt-5 max-w-[58ch] text-[1.06rem] leading-7 text-[var(--foreground-soft)] max-md:text-[0.98rem]',
  ctaLink:
    'inline-flex min-h-[52px] items-center justify-center rounded-full border px-5.5 py-3.5 text-sm font-bold tracking-[-0.01em] transition duration-200 ease-out hover:-translate-y-0.5 max-md:w-full max-md:flex-1',
  ctaPrimary:
    'border-transparent bg-[image:var(--accent-gradient)] text-[var(--accent-strong-fg)] shadow-[var(--button-primary-shadow)]',
  ctaSecondary:
    'border-[var(--button-secondary-border)] bg-[var(--button-secondary-bg)] text-[var(--foreground)] shadow-[var(--button-secondary-shadow)] backdrop-blur-xl hover:border-[var(--button-secondary-border-strong)]',
  ctaTertiary:
    'border-[var(--interactive-border)] bg-[var(--interactive-bg)] text-[var(--foreground-soft)] hover:border-[var(--interactive-hover-border)] hover:text-[var(--foreground)]',
  secondaryLink:
    'inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--interactive-border)] bg-[var(--interactive-bg)] px-4 py-2.5 font-semibold text-[var(--foreground)] shadow-[var(--interactive-shadow)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--interactive-hover-border)] max-md:w-full',
  cardStack: 'grid gap-4 lg:pl-4',
  sectionBody: 'grid gap-4 text-[var(--foreground-soft)]',
  statCard:
    'rounded-[1.5rem] border border-[var(--surface-border)] bg-[image:var(--card-strong-bg)] p-5.5 shadow-[var(--surface-shadow)] backdrop-blur-xl [&_strong]:mb-2.5 [&_strong]:block [&_strong]:text-[1.08rem] [&_strong]:leading-6 [&_p]:leading-7 [&_p]:text-[var(--foreground-soft)]',
  proofCard:
    'rounded-[1.45rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-5.5 backdrop-blur-xl [&_strong]:mb-2.5 [&_strong]:block [&_strong]:text-[1.08rem] [&_strong]:leading-6 [&_p]:leading-7 [&_p]:text-[var(--foreground-soft)]',
  objectionCard:
    'rounded-[1.45rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-5.5 backdrop-blur-xl [&_strong]:mb-2.5 [&_strong]:block [&_strong]:text-[1.08rem] [&_strong]:leading-6 [&_p]:leading-7 [&_p]:text-[var(--foreground-soft)]',
  stepCard:
    'rounded-[1.45rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-5.5 backdrop-blur-xl [&_strong]:mb-2.5 [&_strong]:block [&_strong]:text-[1.08rem] [&_strong]:leading-6 [&_p]:leading-7 [&_p]:text-[var(--foreground-soft)] [&_span:first-child]:mb-3 [&_span:first-child]:inline-flex [&_span:first-child]:rounded-full [&_span:first-child]:border [&_span:first-child]:border-[var(--status-info-border)] [&_span:first-child]:bg-[var(--status-info-bg)] [&_span:first-child]:px-3 [&_span:first-child]:py-1.5 [&_span:first-child]:text-[0.74rem] [&_span:first-child]:font-bold [&_span:first-child]:tracking-[0.1em] [&_span:first-child]:text-[var(--status-info-fg)]',
  steps: 'grid gap-4 lg:grid-cols-3',
  cardLink:
    'mt-3.5 inline-flex w-fit items-center justify-center rounded-full border border-[var(--interactive-border)] bg-[var(--interactive-bg)] px-4 py-2.5 font-semibold text-[var(--foreground)] shadow-[var(--interactive-shadow)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--interactive-hover-border)] max-md:w-full',
  list: 'grid gap-3 ps-5 marker:text-[var(--accent-eyebrow)]',
  heroSignalGrid: 'mt-7 grid gap-3 sm:grid-cols-3',
  heroSignal:
    'rounded-[1.15rem] border border-[var(--surface-border)] bg-[var(--surface-soft)] px-4 py-3.5 shadow-[var(--interactive-shadow)] backdrop-blur-xl',
  heroSignalLabel:
    'block text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]',
  heroSignalValue:
    'mt-2 block text-[1.15rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]',
  splitSection: 'grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]',
  railCard:
    'rounded-[1.45rem] border border-[var(--surface-border)] bg-[var(--panel-bg)] p-5 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  railList: 'grid gap-3',
  railItem:
    'rounded-[1rem] border border-[var(--interactive-border)] bg-[var(--interactive-bg)] px-4 py-3 text-sm leading-6 text-[var(--foreground-soft)]',
  filterGrid: 'grid gap-3 md:grid-cols-2 xl:grid-cols-3',
  field:
    'grid gap-2 [&_span]:text-[0.74rem] [&_span]:font-bold [&_span]:uppercase [&_span]:tracking-[0.12em] [&_span]:text-[var(--foreground-muted)] [&_input]:min-h-11 [&_input]:rounded-[1rem] [&_input]:border [&_input]:border-[var(--interactive-border)] [&_input]:bg-[var(--interactive-bg)] [&_input]:px-4 [&_input]:py-2.5 [&_input]:text-[var(--foreground)] [&_select]:min-h-11 [&_select]:rounded-[1rem] [&_select]:border [&_select]:border-[var(--interactive-border)] [&_select]:bg-[var(--interactive-bg)] [&_select]:px-4 [&_select]:py-2.5 [&_select]:text-[var(--foreground)]',
  inlineActions: 'flex flex-wrap items-center gap-3',
  chipRow: 'flex flex-wrap gap-2',
  chip:
    'inline-flex items-center rounded-full border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-3 py-1.5 text-[0.78rem] font-semibold text-[var(--status-info-fg)]',
} as const;

export default styles;
