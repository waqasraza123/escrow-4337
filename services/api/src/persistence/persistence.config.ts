import { Injectable } from '@nestjs/common';
import { tmpdir } from 'os';
import { join } from 'path';
import { readRequiredUrl } from '../common/config/readers';
import type { PersistenceDriver } from './persistence.types';

const schemaPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

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
    return readRequiredUrl(process.env.DATABASE_URL, 'DATABASE_URL', null);
  }

  get databaseSsl(): boolean {
    return process.env.DATABASE_SSL === 'true';
  }

  get databaseSchema(): string | null {
    const configuredSchema = process.env.DATABASE_SCHEMA?.trim();
    if (!configuredSchema) {
      return null;
    }

    if (!schemaPattern.test(configuredSchema)) {
      throw new Error(
        'DATABASE_SCHEMA must start with a letter or underscore and contain only letters, numbers, and underscores',
      );
    }

    return configuredSchema;
  }
}
