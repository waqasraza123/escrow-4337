import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import { Injectable } from '@nestjs/common';
import { dirname } from 'path';
import { PersistenceConfigService } from '../../persistence/persistence.config';
import { PostgresDatabaseService } from '../../persistence/postgres/postgres-database.service';
import { OperationsConfigService } from './operations.config';

const daemonAlertStateKey = 'escrow_chain_sync_daemon_alert_state';

export type EscrowChainSyncDaemonAlertSeverity = 'warning' | 'critical';

export type EscrowChainSyncDaemonAlertState = {
  updatedAt: string;
  activeAlertFingerprint: string | null;
  activeAlertSeverity: EscrowChainSyncDaemonAlertSeverity | null;
  activeAlertFirstSentAt: string | null;
  activeAlertLastSentAt: string | null;
  lastRecoverySentAt: string | null;
  lastEvent: 'alert' | 'recovery' | null;
};

@Injectable()
export class EscrowChainSyncDaemonAlertStateService {
  constructor(
    private readonly persistenceConfig: PersistenceConfigService,
    private readonly postgresDatabase: PostgresDatabaseService,
    private readonly operationsConfig: OperationsConfigService,
  ) {}

  async getState(): Promise<EscrowChainSyncDaemonAlertState | null> {
    if (this.persistenceConfig.driver === 'postgres') {
      const result = await this.postgresDatabase.query<{
        snapshotJson: EscrowChainSyncDaemonAlertState;
      }>(
        'SELECT snapshot_json AS "snapshotJson" FROM operations_runtime_state WHERE state_key = $1',
        [daemonAlertStateKey],
      );

      return result.rows[0]?.snapshotJson ?? null;
    }

    return this.readFileState();
  }

  async saveState(
    state: EscrowChainSyncDaemonAlertState,
    now = Date.now(),
  ): Promise<EscrowChainSyncDaemonAlertState> {
    if (this.persistenceConfig.driver === 'postgres') {
      await this.postgresDatabase.query(
        `INSERT INTO operations_runtime_state (state_key, snapshot_json, updated_at_ms)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (state_key)
         DO UPDATE SET snapshot_json = EXCLUDED.snapshot_json, updated_at_ms = EXCLUDED.updated_at_ms`,
        [daemonAlertStateKey, JSON.stringify(state), now],
      );
      return state;
    }

    const filePath = this.operationsConfig.escrowBatchSyncAlertStateFilePath;
    const tempPath = `${filePath}.tmp`;
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(tempPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    await rename(tempPath, filePath);
    return state;
  }

  private async readFileState() {
    try {
      const raw = await readFile(
        this.operationsConfig.escrowBatchSyncAlertStateFilePath,
        'utf8',
      );
      return JSON.parse(raw) as EscrowChainSyncDaemonAlertState;
    } catch {
      return null;
    }
  }
}
