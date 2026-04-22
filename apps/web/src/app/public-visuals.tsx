'use client';

import type { HTMLAttributes } from 'react';

type GlyphKind = 'engineering' | 'design' | 'growth';

function Frame(props: HTMLAttributes<HTMLDivElement>) {
  const { className = '', children, ...rest } = props;
  return (
    <div className={`relative overflow-hidden ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function PublicSceneFrame(
  props: HTMLAttributes<HTMLDivElement> & { accent?: 'market' | 'trust' },
) {
  const { className = '', accent = 'market', children, ...rest } = props;
  return (
    <Frame
      className={`rounded-[1.7rem] border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-[var(--surface-shadow-strong)] ${
        accent === 'market'
          ? 'before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(46,161,91,0.6),transparent)]'
          : 'before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(15,108,74,0.55),transparent)]'
      } ${className}`}
      {...rest}
    >
      {children}
    </Frame>
  );
}

export function MarketplaceHeroScene() {
  return (
    <svg
      aria-hidden="true"
      data-testid="marketplace-hero-scene"
      viewBox="0 0 560 420"
      className="h-full w-full"
      fill="none"
    >
      <rect width="560" height="420" rx="32" fill="url(#hero-bg)" />
      <circle cx="102" cy="88" r="74" fill="url(#hero-orb-left)" />
      <circle cx="456" cy="330" r="108" fill="url(#hero-orb-right)" />

      <rect x="44" y="54" width="214" height="138" rx="24" fill="#F8FCF9" />
      <rect x="44" y="54" width="214" height="138" rx="24" stroke="#D7E7DA" />
      <rect x="68" y="80" width="94" height="14" rx="7" fill="#0F3D26" opacity="0.16" />
      <rect x="68" y="106" width="146" height="18" rx="9" fill="#0F3D26" />
      <rect x="68" y="136" width="122" height="12" rx="6" fill="#6A8B74" opacity="0.5" />
      <rect x="68" y="166" width="84" height="28" rx="14" fill="#2EA15B" />
      <rect x="162" y="166" width="66" height="28" rx="14" fill="#E6F5EA" />

      <rect x="278" y="38" width="238" height="190" rx="28" fill="#0D2217" />
      <rect x="278" y="38" width="238" height="190" rx="28" stroke="#1B5D35" />
      <rect x="302" y="66" width="190" height="34" rx="17" fill="#123926" />
      <circle cx="327" cy="83" r="8" fill="#2EA15B" />
      <rect x="343" y="77" width="80" height="12" rx="6" fill="#D8F2E0" opacity="0.8" />
      <rect x="302" y="116" width="190" height="88" rx="22" fill="#F6FBF7" />
      <rect x="318" y="132" width="54" height="54" rx="18" fill="#DFF3E5" />
      <circle cx="345" cy="152" r="12" fill="#2EA15B" />
      <path d="M331 170C336.333 161.333 353.667 161.333 359 170" stroke="#2EA15B" strokeWidth="6" strokeLinecap="round" />
      <rect x="388" y="136" width="78" height="12" rx="6" fill="#0F3D26" />
      <rect x="388" y="157" width="58" height="10" rx="5" fill="#6A8B74" opacity="0.6" />
      <rect x="388" y="176" width="92" height="16" rx="8" fill="#E6F5EA" />
      <rect x="388" y="176" width="52" height="16" rx="8" fill="#2EA15B" />

      <rect x="102" y="232" width="162" height="132" rx="24" fill="#FFFFFF" />
      <rect x="102" y="232" width="162" height="132" rx="24" stroke="#DAEBDD" />
      <rect x="126" y="258" width="52" height="52" rx="18" fill="#E7F5EA" />
      <path d="M144 287L155 298L179 272" stroke="#2EA15B" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="194" y="260" width="44" height="10" rx="5" fill="#6A8B74" opacity="0.55" />
      <rect x="194" y="279" width="52" height="12" rx="6" fill="#0F3D26" />
      <rect x="126" y="326" width="114" height="14" rx="7" fill="#E6F5EA" />
      <rect x="126" y="326" width="74" height="14" rx="7" fill="#2EA15B" />

      <rect x="290" y="264" width="192" height="102" rx="24" fill="#F5FBF6" />
      <rect x="290" y="264" width="192" height="102" rx="24" stroke="#D5E8DA" />
      <rect x="314" y="288" width="70" height="16" rx="8" fill="#0F3D26" />
      <rect x="314" y="318" width="144" height="14" rx="7" fill="#E7F5EA" />
      <rect x="314" y="318" width="96" height="14" rx="7" fill="#2EA15B" />
      <rect x="404" y="286" width="54" height="54" rx="18" fill="#123926" />
      <rect x="417" y="300" width="28" height="10" rx="5" fill="#DDF4E4" />
      <rect x="417" y="317" width="18" height="9" rx="4.5" fill="#2EA15B" />

      <defs>
        <linearGradient id="hero-bg" x1="38" y1="12" x2="525" y2="404" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F6FBF7" />
          <stop offset="1" stopColor="#ECF7EE" />
        </linearGradient>
        <radialGradient id="hero-orb-left" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(102 88) rotate(90) scale(74)">
          <stop stopColor="#BEE7C9" />
          <stop offset="1" stopColor="#BEE7C9" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hero-orb-right" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(456 330) rotate(90) scale(108)">
          <stop stopColor="#8CD0A3" stopOpacity="0.45" />
          <stop offset="1" stopColor="#8CD0A3" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function MarketplaceDirectoryScene() {
  return (
    <svg
      aria-hidden="true"
      data-testid="marketplace-directory-scene"
      viewBox="0 0 520 360"
      className="h-full w-full"
      fill="none"
    >
      <rect width="520" height="360" rx="30" fill="url(#dir-bg)" />
      <rect x="34" y="52" width="164" height="248" rx="26" fill="#F8FCF9" stroke="#D9EADD" />
      <rect x="58" y="78" width="92" height="14" rx="7" fill="#0F3D26" opacity="0.18" />
      <rect x="58" y="108" width="116" height="40" rx="18" fill="#EEF8F1" />
      <rect x="58" y="162" width="116" height="40" rx="18" fill="#EEF8F1" />
      <rect x="58" y="216" width="116" height="40" rx="18" fill="#EEF8F1" />
      <circle cx="84" cy="128" r="10" fill="#2EA15B" />
      <circle cx="84" cy="182" r="10" fill="#2EA15B" opacity="0.72" />
      <circle cx="84" cy="236" r="10" fill="#2EA15B" opacity="0.42" />

      <rect x="222" y="52" width="264" height="108" rx="28" fill="#0E2418" stroke="#1A5F36" />
      <rect x="250" y="80" width="190" height="18" rx="9" fill="#D9F2E0" opacity="0.88" />
      <rect x="250" y="116" width="124" height="14" rx="7" fill="#E1F4E6" opacity="0.5" />
      <rect x="388" y="110" width="54" height="28" rx="14" fill="#2EA15B" />

      <rect x="222" y="180" width="122" height="122" rx="24" fill="#FFFFFF" stroke="#DCECDF" />
      <rect x="364" y="180" width="122" height="122" rx="24" fill="#FFFFFF" stroke="#DCECDF" />

      <rect x="242" y="202" width="46" height="46" rx="16" fill="#E8F5EC" />
      <circle cx="265" cy="219" r="10" fill="#2EA15B" />
      <path d="M251 239C255 232.333 275 232.333 279 239" stroke="#2EA15B" strokeWidth="5" strokeLinecap="round" />
      <rect x="242" y="264" width="82" height="10" rx="5" fill="#0F3D26" />
      <rect x="242" y="281" width="66" height="10" rx="5" fill="#6A8B74" opacity="0.55" />

      <rect x="384" y="202" width="82" height="14" rx="7" fill="#0F3D26" />
      <rect x="384" y="228" width="74" height="12" rx="6" fill="#6A8B74" opacity="0.45" />
      <rect x="384" y="256" width="76" height="14" rx="7" fill="#E7F5EA" />
      <rect x="384" y="256" width="44" height="14" rx="7" fill="#2EA15B" />

      <defs>
        <linearGradient id="dir-bg" x1="32" y1="18" x2="488" y2="342" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7FBF8" />
          <stop offset="1" stopColor="#EEF7F1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function EscrowFlowScene() {
  return (
    <svg
      aria-hidden="true"
      data-testid="escrow-flow-scene"
      viewBox="0 0 520 220"
      className="h-full w-full"
      fill="none"
    >
      <rect width="520" height="220" rx="28" fill="url(#flow-bg)" />
      <path d="M104 110H414" stroke="#9FD2AF" strokeWidth="10" strokeLinecap="round" strokeDasharray="18 16" />
      <circle cx="110" cy="110" r="38" fill="#FFFFFF" stroke="#DCEBDD" />
      <circle cx="260" cy="110" r="38" fill="#FFFFFF" stroke="#DCEBDD" />
      <circle cx="410" cy="110" r="38" fill="#FFFFFF" stroke="#DCEBDD" />
      <rect x="92" y="93" width="36" height="12" rx="6" fill="#0F3D26" />
      <rect x="99" y="112" width="22" height="16" rx="8" fill="#2EA15B" />
      <path d="M243 115L256 128L280 92" stroke="#2EA15B" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M394 113L404 123L426 99" stroke="#2EA15B" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="flow-bg" x1="34" y1="18" x2="496" y2="202" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F6FBF7" />
          <stop offset="1" stopColor="#EDF8F0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ProfileDetailScene() {
  return (
    <svg
      aria-hidden="true"
      data-testid="profile-detail-scene"
      viewBox="0 0 520 320"
      className="h-full w-full"
      fill="none"
    >
      <rect width="520" height="320" rx="28" fill="url(#profile-bg)" />
      <circle cx="100" cy="70" r="56" fill="#CBEBD5" opacity="0.8" />
      <circle cx="434" cy="264" r="72" fill="#A7D9B8" opacity="0.4" />

      <rect x="38" y="48" width="190" height="224" rx="26" fill="#0E2418" stroke="#1A5F36" />
      <rect x="68" y="78" width="130" height="14" rx="7" fill="#D7F0DE" opacity="0.8" />
      <circle cx="133" cy="142" r="42" fill="#F5FBF7" />
      <circle cx="133" cy="132" r="16" fill="#2EA15B" />
      <path d="M103 169C111 154.333 155 154.333 163 169" stroke="#2EA15B" strokeWidth="7" strokeLinecap="round" />
      <rect x="64" y="200" width="138" height="12" rx="6" fill="#D7F0DE" opacity="0.55" />
      <rect x="64" y="223" width="112" height="12" rx="6" fill="#D7F0DE" opacity="0.38" />

      <rect x="252" y="58" width="228" height="94" rx="24" fill="#FFFFFF" stroke="#D7E7DA" />
      <rect x="276" y="82" width="76" height="12" rx="6" fill="#0F3D26" />
      <rect x="276" y="104" width="160" height="10" rx="5" fill="#6A8B74" opacity="0.55" />
      <rect x="276" y="126" width="104" height="14" rx="7" fill="#E6F5EA" />
      <rect x="276" y="126" width="58" height="14" rx="7" fill="#2EA15B" />

      <rect x="252" y="174" width="228" height="98" rx="24" fill="#F7FBF8" stroke="#D7E7DA" />
      <rect x="276" y="200" width="58" height="58" rx="18" fill="#E7F5EA" />
      <path d="M293 228L304 239L321 217" stroke="#2EA15B" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="354" y="202" width="90" height="12" rx="6" fill="#0F3D26" />
      <rect x="354" y="223" width="68" height="10" rx="5" fill="#6A8B74" opacity="0.55" />
      <rect x="354" y="244" width="96" height="12" rx="6" fill="#E6F5EA" />

      <defs>
        <linearGradient id="profile-bg" x1="30" y1="18" x2="494" y2="296" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7FBF8" />
          <stop offset="1" stopColor="#ECF7EE" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function OpportunityDetailScene() {
  return (
    <svg
      aria-hidden="true"
      data-testid="opportunity-detail-scene"
      viewBox="0 0 520 320"
      className="h-full w-full"
      fill="none"
    >
      <rect width="520" height="320" rx="28" fill="url(#opportunity-bg)" />
      <circle cx="420" cy="74" r="62" fill="#BFE5CB" opacity="0.65" />
      <circle cx="88" cy="264" r="54" fill="#DCEEE1" opacity="0.7" />

      <rect x="38" y="48" width="268" height="224" rx="26" fill="#FFFFFF" stroke="#D7E7DA" />
      <rect x="66" y="76" width="92" height="14" rx="7" fill="#0F3D26" opacity="0.18" />
      <rect x="66" y="104" width="184" height="18" rx="9" fill="#0F3D26" />
      <rect x="66" y="134" width="150" height="11" rx="5.5" fill="#6A8B74" opacity="0.55" />
      <rect x="66" y="162" width="206" height="44" rx="16" fill="#EEF8F1" />
      <rect x="66" y="222" width="86" height="14" rx="7" fill="#E6F5EA" />
      <rect x="66" y="222" width="48" height="14" rx="7" fill="#2EA15B" />
      <rect x="166" y="222" width="74" height="14" rx="7" fill="#E6F5EA" />

      <rect x="330" y="66" width="152" height="92" rx="22" fill="#0E2418" stroke="#1A5F36" />
      <rect x="354" y="92" width="90" height="12" rx="6" fill="#D7F0DE" opacity="0.8" />
      <rect x="354" y="114" width="62" height="10" rx="5" fill="#D7F0DE" opacity="0.45" />
      <rect x="354" y="132" width="82" height="10" rx="5" fill="#2EA15B" />

      <rect x="330" y="180" width="152" height="92" rx="22" fill="#F5FBF6" stroke="#D7E7DA" />
      <circle cx="372" cy="224" r="22" fill="#E7F5EA" />
      <path d="M361 226L369 234L383 215" stroke="#2EA15B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="404" y="208" width="54" height="10" rx="5" fill="#0F3D26" />
      <rect x="404" y="226" width="40" height="9" rx="4.5" fill="#6A8B74" opacity="0.55" />
      <rect x="404" y="244" width="46" height="10" rx="5" fill="#E6F5EA" />

      <defs>
        <linearGradient id="opportunity-bg" x1="26" y1="16" x2="496" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7FBF8" />
          <stop offset="1" stopColor="#EDF8F0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function TalentCategoryGlyph(props: { kind: GlyphKind }) {
  const { kind } = props;

  if (kind === 'design') {
    return (
      <svg aria-hidden="true" data-testid="category-glyph-design" viewBox="0 0 48 48" className="h-12 w-12" fill="none">
        <rect x="6" y="6" width="36" height="36" rx="16" fill="#E9F5EC" />
        <path d="M17 30L31 16" stroke="#2EA15B" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M18 18H30V30" stroke="#0F3D26" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === 'growth') {
    return (
      <svg aria-hidden="true" data-testid="category-glyph-growth" viewBox="0 0 48 48" className="h-12 w-12" fill="none">
        <rect x="6" y="6" width="36" height="36" rx="16" fill="#E9F5EC" />
        <path d="M16 31L23 24L28 28L34 18" stroke="#2EA15B" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M28 18H34V24" stroke="#0F3D26" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" data-testid="category-glyph-engineering" viewBox="0 0 48 48" className="h-12 w-12" fill="none">
      <rect x="6" y="6" width="36" height="36" rx="16" fill="#E9F5EC" />
      <path d="M18 18L14 24L18 30" stroke="#0F3D26" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 18L34 24L30 30" stroke="#0F3D26" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27 15L21 33" stroke="#2EA15B" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}
