import { Injectable } from '@nestjs/common';
import { EscrowChainSyncDaemonMonitoringService } from './escrow-chain-sync-daemon-monitoring.service';
import { EscrowChainIngestionStatusService } from './escrow-chain-ingestion-status.service';
import type {
  LaunchReadinessChainSyncHealthSnapshot,
  LaunchReadinessCheck,
  LaunchReadinessReport,
} from './launch-readiness.types';
import { RuntimeProfileService } from './runtime-profile.service';

@Injectable()
export class LaunchReadinessService {
  constructor(
    private readonly runtimeProfile: RuntimeProfileService,
    private readonly daemonMonitoring: EscrowChainSyncDaemonMonitoringService,
    private readonly ingestionStatus: EscrowChainIngestionStatusService,
  ) {}

  async getReport(): Promise<LaunchReadinessReport> {
    const profile = await this.runtimeProfile.getProfile();
    const daemonHealth = await this.readDaemonHealth();
    const chainIngestion = await this.ingestionStatus.getStatus();
    const checks = this.buildChecks(profile, daemonHealth, chainIngestion);
    const blockers = checks
      .filter((check) => check.blocker)
      .map((check) => check.summary);
    const warnings = checks
      .filter((check) => check.status === 'warning')
      .map((check) => check.summary);

    return {
      generatedAt: new Date().toISOString(),
      ready: blockers.length === 0,
      summary: buildSummary(blockers.length, warnings.length),
      profile: profile.profile,
      scope: {
        supportedSurfaces: [
          'OTP-authenticated API, web, and admin flows backed by Postgres and relay providers.',
          'Arbitrator-wallet-linked operator resolution, export, and operations-health workflows.',
          'Finalized contract-log ingestion with persisted chain projections for authoritative escrow read paths.',
          'Recurring chain-sync daemon monitoring and alerting over persisted worker status.',
        ],
        exclusions: [
          'No non-arbitrator privileged operator role model beyond the linked arbitrator wallet.',
          'No automated execution retry, self-healing remediation, or incident paging evidence without live staging validation.',
        ],
      },
      checks,
      blockers,
      warnings,
    };
  }

