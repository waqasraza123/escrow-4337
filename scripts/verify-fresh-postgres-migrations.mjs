#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import net from 'node:net';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiRoot = resolve(repoRoot, 'services/api');
const composeFile = resolve(repoRoot, 'infra/postgres/docker-compose.yml');
const migrationRunnerPath = resolve(
  apiRoot,
  'dist/persistence/postgres/migration-runner.js',
);
const isolationSuffix = randomUUID().replace(/-/g, '').slice(0, 12);
const composeProject = `escrow4337-migrations-${isolationSuffix.slice(0, 8)}`;
const containerName = `escrow4337-postgres-${isolationSuffix.slice(0, 8)}`;
const databaseName = `escrow4337_migrations_${isolationSuffix}`;
const databaseUser = `escrow4337_${isolationSuffix.slice(0, 8)}`;
const databasePassword = `escrow4337_${isolationSuffix}`;
const port = await findFreePort();
const runtimePreference = normalizeRuntimePreference(
  process.env.ESCROW4337_MIGRATION_DB_RUNTIME,
);

let runtime = null;

try {
  ensureBuildArtifacts();
  runtime = await startFreshPostgres();

  const migrationEnv = {
    ...process.env,
    NODE_ENV: 'development',
    PERSISTENCE_DRIVER: 'postgres',
    DATABASE_URL: runtime.databaseUrl,
    DATABASE_SSL: 'false',
    DATABASE_SCHEMA: '',
  };

  const initialStatus = runMigrationCommand(['--status'], migrationEnv);
  assertStatus(initialStatus, {
    expectedAppliedCount: 0,
    expectPending: true,
    context: 'initial status',
  });

  const firstApply = runMigrationCommand([], migrationEnv);
  if (firstApply.appliedCount <= 0) {
    throw new Error(
      `Expected a fresh database to apply migrations, but appliedCount was ${firstApply.appliedCount}.`,
    );
  }

  const finalStatus = runMigrationCommand(['--status'], migrationEnv);
  assertStatus(finalStatus, {
    expectedAppliedCount: firstApply.appliedCount,
    expectPending: false,
    context: 'post-apply status',
  });

  const secondApply = runMigrationCommand([], migrationEnv);
  if (secondApply.appliedCount !== 0) {
    throw new Error(
      `Expected migrations to be idempotent on a fresh database, but reapplied ${secondApply.appliedCount}.`,
    );
  }

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        runtime: runtime.mode,
        databaseUrl: redactPassword(runtime.databaseUrl),
        initialPendingCount: initialStatus.pending.length,
        appliedCount: firstApply.appliedCount,
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  if (runtime) {
    await runtime.cleanup();
  }
}

function ensureBuildArtifacts() {
  if (process.env.ESCROW4337_SKIP_API_BUILD === '1') {
    if (!existsSync(migrationRunnerPath)) {
      throw new Error(
        `Expected built migration runner at ${migrationRunnerPath}, but it was not found.`,
      );
    }
    return;
  }

  runCommand('pnpm', ['--filter', 'escrow4334-api', 'build'], {
    description: 'build API migration runner',
  });
}

function buildDatabaseUrl(input) {
  const user = encodeURIComponent(input.user);
  const password = input.password
    ? `:${encodeURIComponent(input.password)}`
    : '';
  return `postgresql://${user}${password}@${input.host}:${input.port}/${input.database}`;
}

function redactPassword(databaseUrlToRedact) {
  return databaseUrlToRedact.replace(/:([^:@/]+)@/, ':***@');
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: options.env ?? process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(
      `${options.description ?? 'command'} failed with exit code ${result.status}: ${command} ${args.join(' ')}`,
    );
  }
}

function runMigrationCommand(extraArgs, env) {
  const result = spawnSync(
    process.execPath,
    [migrationRunnerPath, ...extraArgs],
    {
      cwd: apiRoot,
      env,
      encoding: 'utf8',
    },
  );

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `Migration runner failed with exit code ${result.status}.`,
    );
  }

  const trimmed = result.stdout.trim();
  if (!trimmed) {
    throw new Error('Migration runner returned no JSON output.');
  }

  return JSON.parse(trimmed);
}

async function startFreshPostgres() {
  if (runtimePreference === 'native') {
    return startNativePostgres();
  }

  if (runtimePreference === 'docker') {
    return startDockerPostgres();
  }

  if (canStartNativePostgres()) {
    return startNativePostgres();
  }

  return startDockerPostgres();
}

