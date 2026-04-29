import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

const envFileCandidates = [
  '.env.cloud.local',
  '.env.e2e.deployed',
  '.env',
];

function readEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }

  const parsed = {};
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    parsed[key] = rawValue
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2');
  }
  return parsed;
}

function buildConfigEnv() {
  const configEnv = {};
  for (const candidate of envFileCandidates.reverse()) {
    Object.assign(configEnv, readEnvFile(resolve(repoRoot, candidate)));
  }
  Object.assign(configEnv, process.env);
  return configEnv;
}

function normalizeBaseUrl(value) {
  return value?.trim().replace(/\/+$/, '') || '';
}

function assertCloudApiBaseUrl(value) {
  const apiBaseUrl = normalizeBaseUrl(value);
  if (!apiBaseUrl) {
    throw new Error(
      [
        'Cloud API URL is required for npm run dev.',
        'Set CLOUD_API_BASE_URL=https://your-deployed-api.example.com in .env.cloud.local or export it in your shell.',
        'Fallback localhost API URLs are intentionally blocked so dev does not connect to local backend services.',
      ].join('\n'),
    );
  }

  let parsed;
  try {
    parsed = new URL(apiBaseUrl);
  } catch {
    throw new Error(`CLOUD_API_BASE_URL must be an absolute URL. Received: ${apiBaseUrl}`);
  }

  const blockedHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
  if (blockedHosts.has(parsed.hostname)) {
    throw new Error(
      `CLOUD_API_BASE_URL must not point at a local backend service. Received: ${apiBaseUrl}`,
    );
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(
      `CLOUD_API_BASE_URL must use https for shared cloud dev. Received: ${apiBaseUrl}`,
    );
  }

  return apiBaseUrl;
}

function assertPortAvailable(port, label) {
  return new Promise((resolvePort, rejectPort) => {
    const server = createServer();
    server.once('error', (error) => {
      rejectPort(
        new Error(
          `${label} dev port ${port} is not available. Stop the process using it or set ${label.toUpperCase()}_DEV_PORT to another port.`,
        ),
      );
    });
    server.once('listening', () => {
      server.close(() => resolvePort());
    });
    server.listen(Number.parseInt(port, 10), '127.0.0.1');
  });
}

function spawnDev(label, cwd, args, env) {
  const child = spawn('pnpm', args, {
    cwd,
    env,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(prefixLines(label, chunk));
  });
  child.stderr.on('data', (chunk) => {
    process.stderr.write(prefixLines(label, chunk));
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    for (const other of children) {
      if (other !== child && !other.killed) {
        other.kill('SIGTERM');
      }
    }
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code === 0 ? 1 : (code ?? 1));
  });

  child.on('error', (error) => {
    console.error(`[${label}] ${error.message}`);
    if (!shuttingDown) {
      shuttingDown = true;
      for (const other of children) {
        if (!other.killed) {
          other.kill('SIGTERM');
        }
      }
      process.exit(1);
    }
  });

  return child;
}

function prefixLines(label, chunk) {
  return chunk
    .toString()
    .split(/(\r?\n)/)
    .map((part) => {
      if (part === '\n' || part === '\r\n' || part.length === 0) {
        return part;
      }
      return `[${label}] ${part}`;
    })
    .join('');
}

let shuttingDown = false;
const children = [];

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    for (const child of children) {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    }
  });
}

async function main() {
  const configEnv = buildConfigEnv();
  const apiBaseUrl = assertCloudApiBaseUrl(
    configEnv.CLOUD_API_BASE_URL ||
      configEnv.NEXT_PUBLIC_API_BASE_URL ||
      configEnv.PLAYWRIGHT_DEPLOYED_API_BASE_URL,
  );

  const webPort = configEnv.WEB_DEV_PORT || '3000';
  const adminPort = configEnv.ADMIN_DEV_PORT || '3001';
  await assertPortAvailable(webPort, 'web');
  await assertPortAvailable(adminPort, 'admin');

  const sharedEnv = {
    ...process.env,
    NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
    NEXT_PUBLIC_API_PORT: '',
    EXPO_PUBLIC_API_BASE_URL: apiBaseUrl,
  };

  console.log(`Cloud API: ${apiBaseUrl}`);
  console.log(`Web: http://localhost:${webPort}`);
  console.log(`Admin: http://localhost:${adminPort}`);
  console.log('Local API service is not started by npm run dev.');

  children.push(
    spawnDev('web', repoRoot, ['--dir', 'apps/web', 'exec', 'next', 'dev', '-p', webPort], sharedEnv),
    spawnDev(
      'admin',
      repoRoot,
      ['--dir', 'apps/admin', 'exec', 'next', 'dev', '-p', adminPort],
      sharedEnv,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