  private buildChecks(
    profile: Awaited<ReturnType<RuntimeProfileService['getProfile']>>,
    daemonHealth: LaunchReadinessChainSyncHealthSnapshot,
    chainIngestion: Awaited<ReturnType<EscrowChainIngestionStatusService['getStatus']>>,
  ): LaunchReadinessCheck[] {
    const daemonPosture = profile.operations.chainSyncDaemon;
    const checks: LaunchReadinessCheck[] = [
      {
        id: 'backend-profile',
        owner: 'deployment',
        status: profile.profile === 'deployment-like' ? 'ok' : 'failed',
        summary:
          profile.profile === 'deployment-like'
            ? 'Backend profile is deployment-like.'
            : `Backend profile is ${profile.profile}, so launch readiness is blocked.`,
        details: profile.summary,
        blocker: profile.profile !== 'deployment-like',
      },
      {
        id: 'persistence',
        owner: 'deployment',
        status:
          profile.environment.persistenceDriver === 'postgres'
            ? 'ok'
            : 'failed',
        summary:
          profile.environment.persistenceDriver === 'postgres'
            ? 'Persistence is backed by Postgres.'
            : 'Persistence is not using Postgres.',
        details:
          profile.environment.persistenceDriver === 'postgres'
            ? undefined
            : 'Launch scope requires repository state to survive restarts and multi-process execution.',
        blocker: profile.environment.persistenceDriver !== 'postgres',
      },
      createProviderCheck(
        'email-provider',
        'deployment',
        profile.providers.emailMode,
        'Auth email delivery is relay-backed.',
        'Auth email delivery is still using mock mode.',
      ),
      createProviderCheck(
        'smart-account-provider',
        'deployment',
        profile.providers.smartAccountMode,
        'Smart-account provisioning is relay-backed.',
        'Smart-account provisioning is still using mock mode.',
      ),
      createProviderCheck(
        'escrow-provider',
        'deployment',
        profile.providers.escrowMode,
        'Escrow execution is relay-backed.',
        'Escrow execution is still using mock mode.',
      ),
      {
        id: 'cors-origins',
        owner: 'frontend',
        status: profile.environment.corsOrigins.length > 0 ? 'ok' : 'failed',
        summary:
          profile.environment.corsOrigins.length > 0
            ? 'Browser CORS origins are configured.'
            : 'Browser CORS origins are not configured.',
        details:
          profile.environment.corsOrigins.length > 0
            ? undefined
            : 'Separate deployed web and admin origins cannot be treated as launch-ready without explicit CORS policy.',
        blocker: profile.environment.corsOrigins.length === 0,
      },
      {
        id: 'trust-proxy',
        owner: 'deployment',
        status: profile.environment.trustProxyRaw ? 'ok' : 'warning',
        summary: profile.environment.trustProxyRaw
          ? 'Trusted proxy handling is explicitly configured.'
          : 'Trusted proxy handling is not explicitly configured.',
        details: profile.environment.trustProxyRaw
          ? undefined
          : 'OTP throttling and source-IP attribution may be inaccurate behind ingress until NEST_API_TRUST_PROXY is set deliberately.',
        blocker: false,
      },
      {
        id: 'operator-authority',
        owner: 'operator',
        status:
          profile.operator.arbitratorAddress && profile.operator.exportSupport
            ? 'ok'
            : 'failed',
        summary:
          profile.operator.arbitratorAddress && profile.operator.exportSupport
            ? 'Operator launch prerequisites are configured.'
            : 'Operator launch prerequisites are incomplete.',
        details:
          profile.operator.arbitratorAddress && profile.operator.exportSupport
            ? undefined
            : 'Launch scope requires a configured arbitrator wallet and export support for operator triage.',
        blocker:
          !profile.operator.arbitratorAddress ||
          !profile.operator.exportSupport,
      },
      {
        id: 'chain-ingestion-config',
        owner: 'worker',
        status: chainIngestion.enabled ? 'ok' : 'failed',
        summary: chainIngestion.enabled
          ? 'Escrow chain ingestion is enabled.'
          : 'Escrow chain ingestion is disabled.',
        details:
          chainIngestion.enabled
            ? undefined
            : 'Launch scope now expects finalized chain ingestion to be enabled.',
        blocker: !chainIngestion.enabled,
      },
      {
        id: 'chain-ingestion-health',
        owner: 'worker',
        status: chainIngestion.status,
        summary: chainIngestion.summary,
        details: chainIngestion.issues[0] ?? chainIngestion.warnings[0],
        blocker: chainIngestion.status === 'failed',
      },
      {
        id: 'chain-sync-daemon-config',
        owner: 'worker',
        status: daemonPosture.status,
        summary: daemonPosture.summary,
        details: daemonPosture.issues[0] ?? daemonPosture.warnings[0],
        blocker: daemonPosture.status === 'failed',
      },
      {
        id: 'chain-sync-daemon-health',
        owner: 'worker',
        status: daemonHealth.status,
        summary: daemonHealth.summary,
        details: daemonHealth.issues[0]?.detail ?? undefined,
        blocker: daemonHealth.status === 'failed',
      },
    ];

    return checks;
  }

  private async readDaemonHealth(): Promise<LaunchReadinessChainSyncHealthSnapshot> {
    const report = await this.daemonMonitoring.getReport();

    return {
      status: report.status,
      required: report.required,
      summary: report.summary,
      issues: report.issues,
    };
  }
}

function createProviderCheck(
  id: LaunchReadinessCheck['id'],
  owner: LaunchReadinessCheck['owner'],
  mode: 'mock' | 'relay',
  readySummary: string,
  blockedSummary: string,
): LaunchReadinessCheck {
  return {
    id,
    owner,
    status: mode === 'relay' ? 'ok' : 'failed',
    summary: mode === 'relay' ? readySummary : blockedSummary,
    details:
      mode === 'relay'
        ? undefined
        : 'Launch scope assumes the deployed provider boundary, not local mock behavior.',
    blocker: mode !== 'relay',
  };
}

function buildSummary(blockerCount: number, warningCount: number) {
  if (blockerCount === 0 && warningCount === 0) {
    return 'Launch readiness checks are green for the currently supported surface.';
  }

  if (blockerCount === 0) {
    return `Launch readiness has ${warningCount} warning${warningCount === 1 ? '' : 's'} but no blocking failures.`;
  }

  return `Launch readiness is blocked by ${blockerCount} failed check${blockerCount === 1 ? '' : 's'} and ${warningCount} warning${warningCount === 1 ? '' : 's'}.`;
}
