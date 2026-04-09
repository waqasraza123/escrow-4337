import type { EscrowChainSyncDaemonHealthReport } from './escrow-health.types';

export type EscrowChainSyncDaemonHealthRunnerInput = {
  notify: boolean;
  dryRun: boolean;
  failOn: 'warning' | 'critical' | 'never';
};

export function printHelp() {
  // eslint-disable-next-line no-console
  console.log(
    [
      'Usage: pnpm --filter escrow4334-api chain-sync:daemon:health -- [--notify] [--dry-run] [--fail-on <warning|critical|never>]',
      '',
      'Evaluates the recurring chain-sync daemon health report and can dispatch a deduped alert webhook.',
      '--notify                  Send webhook alerts when the configured health threshold is met.',
      '--dry-run                 Evaluate alert delivery without sending a webhook or mutating alert state.',
      '--fail-on <level>         Exit non-zero on warning, critical, or never. Defaults to warning.',
      '',
      'Alerting environment:',
      'OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_WEBHOOK_URL',
      'OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_WEBHOOK_BEARER_TOKEN=optional',
      'OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_MIN_SEVERITY=warning|critical',
      'OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_RESEND_INTERVAL_SEC=3600',
      'OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_SEND_RECOVERY=true',
    ].join('\n'),
  );
}

export function parseArgs(
  args: string[],
): EscrowChainSyncDaemonHealthRunnerInput | null {
  const input: EscrowChainSyncDaemonHealthRunnerInput = {
    notify: false,
    dryRun: false,
    failOn: 'warning',
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      return null;
    }

    if (arg === '--notify') {
      input.notify = true;
      continue;
    }

    if (arg === '--dry-run') {
      input.dryRun = true;
      continue;
    }

    if (arg === '--fail-on') {
      const raw = args[index + 1];
      if (!raw) {
        throw new Error('--fail-on requires a value');
      }
      input.failOn = parseFailOn(raw);
      index += 1;
      continue;
    }

    if (arg.startsWith('--fail-on=')) {
      input.failOn = parseFailOn(arg.slice('--fail-on='.length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return input;
}

export function shouldFailHealth(
  report: Pick<EscrowChainSyncDaemonHealthReport, 'status'>,
  failOn: EscrowChainSyncDaemonHealthRunnerInput['failOn'],
) {
  if (failOn === 'never') {
    return false;
  }

  if (failOn === 'critical') {
    return report.status === 'failed';
  }

  return report.status === 'warning' || report.status === 'failed';
}

function parseFailOn(raw: string) {
  const normalized = raw.trim().toLowerCase();
  if (
    normalized === 'warning' ||
    normalized === 'critical' ||
    normalized === 'never'
  ) {
    return normalized;
  }

  throw new Error('--fail-on must be one of warning, critical, or never');
}
