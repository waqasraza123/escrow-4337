import 'reflect-metadata';
import { hostname } from 'os';
import { NestFactory } from '@nestjs/core';
import { loadApiEnvironment } from '../../common/env/load-env';
import { EscrowChainSyncDaemonStatusService } from './escrow-chain-sync-daemon-status.service';
import { EscrowChainSyncService } from './escrow-chain-sync.service';
import { EscrowChainSyncBatchDaemon } from './escrow-chain-sync-batch-daemon';
import { EscrowChainSyncRunLockService } from './escrow-chain-sync-run-lock.service';
import { OperationsConfigService } from './operations.config';
import { OperationsModule } from './operations.module';

type RunnerInput = {
  intervalSeconds?: number;
  limit?: number;
  persist?: boolean;
  runOnStart?: boolean;
};

function parsePositiveInteger(raw: string, flag: string) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }

  return value;
}

function printHelp() {
  // eslint-disable-next-line no-console
  console.log(
    [
      'Usage: pnpm --filter escrow4334-api chain-sync:daemon -- [--interval-sec <seconds>] [--limit <count>] [--persist|--preview] [--run-on-start|--wait-first]',
      '',
      'Runs the bounded escrow chain-audit batch backfill on a recurring interval.',
      '--interval-sec <seconds>  Override OPERATIONS_ESCROW_BATCH_SYNC_SCHEDULE_INTERVAL_SEC for this process.',
      '--limit <count>           Override OPERATIONS_ESCROW_BATCH_SYNC_LIMIT for each run.',
      '--persist                 Persist chain-derived audit state for changed jobs.',
      '--preview                 Force preview mode even if persistence is enabled in env.',
      '--run-on-start            Run immediately on process start.',
      '--wait-first              Wait one interval before the first run.',
    ].join('\n'),
  );
}

function parseArgs(args: string[]): RunnerInput | null {
  const input: RunnerInput = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      return null;
    }

    if (arg === '--persist') {
      input.persist = true;
      continue;
    }

    if (arg === '--preview') {
      input.persist = false;
      continue;
    }

    if (arg === '--run-on-start') {
      input.runOnStart = true;
      continue;
    }

    if (arg === '--wait-first') {
      input.runOnStart = false;
      continue;
    }

    if (arg === '--limit') {
      const raw = args[index + 1];
      if (!raw) {
        throw new Error('--limit requires a value');
      }
      input.limit = parsePositiveInteger(raw, '--limit');
      index += 1;
      continue;
    }

    if (arg.startsWith('--limit=')) {
      input.limit = parsePositiveInteger(
        arg.slice('--limit='.length),
        '--limit',
      );
      continue;
    }

    if (arg === '--interval-sec') {
      const raw = args[index + 1];
      if (!raw) {
        throw new Error('--interval-sec requires a value');
      }
      input.intervalSeconds = parsePositiveInteger(raw, '--interval-sec');
      index += 1;
      continue;
    }

    if (arg.startsWith('--interval-sec=')) {
      input.intervalSeconds = parsePositiveInteger(
        arg.slice('--interval-sec='.length),
        '--interval-sec',
      );
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return input;
}

async function main() {
  const input = parseArgs(process.argv.slice(2));
  if (!input) {
    return;
  }

  loadApiEnvironment();

  const app = await NestFactory.createApplicationContext(OperationsModule, {
    logger: false,
  });

  try {
    const escrowChainSync = app.get(EscrowChainSyncService);
    const daemonStatus = app.get(EscrowChainSyncDaemonStatusService);
    const runLock = app.get(EscrowChainSyncRunLockService);
    const operationsConfig = app.get(OperationsConfigService);
    const intervalMs =
      (input.intervalSeconds ??
        operationsConfig.escrowBatchSyncScheduleIntervalSeconds) * 1000;
    const runOnStart =
      input.runOnStart ?? operationsConfig.escrowBatchSyncScheduleRunOnStart;
    const worker = {
      workerId: `${hostname()}:${process.pid}`,
      hostname: hostname(),
      pid: process.pid,
      intervalMs,
      runOnStart,
      overrideLimit: input.limit ?? null,
      overridePersist: input.persist ?? null,
    };
    const daemon = new EscrowChainSyncBatchDaemon({
      worker,
      intervalMs,
      runOnStart,
      acquireRunPermit: () => runLock.acquireRunPermit(),
      onStarted: ({ atMs }) => daemonStatus.recordDaemonStarted(worker, atMs),
      onRunStarted: ({ startedAtMs }) =>
        daemonStatus.recordRunStarted(worker, startedAtMs),
      onRunCompleted: (result) =>
        daemonStatus.recordRunCompleted(worker, result),
      onRunSkipped: (result) => daemonStatus.recordRunSkipped(worker, result),
      onRunFailed: (result) =>
        daemonStatus.recordRunFailed(worker, {
          startedAtMs: result.startedAtMs,
          completedAtMs: result.completedAtMs,
          durationMs: result.durationMs,
          lockProvider: result.lockProvider,
          errorMessage: result.message,
        }),
      onStopped: ({ atMs }) => daemonStatus.recordDaemonStopped(worker, atMs),
      runBatchBackfill: () =>
        escrowChainSync.runBatchBackfill({
          limit: input.limit,
          persist: input.persist,
        }),
      log(entry) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(entry));
      },
      overrideLimit: input.limit ?? null,
      overridePersist: input.persist ?? null,
    });

    await daemon.start();

    await new Promise<void>((resolve) => {
      let shuttingDown = false;

      const shutdown = (signal: 'SIGINT' | 'SIGTERM') => {
        if (shuttingDown) {
          return;
        }

        shuttingDown = true;

        void daemon
          .stop()
          .catch((error) => {
            // eslint-disable-next-line no-console
            console.error(error);
            process.exitCode = 1;
          })
          .finally(() => {
            process.off('SIGINT', handleSigint);
            process.off('SIGTERM', handleSigterm);
            // eslint-disable-next-line no-console
            console.log(
              JSON.stringify({
                type: 'chain_sync_batch_daemon_signal',
                at: new Date().toISOString(),
                signal,
              }),
            );

            void app.close().then(
              () => {
                resolve();
              },
              (error) => {
                // eslint-disable-next-line no-console
                console.error(error);
                process.exitCode = 1;
                resolve();
              },
            );
          });
      };

      const handleSigint = () => shutdown('SIGINT');
      const handleSigterm = () => shutdown('SIGTERM');

      process.on('SIGINT', handleSigint);
      process.on('SIGTERM', handleSigterm);
    });
  } catch (error) {
    await app.close();
    throw error;
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
