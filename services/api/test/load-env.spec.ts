import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadApiEnvironment } from '../src/common/env/load-env';

describe('loadApiEnvironment', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prefers .env.local over lower-precedence env files', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'escrow4337-env-'));

    try {
      writeFileSync(join(baseDir, '.env'), 'DATABASE_URL=postgres://base\n');
      writeFileSync(
        join(baseDir, '.env.development'),
        'DATABASE_URL=postgres://development\n',
      );
      writeFileSync(
        join(baseDir, '.env.local'),
        'DATABASE_URL=postgres://local\n',
      );

      process.env = { ...originalEnv };
      delete process.env.DATABASE_URL;
      delete process.env.NODE_ENV;

      loadApiEnvironment(baseDir);

      expect(process.env.DATABASE_URL).toBe('postgres://local');
    } finally {
      rmSync(baseDir, { recursive: true, force: true });
    }
  });

  it('does not override shell-provided environment variables', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'escrow4337-env-'));

    try {
      writeFileSync(join(baseDir, '.env'), 'DATABASE_URL=postgres://base\n');
      writeFileSync(
        join(baseDir, '.env.local'),
        'DATABASE_URL=postgres://local\n',
      );

      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
        DATABASE_URL: 'postgres://shell',
      };

      loadApiEnvironment(baseDir);

      expect(process.env.DATABASE_URL).toBe('postgres://shell');
    } finally {
      rmSync(baseDir, { recursive: true, force: true });
    }
  });
});
