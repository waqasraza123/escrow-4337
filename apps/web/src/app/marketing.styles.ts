const styles = {
  page: 'min-h-screen',
  shell: 'mx-auto grid w-[min(1240px,calc(100vw-40px))] gap-7 py-7 pb-22 max-md:w-[min(100vw-24px,1240px)] max-md:gap-5 max-md:pb-13',
  nav:
    'sticky top-4 z-20 flex flex-wrap items-center justify-between gap-4 rounded-full border border-[rgba(92,67,46,0.12)] bg-[rgba(255,251,245,0.82)] px-4 py-4 backdrop-blur-xl shadow-[var(--surface-shadow)] max-md:static max-md:items-stretch max-md:rounded-[1.5rem] max-md:p-3.5',
  brand:
    'text-[0.78rem] font-bold uppercase tracking-[0.14em] text-[var(--foreground-soft)]',
  navLinks:
    'inline-flex flex-wrap items-center gap-2.5 max-md:w-full [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:justify-center [&_a]:rounded-full [&_a]:border [&_a]:border-[rgba(92,67,46,0.12)] [&_a]:bg-white/75 [&_a]:px-4 [&_a]:py-2.5 [&_a]:font-semibold [&_a]:text-[var(--foreground)] [&_a]:transition [&_a]:duration-200 hover:[&_a]:border-[rgba(92,67,46,0.2)] max-md:[&_a]:w-full max-md:[&_a]:flex-1',
  ctaRow: 'mt-5 flex flex-wrap items-center gap-3.5 max-md:w-full',
  proofGrid: 'flex flex-wrap gap-3.5 max-lg:flex-col',
  objectionGrid: 'flex flex-wrap gap-3.5 max-lg:flex-col',
  languageSwitcher:
    'inline-flex items-center gap-2 rounded-full bg-white/92 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(92,67,46,0.1)] [&_[role=group]]:inline-flex [&_[role=group]]:gap-1.5',
  languageSwitcherLabel:
    'text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]',
  languageSwitcherOption:
    'min-h-10 rounded-full bg-transparent px-3.5 py-2.5 text-sm text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(92,67,46,0.08)]',
  languageSwitcherOptionActive:
    'bg-[linear-gradient(135deg,#2d1a11,#5d3620)] text-[#fffaf6] shadow-[0_10px_18px_rgba(48,29,17,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]',
  hero:
    'grid gap-7 rounded-[1.9rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,249,242,0.96))] p-10 shadow-[var(--surface-shadow-strong)] lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] max-md:rounded-[1.5rem] max-md:p-5.5 [&_h1]:mt-3.5 [&_h1]:max-w-[9.2ch] [&_h1]:text-[clamp(3.2rem,7vw,6rem)] [&_h1]:leading-[0.9] [&_h1]:text-[var(--foreground)] max-md:[&_h1]:max-w-none max-md:[&_h1]:text-[clamp(2.5rem,15vw,3.8rem)]',
  section:
    'grid gap-4.5 rounded-[1.9rem] border border-[var(--surface-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,249,242,0.96))] p-7.5 shadow-[var(--surface-shadow-strong)] max-md:rounded-[1.5rem] max-md:p-5.5 [&_h2]:text-[clamp(1.7rem,3vw,2.3rem)] [&_h2]:leading-[1.05]',
  eyebrow:
    'text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]',
  panelEyebrow:
    'text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]',
  lead: 'mt-4 max-w-[58ch] text-[1.06rem] leading-7 text-[var(--foreground-soft)] max-md:text-[0.98rem]',
  ctaLink:
    'inline-flex min-h-[52px] items-center justify-center rounded-full border px-5.5 py-3.5 text-sm font-bold tracking-[-0.01em] transition duration-200 hover:-translate-y-0.5 max-md:w-full max-md:flex-1',
  ctaPrimary:
    'border-transparent bg-[linear-gradient(135deg,#2d1a11,#5d3620)] text-[#fffaf6] shadow-[0_18px_30px_rgba(48,29,17,0.16)] hover:bg-[linear-gradient(135deg,#27170f,#4c2d1d)]',
  ctaSecondary:
    'border-[rgba(92,67,46,0.14)] bg-[rgba(247,239,230,0.94)] text-[var(--foreground)] shadow-[0_12px_24px_rgba(48,29,17,0.08)] hover:border-[rgba(92,67,46,0.2)] hover:bg-[rgba(255,247,238,0.98)]',
  ctaTertiary:
    'border-[rgba(92,67,46,0.12)] bg-white/92 text-[var(--foreground)] hover:border-[rgba(92,67,46,0.18)] hover:bg-white/98 hover:shadow-[0_10px_18px_rgba(47,31,18,0.06)]',
  secondaryLink:
    'inline-flex min-h-11 items-center justify-center rounded-full border border-[rgba(92,67,46,0.12)] bg-white/88 px-4 py-2.5 font-semibold text-[var(--foreground)] transition duration-200 hover:border-[rgba(92,67,46,0.2)] hover:bg-white/92 max-md:w-full',
  cardStack: 'grid gap-4',
  sectionBody: 'grid gap-4',
  statCard:
    'relative rounded-[1.4rem] border border-[var(--surface-border)] bg-white/90 p-5.5 shadow-[var(--surface-shadow)] before:absolute before:left-0 before:top-0 before:h-[3px] before:w-full before:rounded-full before:bg-[linear-gradient(90deg,rgba(126,80,43,0.35),rgba(126,80,43,0))] [&_strong]:mb-2.5 [&_strong]:block [&_strong]:text-[1.1rem] [&_strong]:leading-6 [&_p]:leading-7 [&_p]:text-[var(--foreground-soft)] max-md:rounded-[1.25rem] max-md:p-4.5',
  proofCard:
    'relative rounded-[1.4rem] border border-[var(--surface-border)] bg-white/90 p-5.5 shadow-[var(--surface-shadow)] before:absolute before:left-0 before:top-0 before:h-[3px] before:w-full before:rounded-full before:bg-[linear-gradient(90deg,rgba(126,80,43,0.35),rgba(126,80,43,0))] [&_strong]:mb-2.5 [&_strong]:block [&_strong]:text-[1.1rem] [&_strong]:leading-6 [&_p]:leading-7 [&_p]:text-[var(--foreground-soft)] max-md:rounded-[1.25rem] max-md:p-4.5',
  objectionCard:
    'relative rounded-[1.4rem] border border-[var(--surface-border)] bg-white/90 p-5.5 shadow-[var(--surface-shadow)] before:absolute before:left-0 before:top-0 before:h-[3px] before:w-full before:rounded-full before:bg-[linear-gradient(90deg,rgba(126,80,43,0.35),rgba(126,80,43,0))] [&_strong]:mb-2.5 [&_strong]:block [&_strong]:text-[1.1rem] [&_strong]:leading-6 [&_p]:leading-7 [&_p]:text-[var(--foreground-soft)] max-md:rounded-[1.25rem] max-md:p-4.5',
  stepCard:
    'relative rounded-[1.4rem] border border-[var(--surface-border)] bg-white/90 p-5.5 shadow-[var(--surface-shadow)] before:absolute before:left-0 before:top-0 before:h-[3px] before:w-full before:rounded-full before:bg-[linear-gradient(90deg,rgba(126,80,43,0.35),rgba(126,80,43,0))] [&_strong]:mb-2.5 [&_strong]:block [&_strong]:text-[1.1rem] [&_strong]:leading-6 [&_p]:leading-7 [&_p]:text-[var(--foreground-soft)] [&_span:first-child]:mb-3 [&_span:first-child]:inline-flex [&_span:first-child]:rounded-full [&_span:first-child]:bg-[rgba(243,227,210,0.92)] [&_span:first-child]:px-3 [&_span:first-child]:py-1.5 [&_span:first-child]:text-[0.74rem] [&_span:first-child]:font-bold [&_span:first-child]:tracking-[0.1em] [&_span:first-child]:text-[#7a4b2d] max-md:rounded-[1.25rem] max-md:p-4.5',
  steps: 'grid gap-4 lg:grid-cols-3',
  cardLink:
    'mt-3.5 inline-flex w-fit items-center justify-center rounded-full border border-[rgba(92,67,46,0.12)] bg-[rgba(250,244,236,0.96)] px-4 py-2.5 font-semibold text-[var(--foreground)] transition duration-200 hover:border-[rgba(92,67,46,0.2)] hover:bg-white/92 max-md:w-full',
  list: 'grid gap-3 ps-5',
} as const;

export default styles;
