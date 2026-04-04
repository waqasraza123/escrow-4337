import { existsSync } from 'fs';
import { resolve } from 'path';
import { config as loadDotenv } from 'dotenv';

export function loadApiEnvironment(baseDir = process.cwd()) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const candidates = ['.env', `.env.${nodeEnv}`, '.env.local'];

  for (const filename of candidates) {
    const path = resolve(baseDir, filename);
    if (!existsSync(path)) {
      continue;
    }

    loadDotenv({ path });
  }
}
