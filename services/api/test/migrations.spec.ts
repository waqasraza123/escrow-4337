import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  listMigrationFilenames,
  resolveMigrationsDir,
} from '../src/persistence/postgres/migrations';

describe('migrations helpers', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'escrow4337-migrations-'));
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('prefers runtime-relative migrations when they are present', async () => {
    const runtimeDir = join(tempDir, 'runtime');
    const runtimeMigrationsDir = join(runtimeDir, 'migrations');
    await mkdir(runtimeMigrationsDir, { recursive: true });

    expect(resolveMigrationsDir(tempDir, runtimeDir)).toBe(
      runtimeMigrationsDir,
    );
  });

  it('falls back to dist migrations when the runtime-relative directory is absent', async () => {
    const runtimeDir = join(tempDir, 'runtime');
    const distMigrationsDir = join(
      tempDir,
      'dist',
      'persistence',
      'postgres',
      'migrations',
    );
    await mkdir(distMigrationsDir, { recursive: true });

    expect(resolveMigrationsDir(tempDir, runtimeDir)).toBe(distMigrationsDir);
  });

  it('lists sorted sql migrations from the resolved directory', async () => {
    const runtimeDir = join(tempDir, 'runtime');
    const runtimeMigrationsDir = join(runtimeDir, 'migrations');
    await mkdir(runtimeMigrationsDir, { recursive: true });
    await writeFile(join(runtimeMigrationsDir, '002-second.sql'), '-- 2');
    await writeFile(join(runtimeMigrationsDir, 'README.md'), 'ignore');
    await writeFile(join(runtimeMigrationsDir, '001-first.sql'), '-- 1');

    await expect(listMigrationFilenames(tempDir, runtimeDir)).resolves.toEqual([
      '001-first.sql',
      '002-second.sql',
    ]);
  });
});