function assertStatus(
  status,
  { expectedAppliedCount, expectPending, context },
) {
  if (!Array.isArray(status.applied) || !Array.isArray(status.pending)) {
    throw new Error(`Unexpected migration status shape during ${context}.`);
  }

  if (status.applied.length !== expectedAppliedCount) {
    throw new Error(
      `Unexpected applied migration count during ${context}: expected ${expectedAppliedCount}, received ${status.applied.length}.`,
    );
  }

  if (status.total !== status.applied.length + status.pending.length) {
    throw new Error(
      `Migration total mismatch during ${context}: total=${status.total}, applied=${status.applied.length}, pending=${status.pending.length}.`,
    );
  }

  if (expectPending && status.pending.length === 0) {
    throw new Error(`Expected pending migrations during ${context}, found none.`);
  }

  if (!expectPending && status.pending.length !== 0) {
    throw new Error(
      `Expected no pending migrations during ${context}, found ${status.pending.length}.`,
    );
  }
}

function normalizeRuntimePreference(value) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === 'auto') {
    return 'auto';
  }

  if (normalized === 'native' || normalized === 'docker') {
    return normalized;
  }

  throw new Error(
    'ESCROW4337_MIGRATION_DB_RUNTIME must be one of auto, native, or docker.',
  );
}

function canStartNativePostgres() {
  return (
    hasCommand('initdb') &&
    hasCommand('pg_ctl') &&
    hasCommand('psql')
  );
}

function hasCommand(command) {
  const result = spawnSync('sh', ['-c', `command -v ${command}`], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

async function startNativePostgres() {
  const tempRoot = mkdtempSync(resolve(tmpdir(), 'escrow4337-postgres-'));
  const dataDir = resolve(tempRoot, 'data');
  const logPath = resolve(tempRoot, 'postgres.log');
  const adminUrl = buildDatabaseUrl({
    user: databaseUser,
    password: '',
    host: '127.0.0.1',
    port,
    database: 'postgres',
  });
  const databaseUrl = buildDatabaseUrl({
    user: databaseUser,
    password: '',
    host: '127.0.0.1',
    port,
    database: databaseName,
  });

  try {
    runCommand(
      'initdb',
      ['-D', dataDir, '--username', databaseUser, '--auth', 'trust'],
      {
        description: 'initialize native Postgres cluster',
      },
    );
    runCommand(
      'pg_ctl',
      ['-D', dataDir, '-l', logPath, '-o', `-p ${port} -h 127.0.0.1`, 'start'],
      {
        description: 'start native Postgres cluster',
      },
    );
    await waitForPostgres(adminUrl);
    await createDatabase(adminUrl, databaseName);

    return {
      mode: 'native',
      databaseUrl,
      cleanup: async () => {
        runCommand(
          'pg_ctl',
          ['-D', dataDir, 'stop', '-m', 'immediate'],
          {
            description: 'stop native Postgres cluster',
            allowFailure: true,
          },
        );
        rmSync(tempRoot, { recursive: true, force: true });
      },
    };
  } catch (error) {
    runCommand(
      'pg_ctl',
      ['-D', dataDir, 'stop', '-m', 'immediate'],
      {
        description: 'stop native Postgres cluster after failure',
        allowFailure: true,
      },
    );
    rmSync(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

async function startDockerPostgres() {
  const composeArgs = ['compose', '--project-name', composeProject, '-f', composeFile];
  const composeEnv = {
    ...process.env,
    POSTGRES_CONTAINER_NAME: containerName,
    POSTGRES_DB: databaseName,
    POSTGRES_USER: databaseUser,
    POSTGRES_PASSWORD: databasePassword,
    POSTGRES_PORT: String(port),
  };
  const databaseUrl = buildDatabaseUrl({
    user: databaseUser,
    password: databasePassword,
    host: '127.0.0.1',
    port,
    database: databaseName,
  });

  runCommand('docker', [...composeArgs, 'up', '-d'], {
    env: composeEnv,
    description: 'start disposable Docker Postgres',
  });
  await waitForPostgres(databaseUrl);

  return {
    mode: 'docker',
    databaseUrl,
    cleanup: async () => {
      runCommand(
        'docker',
        [...composeArgs, 'down', '-v', '--remove-orphans'],
        {
          env: composeEnv,
          description: 'tear down disposable Docker Postgres',
          allowFailure: true,
        },
      );
    },
  };
}

async function findFreePort() {
  return new Promise((resolvePort, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to allocate a free port.'));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolvePort(address.port);
      });
    });
  });
}

async function waitForPostgres(connectionString, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    const client = new Client({
      connectionString,
      ssl: false,
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      try {
        await client.end();
      } catch {}
      await sleep(500);
    }
  }

  throw new Error(
    `Timed out waiting for disposable Postgres to become ready.${lastError instanceof Error ? ` Last error: ${lastError.message}` : ''}`,
  );
}

async function createDatabase(adminUrl, targetDatabase) {
  const client = new Client({
    connectionString: adminUrl,
    ssl: false,
  });

  try {
    await client.connect();
    await client.query(`CREATE DATABASE "${targetDatabase}"`);
  } finally {
    await client.end();
  }
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}
