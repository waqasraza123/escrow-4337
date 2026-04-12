import { existsSync } from 'fs';
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

const schemaPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function listMigrationDirCandidates(
  baseDir = process.cwd(),
  runtimeDir = __dirname,
) {
  return Array.from(
    new Set([
      join(runtimeDir, 'migrations'),
      join(baseDir, 'src', 'persistence', 'postgres', 'migrations'),
      join(baseDir, 'dist', 'persistence', 'postgres', 'migrations'),
    ]),
  );
}

export function resolveMigrationsDir(
  baseDir = process.cwd(),
  runtimeDir = __dirname,
) {
  return (
    listMigrationDirCandidates(baseDir, runtimeDir).find((candidate) =>
      existsSync(candidate),
    ) || join(runtimeDir, 'migrations')
  );
}

export async function listMigrationFilenames(
  baseDir = process.cwd(),
  runtimeDir = __dirname,
) {
  return (await readdir(resolveMigrationsDir(baseDir, runtimeDir)))
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

export async function inspectMigrationStatus(
  client: SqlQueryable,
  baseDir = process.cwd(),
  schemaName = 'public',
): Promise<MigrationStatus> {
  const normalizedSchema = normalizeSchemaName(schemaName);
  await ensureMigrationSchema(client, normalizedSchema);
  const filenames = await listMigrationFilenames(baseDir);
  const applied = await readAppliedMigrationNames(client, normalizedSchema);
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
  schemaName = 'public',
) {
  const normalizedSchema = normalizeSchemaName(schemaName);
  await ensureMigrationSchema(client, normalizedSchema);
  await ensureSchemaMigrationsTable(client);
  const filenames = await listMigrationFilenames(baseDir);
  const applied = new Set(
    await readAppliedMigrationNames(client, normalizedSchema),
  );
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

async function readAppliedMigrationNames(
  client: SqlQueryable,
  schemaName: string,
) {
  const tableLookup = await client.query<TableLookupRow>(
    'SELECT to_regclass($1) AS "relationName"',
    [`${schemaName}.schema_migrations`],
  );

  if (!tableLookup.rows[0]?.relationName) {
    return [];
  }

  const appliedResult = await client.query<MigrationRecordRow>(
    'SELECT name FROM schema_migrations ORDER BY name ASC',
  );

  return appliedResult.rows.map((row) => row.name);
}

async function ensureMigrationSchema(client: SqlQueryable, schemaName: string) {
  if (schemaName !== 'public') {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  }

  const searchPath =
    schemaName === 'public' ? 'public' : `"${schemaName}", public`;
  await client.query(`SET search_path TO ${searchPath}`);
}

function normalizeSchemaName(schemaName: string) {
  if (!schemaPattern.test(schemaName)) {
    throw new Error(
      'Migration schema name must start with a letter or underscore and contain only letters, numbers, and underscores',
    );
  }

  return schemaName;
}
