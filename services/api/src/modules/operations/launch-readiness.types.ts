import type { EscrowChainSyncDaemonHealthIssue } from './escrow-health.types';
import type { RuntimeProfileKind } from './runtime-profile.types';

export type LaunchReadinessOwner =
  | 'deployment'
  | 'frontend'
  | 'operator'
  | 'worker';

export type LaunchReadinessCheck = {
  id:
    | 'backend-profile'
    | 'persistence'
    | 'email-provider'
    | 'smart-account-provider'
    | 'escrow-provider'
    | 'deployed-browser-targets'
    | 'deployed-browser-cors'
    | 'cors-origins'
    | 'trust-proxy'
    | 'operator-authority'
    | 'chain-ingestion-config'
    | 'chain-ingestion-health'
    | 'chain-sync-daemon-config'
    | 'chain-sync-daemon-health';
  owner: LaunchReadinessOwner;
  status: 'ok' | 'warning' | 'failed';
  summary: string;
  details?: string;
  blocker: boolean;
};

export type LaunchReadinessReport = {
  generatedAt: string;
  ready: boolean;
  summary: string;
  profile: RuntimeProfileKind;
  scope: {
    supportedSurfaces: string[];
    exclusions: string[];
  };
  checks: LaunchReadinessCheck[];
  blockers: string[];
  warnings: string[];
};

export type LaunchReadinessChainSyncHealthSnapshot = {
  status: 'ok' | 'warning' | 'failed';
  required: boolean;
  summary: string;
  issues: EscrowChainSyncDaemonHealthIssue[];
};
