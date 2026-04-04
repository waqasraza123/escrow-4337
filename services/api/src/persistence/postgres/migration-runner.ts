import { Client } from 'pg';
import { loadApiEnvironment } from '../../common/env/load-env';
import { PersistenceConfigService } from '../persistence.config';
import { applyPendingMigrations, inspectMigrationStatus } from './migrations';

async function main() {
  loadApiEnvironment();
  const config = new PersistenceConfigService();
  if (config.driver !== 'postgres') {
    throw new Error(
      'Set PERSISTENCE_DRIVER=postgres before running migrations',
    );
  }

  const client = new Client({
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    if (process.argv.includes('--status')) {
      const status = await inspectMigrationStatus(client);
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    const applied = await applyPendingMigrations(client);
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          applied,
          appliedCount: applied.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
