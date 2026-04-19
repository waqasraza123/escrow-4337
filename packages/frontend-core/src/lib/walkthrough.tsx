'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';

export type StoredWalkthroughStatus = 'idle' | 'active' | 'stopped' | 'completed';

export type StoredWalkthroughState = {
  status: StoredWalkthroughStatus;
  lastStep: string | null;
  lastRoute: string | null;
  completedAt: number | null;
  stoppedAt: number | null;
};

export type WalkthroughLauncherAction = {
  id: string;
  label: string;
  description?: string;
  onSelect: () => void;
};

const walkthroughBackdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 90,
  pointerEvents: 'none',
};

const walkthroughShadeStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(circle at top, rgba(147, 198, 255, 0.12), transparent 34%), rgba(4, 10, 18, 0.42)',
  backdropFilter: 'blur(14px)',
};

const walkthroughCoachmarkStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 91,
  width: 'min(380px, calc(100vw - 32px))',
  borderRadius: '26px',
  background: 'linear-gradient(180deg, rgba(248, 252, 255, 0.94), rgba(233, 241, 250, 0.9))',
  color: '#102034',
  padding: '20px 20px 18px',
  boxShadow: '0 28px 80px rgba(6, 15, 30, 0.28)',
  border: '1px solid rgba(162, 184, 212, 0.34)',
  backdropFilter: 'blur(22px)',
  pointerEvents: 'auto',
};

const walkthroughCoachmarkDarkStyle: CSSProperties = {
  ...walkthroughCoachmarkStyle,
  background: 'linear-gradient(180deg, rgba(10, 18, 31, 0.92), rgba(13, 21, 36, 0.88))',
  color: '#f3f7fb',
  border: '1px solid rgba(145, 164, 189, 0.24)',
  boxShadow: '0 28px 80px rgba(4, 10, 16, 0.46)',
};

const walkthroughButtonRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  alignItems: 'center',
};

const walkthroughPrimaryButtonStyle: CSSProperties = {
  border: '1px solid rgba(99, 215, 255, 0.24)',
  borderRadius: '999px',
  padding: '10px 15px',
  background: 'linear-gradient(135deg, #8ddfff, #8d98ff, #b88fff)',
  color: '#04101d',
  font: 'inherit',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 18px 40px rgba(84, 146, 255, 0.22)',
};

const walkthroughSecondaryButtonStyle: CSSProperties = {
  ...walkthroughPrimaryButtonStyle,
  background: 'rgba(255, 255, 255, 0.04)',
  color: 'inherit',
  border: '1px solid rgba(145, 164, 189, 0.24)',
  boxShadow: 'none',
};

function createDefaultWalkthroughState(): StoredWalkthroughState {
  return {
    status: 'idle',
    lastStep: null,
    lastRoute: null,
    completedAt: null,
    stoppedAt: null,
  };
}

export function readStoredWalkthroughState(key: string): StoredWalkthroughState {
  if (typeof window === 'undefined') {
    return createDefaultWalkthroughState();
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return createDefaultWalkthroughState();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredWalkthroughState>;
    return {
      status:
        parsed.status === 'active' ||
        parsed.status === 'stopped' ||
        parsed.status === 'completed'
          ? parsed.status
          : 'idle',
      lastStep: typeof parsed.lastStep === 'string' ? parsed.lastStep : null,
      lastRoute: typeof parsed.lastRoute === 'string' ? parsed.lastRoute : null,
      completedAt:
        typeof parsed.completedAt === 'number' ? parsed.completedAt : null,
      stoppedAt: typeof parsed.stoppedAt === 'number' ? parsed.stoppedAt : null,
    };
  } catch {
    return createDefaultWalkthroughState();
  }
}

export function writeStoredWalkthroughState(
  key: string,
  value: StoredWalkthroughState,
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function activateStoredWalkthroughState(
  key: string,
  input?: {
    lastStep?: string | null;
    lastRoute?: string | null;
  },
) {
  const nextState: StoredWalkthroughState = {
    status: 'active',
    lastStep: input?.lastStep ?? null,
    lastRoute: input?.lastRoute ?? null,
    completedAt: null,
    stoppedAt: null,
  };
  writeStoredWalkthroughState(key, nextState);
  return nextState;
}

export function stopStoredWalkthroughState(
  key: string,
  input?: {
    lastStep?: string | null;
    lastRoute?: string | null;
  },
) {
  const nextState: StoredWalkthroughState = {
    status: 'stopped',
    lastStep: input?.lastStep ?? null,
    lastRoute: input?.lastRoute ?? null,
    completedAt: null,
    stoppedAt: Date.now(),
  };
  writeStoredWalkthroughState(key, nextState);
  return nextState;
}

export function completeStoredWalkthroughState(
  key: string,
  input?: {
    lastStep?: string | null;
    lastRoute?: string | null;
  },
) {
  const nextState: StoredWalkthroughState = {
    status: 'completed',
    lastStep: input?.lastStep ?? null,
    lastRoute: input?.lastRoute ?? null,
    completedAt: Date.now(),
    stoppedAt: null,
  };
  writeStoredWalkthroughState(key, nextState);
  return nextState;
}

export function findWalkthroughTarget(targetId: string | null | undefined) {
  if (!targetId || typeof document === 'undefined') {
    return null;
  }

  return document.querySelector<HTMLElement>(
    `[data-walkthrough-id="${targetId}"]`,
  );
}

function useWalkthroughTargetRect(targetId: string | null | undefined, active: boolean) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active || !targetId) {
      setRect(null);
      return;
    }

    const target = findWalkthroughTarget(targetId);
    if (!target) {
      setRect(null);
      return;
    }

    if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'smooth',
      });
    }

    const updateRect = () => {
      setRect(target.getBoundingClientRect());
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [active, targetId]);

  return rect;
}

