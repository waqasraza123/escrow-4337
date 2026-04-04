import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import type { QueryResultRow } from 'pg';

type SqlQueryable = {
  query<T extends QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[] }>;
};

type MigrationRecordRow = {
  name: string;
};

type TableLookupRow = {
  relationName: string | null;
};

export type MigrationStatus = {
  applied: string[];
  pending: string[];
  total: number;
};

export function resolveMigrationsDir(baseDir = process.cwd()) {
  return join(baseDir, 'src', 'persistence', 'postgres', 'migrations');
}

export async function listMigrationFilenames(baseDir = process.cwd()) {
  return (await readdir(resolveMigrationsDir(baseDir)))
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

export async function inspectMigrationStatus(
  client: SqlQueryable,
  baseDir = process.cwd(),
): Promise<MigrationStatus> {
  const filenames = await listMigrationFilenames(baseDir);
  const applied = await readAppliedMigrationNames(client);
  const pending = filenames.filter((filename) => !applied.includes(filename));

  return {
    applied,
    pending,
    total: filenames.length,
  };
}

export async function applyPendingMigrations(
  client: SqlQueryable,
  baseDir = process.cwd(),
) {
  await ensureSchemaMigrationsTable(client);
  const filenames = await listMigrationFilenames(baseDir);
  const applied = new Set(await readAppliedMigrationNames(client));
  const appliedThisRun: string[] = [];

  for (const filename of filenames) {
    if (applied.has(filename)) {
      continue;
    }

    const sql = await readFile(
      join(resolveMigrationsDir(baseDir), filename),
      'utf8',
    );
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [
        filename,
      ]);
      await client.query('COMMIT');
      appliedThisRun.push(filename);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  return appliedThisRun;
}

async function ensureSchemaMigrationsTable(client: SqlQueryable) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function readAppliedMigrationNames(client: SqlQueryable) {
  const tableLookup = await client.query<TableLookupRow>(
    'SELECT to_regclass(\'public.schema_migrations\') AS "relationName"',
  );

  if (!tableLookup.rows[0]?.relationName) {
    return [];
  }

  const appliedResult = await client.query<MigrationRecordRow>(
    'SELECT name FROM schema_migrations ORDER BY name ASC',
  );

  return appliedResult.rows.map((row) => row.name);
}
