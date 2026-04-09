import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { PostgresDatabaseService } from '../../persistence/postgres/postgres-database.service';
import { PersistenceConfigService } from '../../persistence/persistence.config';
import { OperationsConfigService } from './operations.config';

export type EscrowChainSyncRunPermit =
  | {
      acquired: true;
      provider: 'local' | 'postgres_advisory';
      release: () => Promise<void>;
    }
  | {
      acquired: false;
      provider: 'postgres_advisory';
      reason: 'lock_unavailable';
    };

@Injectable()
export class EscrowChainSyncRunLockService {
  constructor(
    private readonly persistenceConfig: PersistenceConfigService,
    private readonly postgresDatabase: PostgresDatabaseService,
    private readonly operationsConfig: OperationsConfigService,
  ) {}

  async acquireRunPermit(): Promise<EscrowChainSyncRunPermit> {
    if (this.persistenceConfig.driver !== 'postgres') {
      return {
        acquired: true,
        provider: 'local',
        release: async () => undefined,
      };
    }

    const client = await this.postgresDatabase.connect();

    try {
      const lockResult = await client.query<{ acquired: boolean }>(
        'SELECT pg_try_advisory_lock($1) AS acquired',
        [this.operationsConfig.escrowBatchSyncDaemonLockId],
      );

      if (lockResult.rows[0]?.acquired !== true) {
        client.release();
        return {
          acquired: false,
          provider: 'postgres_advisory',
          reason: 'lock_unavailable',
        };
      }

      return this.createPostgresPermit(client);
    } catch (error) {
      client.release();
      throw error;
    }
  }

  private createPostgresPermit(client: PoolClient): EscrowChainSyncRunPermit {
    let released = false;

    return {
      acquired: true,
      provider: 'postgres_advisory',
      release: async () => {
        if (released) {
          return;
        }

        released = true;

        try {
          await client.query('SELECT pg_advisory_unlock($1)', [
            this.operationsConfig.escrowBatchSyncDaemonLockId,
          ]);
        } finally {
          client.release();
        }
      },
    };
  }
}