export function WalkthroughOverlay(props: {
  visible: boolean;
  title: string;
  body: string;
  stopLabel: string;
  stopHint?: string;
  progressLabel: string;
  targetId?: string | null;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  onStop: () => void;
  tone?: 'light' | 'dark';
  children?: ReactNode;
}) {
  const {
    body,
    children,
    onPrimaryAction,
    onSecondaryAction,
    onStop,
    primaryActionLabel,
    progressLabel,
    secondaryActionLabel,
    stopHint,
    stopLabel,
    targetId,
    title,
    tone = 'light',
    visible,
  } = props;
  const rect = useWalkthroughTargetRect(targetId, visible);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const update = () => {
      setIsMobile(window.innerWidth < 920);
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const coachmarkStyle = useMemo(() => {
    const baseStyle = tone === 'dark' ? walkthroughCoachmarkDarkStyle : walkthroughCoachmarkStyle;
    if (isMobile) {
      return {
        ...baseStyle,
        left: 16,
        right: 16,
        bottom: 16,
        width: 'auto',
      } satisfies CSSProperties;
    }

    return {
      ...baseStyle,
      right: 24,
      bottom: 24,
    } satisfies CSSProperties;
  }, [isMobile, tone]);

  if (!visible) {
    return null;
  }

  return (
    <div style={walkthroughBackdropStyle} aria-live="polite">
      <div style={walkthroughShadeStyle} />
      {rect ? (
        <div
          style={{
            position: 'fixed',
            zIndex: 91,
            top: Math.max(8, rect.top - 6),
            left: Math.max(8, rect.left - 6),
            width: Math.max(48, rect.width + 12),
            height: Math.max(48, rect.height + 12),
            borderRadius: 22,
            boxShadow:
              tone === 'dark'
                ? '0 0 0 1px rgba(176, 212, 255, 0.92), 0 0 0 8px rgba(96, 172, 255, 0.18), 0 0 0 9999px rgba(7, 12, 18, 0.24)'
                : '0 0 0 1px rgba(122, 196, 255, 0.88), 0 0 0 8px rgba(122, 196, 255, 0.16), 0 0 0 9999px rgba(7, 12, 18, 0.24)',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      <aside style={coachmarkStyle} role="dialog" aria-label={title}>
        <div
          style={{
            ...walkthroughButtonRowStyle,
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <strong
            style={{
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              opacity: 0.72,
            }}
          >
            {progressLabel}
          </strong>
          <button type="button" onClick={onStop} style={walkthroughSecondaryButtonStyle}>
            {stopLabel}
          </button>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', lineHeight: 1.3 }}>{title}</h2>
          <p style={{ margin: 0, lineHeight: 1.6, opacity: 0.92 }}>{body}</p>
          {stopHint ? (
            <p style={{ margin: 0, fontSize: '0.92rem', opacity: 0.74 }}>{stopHint}</p>
          ) : null}
          {children}
        </div>
        {primaryActionLabel || secondaryActionLabel ? (
          <div style={{ ...walkthroughButtonRowStyle, marginTop: 14 }}>
            {primaryActionLabel && onPrimaryAction ? (
              <button
                type="button"
                onClick={onPrimaryAction}
                style={walkthroughPrimaryButtonStyle}
              >
                {primaryActionLabel}
              </button>
            ) : null}
            {secondaryActionLabel && onSecondaryAction ? (
              <button
                type="button"
                onClick={onSecondaryAction}
                style={walkthroughSecondaryButtonStyle}
              >
                {secondaryActionLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

export function WalkthroughLauncherMenu(props: {
  label: string;
  actions: WalkthroughLauncherAction[];
  tone?: 'light' | 'dark';
}) {
  const { actions, label, tone = 'light' } = props;
  const [open, setOpen] = useState(false);

  const panelStyle: CSSProperties = tone === 'dark'
    ? {
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        width: 260,
        display: 'grid',
        gap: 8,
        padding: 12,
        borderRadius: 18,
        background: 'rgba(12, 17, 24, 0.98)',
        color: '#f2f5f8',
        border: '1px solid rgba(145, 164, 189, 0.16)',
        boxShadow: '0 20px 50px rgba(4, 10, 16, 0.38)',
        zIndex: 40,
      }
    : {
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        width: 260,
        display: 'grid',
        gap: 8,
        padding: 12,
        borderRadius: 18,
        background: 'rgba(255, 255, 255, 0.98)',
        color: '#1e1610',
        border: '1px solid rgba(74, 49, 27, 0.14)',
        boxShadow: '0 20px 50px rgba(25, 18, 12, 0.16)',
        zIndex: 40,
      };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        style={walkthroughSecondaryButtonStyle}
        onClick={() => setOpen((current) => !current)}
      >
        {label}
      </button>
      {open ? (
        <div style={panelStyle}>
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                setOpen(false);
                action.onSelect();
              }}
              style={{
                border: '1px solid rgba(127, 97, 65, 0.18)',
                borderRadius: 14,
                padding: '12px 12px 10px',
                background: 'transparent',
                color: 'inherit',
                font: 'inherit',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'grid',
                gap: 4,
              }}
            >
              <strong>{action.label}</strong>
              {action.description ? (
                <span style={{ fontSize: '0.92rem', opacity: 0.74 }}>
                  {action.description}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
