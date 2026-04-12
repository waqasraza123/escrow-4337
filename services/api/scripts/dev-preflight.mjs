import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseDotenv } from 'dotenv';

const maxTcpPort = 65_535;
const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(scriptDir, '..');

function loadApiEnvironment(baseDir = packageDir) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const candidates = ['.env', `.env.${nodeEnv}`, '.env.local'];
  const originalEnvironmentKeys = new Set(Object.keys(process.env));
  const fileManagedKeys = new Set();

  for (const filename of candidates) {
    const path = resolve(baseDir, filename);
    if (!existsSync(path)) {
      continue;
    }

    const parsed = parseDotenv(readFileSync(path));
    for (const [key, value] of Object.entries(parsed)) {
      if (originalEnvironmentKeys.has(key) && !fileManagedKeys.has(key)) {
        continue;
      }

      process.env[key] = value;
      fileManagedKeys.add(key);
    }
  }
}

function parseConfiguredPort(value, envName) {
  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maxTcpPort) {
    throw new Error(`${envName} must be a valid TCP port between 1 and ${maxTcpPort}`);
  }

  return parsed;
}

function readApiPort() {
  const configuredPort = process.env.NEST_API_PORT?.trim();
  if (configuredPort) {
    return parseConfiguredPort(configuredPort, 'NEST_API_PORT');
  }

  const platformPort = process.env.PORT?.trim();
  if (platformPort) {
    return parseConfiguredPort(platformPort, 'PORT');
  }

  throw new Error('NEST_API_PORT or PORT must be set before starting the API');
}

function describePortOwner(port) {
  const result = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], {
    cwd: packageDir,
    encoding: 'utf8',
  });

  if (result.error || result.status !== 0 || !result.stdout.trim()) {
    return null;
  }

  const lines = result.stdout.trim().split('\n');
  if (lines.length < 2) {
    return null;
  }

  const ownerLine = lines[1]?.trim();
  if (!ownerLine) {
    return null;
  }

  const columns = ownerLine.split(/\s+/);
  const command = columns[0] ?? 'unknown';
  const pid = columns[1] ?? 'unknown';
  return { command, pid, detail: ownerLine };
}

async function assertPortAvailable(port) {
  await new Promise((resolvePromise, rejectPromise) => {
    const server = createServer();
    server.unref();

    server.once('error', (error) => {
      rejectPromise(error);
    });

    server.listen(port, () => {
      server.close((closeError) => {
        if (closeError) {
          rejectPromise(closeError);
          return;
        }

        resolvePromise();
      });
    });
  });
}

loadApiEnvironment();

const port = readApiPort();

try {
  await assertPortAvailable(port);
} catch (error) {
  const startupError = error;
  if (typeof startupError === 'object' && startupError && startupError.code === 'EADDRINUSE') {
    const owner = describePortOwner(port);
    const ownerLine = owner
      ? `Current listener: PID ${owner.pid} (${owner.command}).`
      : 'Current listener could not be identified automatically.';

    console.error(
      [
        `API dev preflight failed: port ${port} is already in use.`,
        ownerLine,
        'Stop the other process or choose another API port explicitly.',
        `Override NEST_API_PORT=${port + 1} (or PORT=${port + 1}) for the API if needed.`,
        'If you change the API port, update NEXT_PUBLIC_API_PORT in apps/web and apps/admin to match.',
      ].join('\n'),
    );
    process.exit(1);
  }

  console.error(error);
  process.exit(1);
}
