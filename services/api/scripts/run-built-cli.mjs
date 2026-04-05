import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(scriptDir, '..');
const [target, ...args] = process.argv.slice(2);

if (!target) {
  console.error('A built CLI entrypoint path is required.');
  process.exit(1);
}

const entrypoint = resolve(packageDir, target);

if (!existsSync(entrypoint)) {
  console.error(
    `Built entrypoint not found: ${entrypoint}. Run "pnpm --filter escrow4334-api build" first.`,
  );
  process.exit(1);
}

const child = spawn(process.execPath, [entrypoint, ...args], {
  cwd: packageDir,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
