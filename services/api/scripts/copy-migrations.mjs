import { cp, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(scriptDir, '..');
const sourceDir = join(
  packageDir,
  'src',
  'persistence',
  'postgres',
  'migrations',
);
const targetDir = join(
  packageDir,
  'dist',
  'persistence',
  'postgres',
  'migrations',
);

const entries = await readdir(sourceDir);
const sqlFiles = entries.filter((entry) => entry.endsWith('.sql'));

await mkdir(targetDir, { recursive: true });

for (const filename of sqlFiles) {
  await cp(join(sourceDir, filename), join(targetDir, filename));
}
