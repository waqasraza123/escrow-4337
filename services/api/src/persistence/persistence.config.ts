import { Injectable } from '@nestjs/common';
import { tmpdir } from 'os';
import { join } from 'path';
import type { PersistenceDriver } from './persistence.types';

@Injectable()
export class PersistenceConfigService {
  get driver(): PersistenceDriver {
    const configuredDriver =
      process.env.PERSISTENCE_DRIVER?.trim().toLowerCase();
    if (configuredDriver === 'file') {
      return 'file';
    }
    return 'postgres';
  }

  get filePath(): string {
    const configuredPath = process.env.PERSISTENCE_FILE_PATH?.trim();
    if (configuredPath) {
      return configuredPath;
    }

    return join(tmpdir(), `escrow4337-api-${process.pid}.json`);
  }

  get databaseUrl(): string {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL must be set when PERSISTENCE_DRIVER=postgres',
      );
    }
    return databaseUrl;
  }

  get databaseSsl(): boolean {
    return process.env.DATABASE_SSL === 'true';
  }
}
