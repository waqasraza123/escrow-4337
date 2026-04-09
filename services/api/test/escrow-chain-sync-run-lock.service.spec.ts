import type { PoolClient } from 'pg';
import { EscrowChainSyncRunLockService } from '../src/modules/operations/escrow-chain-sync-run-lock.service';
import { OperationsConfigService } from '../src/modules/operations/operations.config';
import { PersistenceConfigService } from '../src/persistence/persistence.config';
import { PostgresDatabaseService } from '../src/persistence/postgres/postgres-database.service';

describe('EscrowChainSyncRunLockService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns a local permit when Postgres persistence is not enabled', async () => {
    process.env.PERSISTENCE_DRIVER = 'file';

    const service = new EscrowChainSyncRunLockService(
      new PersistenceConfigService(),
      {} as PostgresDatabaseService,
      new OperationsConfigService(),
    );

    const permit = await service.acquireRunPermit();

    if (permit.acquired) {
      expect(permit.provider).toBe('local');
      expect(typeof permit.release).toBe('function');
      await expect(permit.release()).resolves.toBeUndefined();
    }
  });

  it('acquires and releases a Postgres advisory lock when available', async () => {
    process.env.PERSISTENCE_DRIVER = 'postgres';
    process.env.DATABASE_URL =
      'postgresql://escrow:escrow@localhost:5432/escrow';
    process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_LOCK_ID = '9001';

    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ acquired: true }] })
      .mockResolvedValueOnce({ rows: [{ unlocked: true }] });
    const release = jest.fn();
    const client = {
      query,
      release,
    } as unknown as PoolClient;
    const postgresDatabase = {
      connect: jest.fn().mockResolvedValue(client),
    } as unknown as PostgresDatabaseService;

    const service = new EscrowChainSyncRunLockService(
      new PersistenceConfigService(),
      postgresDatabase,
      new OperationsConfigService(),
    );

    const permit = await service.acquireRunPermit();

    expect(permit).toMatchObject({
      acquired: true,
      provider: 'postgres_advisory',
    });
    if (!permit.acquired) {
      throw new Error('Expected advisory lock permit');
    }

    await permit.release();

    expect(query).toHaveBeenNthCalledWith(
      1,
      'SELECT pg_try_advisory_lock($1) AS acquired',
      [9001],
    );
    expect(query).toHaveBeenNthCalledWith(2, 'SELECT pg_advisory_unlock($1)', [
      9001,
    ]);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('returns an unavailable permit when another worker holds the Postgres lock', async () => {
    process.env.PERSISTENCE_DRIVER = 'postgres';
    process.env.DATABASE_URL =
      'postgresql://escrow:escrow@localhost:5432/escrow';

    const query = jest.fn().mockResolvedValue({ rows: [{ acquired: false }] });
    const release = jest.fn();
    const client = {
      query,
      release,
    } as unknown as PoolClient;
    const postgresDatabase = {
      connect: jest.fn().mockResolvedValue(client),
    } as unknown as PostgresDatabaseService;

    const service = new EscrowChainSyncRunLockService(
      new PersistenceConfigService(),
      postgresDatabase,
      new OperationsConfigService(),
    );

    const permit = await service.acquireRunPermit();

    expect(permit).toEqual({
      acquired: false,
      provider: 'postgres_advisory',
      reason: 'lock_unavailable',
    });
    expect(release).toHaveBeenCalledTimes(1);
  });
});
