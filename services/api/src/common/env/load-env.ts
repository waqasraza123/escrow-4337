import { existsSync } from 'fs';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse as parseDotenv } from 'dotenv';

export function loadApiEnvironment(baseDir = process.cwd()) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const candidates = ['.env', `.env.${nodeEnv}`, '.env.local'];
  const originalEnvironmentKeys = new Set(Object.keys(process.env));
  const fileManagedKeys = new Set<string>();

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
