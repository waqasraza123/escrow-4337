const styles = {
  page: 'min-h-screen',
  shell:
    'mx-auto grid w-[min(1280px,calc(100vw-40px))] gap-7 py-8 pb-24 max-md:w-[min(100vw-24px,1280px)] max-md:gap-5 max-md:pb-16',
  nav:
    'sticky top-4 z-20 flex flex-wrap items-center justify-between gap-4 rounded-full border border-[rgba(112,170,236,0.18)] bg-[rgba(6,15,28,0.72)] px-4 py-4 shadow-[0_20px_50px_rgba(2,8,19,0.34)] backdrop-blur-xl max-md:static max-md:items-stretch max-md:rounded-[1.5rem] max-md:p-3.5',
  brand:
    'text-[0.76rem] font-bold uppercase tracking-[0.22em] text-[#8defff]',
  navLinks:
    'inline-flex flex-wrap items-center gap-2.5 max-md:w-full [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:justify-center [&_a]:rounded-full [&_a]:border [&_a]:border-[rgba(112,170,236,0.16)] [&_a]:bg-[rgba(10,21,38,0.66)] [&_a]:px-4 [&_a]:py-2.5 [&_a]:font-semibold [&_a]:text-[var(--foreground)] [&_a]:shadow-[inset_0_1px_0_rgba(144,190,255,0.04)] [&_a]:backdrop-blur-xl [&_a]:transition [&_a]:duration-200 [&_a]:ease-out hover:[&_a]:-translate-y-0.5 hover:[&_a]:border-[rgba(107,243,255,0.38)] max-md:[&_a]:w-full max-md:[&_a]:flex-1',
  ctaRow: 'mt-6 flex flex-wrap items-center gap-3.5 max-md:w-full',
  proofGrid: 'grid gap-4 lg:grid-cols-3',
  objectionGrid: 'grid gap-4 lg:grid-cols-3',
  languageSwitcher:
    'inline-flex items-center gap-2 rounded-full bg-[rgba(7,17,31,0.68)] px-3 py-2 shadow-[inset_0_0_0_1px_rgba(112,170,236,0.18),0_16px_30px_rgba(4,11,24,0.24)] backdrop-blur-xl [&_[role=group]]:inline-flex [&_[role=group]]:gap-1.5',
  languageSwitcherLabel:
    'text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]',
  languageSwitcherOption:
    'min-h-10 rounded-full bg-transparent px-3.5 py-2.5 text-sm text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(112,170,236,0.15)]',
  languageSwitcherOptionActive:
    'bg-[linear-gradient(135deg,#6bf3ff,#8792ff,#c86dff)] text-[#04101d] shadow-[0_16px_34px_rgba(101,181,255,0.28)]',
  hero:
    'relative overflow-hidden rounded-[2rem] border border-[var(--surface-border-strong)] bg-[linear-gradient(145deg,rgba(9,21,38,0.96),rgba(4,10,19,0.98))] p-8 shadow-[var(--surface-shadow-strong)] before:absolute before:-right-20 before:top-[-6rem] before:h-52 before:w-52 before:rounded-full before:bg-[radial-gradient(circle,rgba(107,243,255,0.2),transparent_70%)] before:content-[\'\'] after:absolute after:bottom-[-8rem] after:left-[-5rem] after:h-72 after:w-72 after:rounded-full after:bg-[radial-gradient(circle,rgba(168,111,255,0.18),transparent_72%)] after:content-[\'\'] lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] max-md:rounded-[1.5rem] max-md:p-5.5 [&_h1]:mt-4 [&_h1]:max-w-[10ch] [&_h1]:text-[clamp(3.5rem,7vw,6.4rem)] [&_h1]:leading-[0.88] [&_h1]:text-[var(--foreground)] max-md:[&_h1]:max-w-none max-md:[&_h1]:text-[clamp(2.8rem,15vw,4.1rem)]',
  section:
    'relative overflow-hidden grid gap-5 rounded-[1.85rem] border border-[var(--surface-border)] bg-[rgba(7,16,30,0.76)] p-7 shadow-[var(--surface-shadow)] backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(107,243,255,0.72),transparent)] max-md:rounded-[1.5rem] max-md:p-5.5 [&_h2]:text-[clamp(1.85rem,3vw,2.5rem)] [&_h2]:leading-[1.01]',
  eyebrow:
    'text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#8defff]',
  panelEyebrow:
    'text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--foreground-muted)]',
  lead: 'mt-5 max-w-[58ch] text-[1.06rem] leading-7 text-[var(--foreground-soft)] max-md:text-[0.98rem]',
  ctaLink:
    'inline-flex min-h-[52px] items-center justify-center rounded-full border px-5.5 py-3.5 text-sm font-bold tracking-[-0.01em] transition duration-200 ease-out hover:-translate-y-0.5 max-md:w-full max-md:flex-1',
  ctaPrimary:
    'border-transparent bg-[linear-gradient(135deg,#6bf3ff,#8792ff,#c86dff)] text-[#04101d] shadow-[0_22px_48px_rgba(101,181,255,0.24)]',
  ctaSecondary:
    'border-[rgba(112,170,236,0.24)] bg-[rgba(7,17,31,0.68)] text-[var(--foreground)] shadow-[0_16px_30px_rgba(4,11,24,0.24)] backdrop-blur-xl hover:border-[rgba(107,243,255,0.44)]',
  ctaTertiary:
    'border-[rgba(112,170,236,0.18)] bg-[rgba(10,21,38,0.5)] text-[var(--foreground-soft)] hover:border-[rgba(107,243,255,0.34)] hover:text-[var(--foreground)]',
  secondaryLink:
    'inline-flex min-h-11 items-center justify-center rounded-full border border-[rgba(112,170,236,0.16)] bg-[rgba(10,21,38,0.54)] px-4 py-2.5 font-semibold text-[var(--foreground)] shadow-[0_12px_26px_rgba(4,11,24,0.18)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[rgba(107,243,255,0.38)] max-md:w-full',
  cardStack: 'grid gap-4 lg:pl-4',
  sectionBody: 'grid gap-4 text-[var(--foreground-soft)]',
  statCard:
    'rounded-[1.5rem] border border-[rgba(112,170,236,0.18)] bg-[linear-gradient(180deg,rgba(11,24,42,0.92),rgba(7,16,30,0.96))] p-5.5 shadow-[0_22px_48px_rgba(2,8,19,0.28)] backdrop-blur-xl [&_strong]:mb-2.5 [&_strong]:block [&_strong]:text-[1.08rem] [&_strong]:leading-6 [&_p]:leading-7 [&_p]:text-[var(--foreground-soft)]',
  proofCard:
    'rounded-[1.45rem] border border-[rgba(112,170,236,0.16)] bg-[rgba(7,16,30,0.74)] p-5.5 backdrop-blur-xl [&_strong]:mb-2.5 [&_strong]:block [&_strong]:text-[1.08rem] [&_strong]:leading-6 [&_p]:leading-7 [&_p]:text-[var(--foreground-soft)]',
  objectionCard:
    'rounded-[1.45rem] border border-[rgba(112,170,236,0.16)] bg-[rgba(7,16,30,0.74)] p-5.5 backdrop-blur-xl [&_strong]:mb-2.5 [&_strong]:block [&_strong]:text-[1.08rem] [&_strong]:leading-6 [&_p]:leading-7 [&_p]:text-[var(--foreground-soft)]',
  stepCard:
    'rounded-[1.45rem] border border-[rgba(112,170,236,0.16)] bg-[rgba(7,16,30,0.74)] p-5.5 backdrop-blur-xl [&_strong]:mb-2.5 [&_strong]:block [&_strong]:text-[1.08rem] [&_strong]:leading-6 [&_p]:leading-7 [&_p]:text-[var(--foreground-soft)] [&_span:first-child]:mb-3 [&_span:first-child]:inline-flex [&_span:first-child]:rounded-full [&_span:first-child]:border [&_span:first-child]:border-[rgba(107,243,255,0.28)] [&_span:first-child]:bg-[rgba(107,243,255,0.12)] [&_span:first-child]:px-3 [&_span:first-child]:py-1.5 [&_span:first-child]:text-[0.74rem] [&_span:first-child]:font-bold [&_span:first-child]:tracking-[0.1em] [&_span:first-child]:text-[#8defff]',
  steps: 'grid gap-4 lg:grid-cols-3',
  cardLink:
    'mt-3.5 inline-flex w-fit items-center justify-center rounded-full border border-[rgba(112,170,236,0.18)] bg-[rgba(10,21,38,0.62)] px-4 py-2.5 font-semibold text-[var(--foreground)] shadow-[0_12px_24px_rgba(4,11,24,0.18)] backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[rgba(107,243,255,0.38)] max-md:w-full',
  list: 'grid gap-3 ps-5 marker:text-[#8defff]',
  heroSignalGrid: 'mt-7 grid gap-3 sm:grid-cols-3',
  heroSignal:
    'rounded-[1.15rem] border border-[rgba(112,170,236,0.14)] bg-[rgba(7,17,31,0.56)] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(144,190,255,0.05)] backdrop-blur-xl',
  heroSignalLabel:
    'block text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)]',
  heroSignalValue:
    'mt-2 block text-[1.15rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]',
  splitSection: 'grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]',
  railCard:
    'rounded-[1.45rem] border border-[rgba(112,170,236,0.16)] bg-[rgba(7,16,30,0.74)] p-5 shadow-[var(--surface-shadow)] backdrop-blur-xl',
  railList: 'grid gap-3',
  railItem:
    'rounded-[1rem] border border-[rgba(112,170,236,0.12)] bg-[rgba(10,21,38,0.5)] px-4 py-3 text-sm leading-6 text-[var(--foreground-soft)]',
} as const;

export default styles;
