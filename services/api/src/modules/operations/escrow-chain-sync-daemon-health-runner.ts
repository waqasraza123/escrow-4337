import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { loadApiEnvironment } from '../../common/env/load-env';
import { EscrowChainSyncDaemonAlertingService } from './escrow-chain-sync-daemon-alerting.service';
import {
  parseArgs,
  shouldFailHealth,
} from './escrow-chain-sync-daemon-health-cli';
import { EscrowChainSyncDaemonMonitoringService } from './escrow-chain-sync-daemon-monitoring.service';
import { OperationsModule } from './operations.module';

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
    const monitoring = app.get(EscrowChainSyncDaemonMonitoringService);
    const alerting = app.get(EscrowChainSyncDaemonAlertingService);
    const output =
      input.notify || input.dryRun
        ? await alerting.dispatchAlert({
            dryRun: input.dryRun,
          })
        : await monitoring.getReport();
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(output, null, 2));

    const report = 'report' in output ? output.report : output;
    if (shouldFailHealth(report, input.failOn)) {
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
