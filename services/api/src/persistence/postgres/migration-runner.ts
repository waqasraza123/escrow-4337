import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { Client } from 'pg';
import { PersistenceConfigService } from '../persistence.config';

async function main() {
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

  const migrationsDir = join(
    process.cwd(),
    'src',
    'persistence',
    'postgres',
    'migrations',
  );

  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const appliedResult = await client.query<{ name: string }>(
      'SELECT name FROM schema_migrations',
    );
    const applied = new Set(
      appliedResult.rows.map((row: { name: string }) => row.name),
    );

    const filenames = (await readdir(migrationsDir))
      .filter((name) => name.endsWith('.sql'))
      .sort();

    for (const filename of filenames) {
      if (applied.has(filename)) {
        continue;
      }

      const sql = await readFile(join(migrationsDir, filename), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [
          filename,
        ]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
