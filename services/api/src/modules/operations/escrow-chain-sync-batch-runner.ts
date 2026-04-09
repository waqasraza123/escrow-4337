import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { loadApiEnvironment } from '../../common/env/load-env';
import { EscrowChainSyncService } from './escrow-chain-sync.service';
import { OperationsModule } from './operations.module';

type RunnerInput = {
  limit?: number;
  persist?: boolean;
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
      'Usage: pnpm --filter escrow4334-api chain-sync:batch -- [--limit <count>] [--persist|--preview]',
      '',
      'Runs the bounded escrow chain-audit batch backfill over persisted jobs.',
      '--limit <count>  Override OPERATIONS_ESCROW_BATCH_SYNC_LIMIT for this run.',
      '--persist        Persist chain-derived audit state for changed jobs.',
      '--preview        Force preview mode even if persistence is enabled in env.',
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
    const report = await escrowChainSync.runBatchBackfill(input);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));

    if (
      report.summary.failedJobs > 0 ||
      report.summary.blockedJobs > 0 ||
      report.summary.criticalIssueJobs > 0
    ) {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
