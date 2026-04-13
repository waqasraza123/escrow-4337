import { EmailConfigService } from '../src/modules/auth/email/email.config';
import { EscrowContractConfigService } from '../src/modules/escrow/onchain/escrow-contract.config';
import { EscrowChainSyncDaemonDeploymentService } from '../src/modules/operations/escrow-chain-sync-daemon-deployment.service';
import { RuntimeProfileService } from '../src/modules/operations/runtime-profile.service';
import { PersistenceConfigService } from '../src/persistence/persistence.config';
import { SmartAccountConfigService } from '../src/modules/wallet/provisioning/smart-account.config';
import { OperationsConfigService } from '../src/modules/operations/operations.config';
import type { EscrowChainIngestionStatus } from '../src/modules/operations/escrow-health.types';

describe('RuntimeProfileService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function createIngestionStatus(
    overrides: Partial<EscrowChainIngestionStatus> = {},
  ): EscrowChainIngestionStatus {
    return {
      generatedAt: '2026-04-12T00:00:00.000Z',
      enabled: true,
      authorityReadsEnabled: false,
      chainId: 84532,
      contractAddress: '0x1111111111111111111111111111111111111111',
      confirmations: 6,
      batchBlocks: 1000,
      resyncBlocks: 20,
      latestBlock: 100,
      finalizedBlock: 94,
      lagBlocks: 0,
      cursor: {
        chainId: 84532,
        contractAddress: '0x1111111111111111111111111111111111111111',
        streamName: 'workstream_escrow',
        nextFromBlock: 95,
        lastFinalizedBlock: 94,
        lastScannedBlock: 94,
        lastError: null,
        updatedAt: 1_700_000_000_000,
      },
      projections: {
        totalJobs: 0,
        projectedJobs: 0,
        healthyJobs: 0,
        degradedJobs: 0,
        staleJobs: 0,
      },
      status: 'ok',
      summary: 'Escrow chain ingestion is healthy.',
      issues: [],
      warnings: [],
      ...overrides,
    };
  }

  function createService(ingestionStatus = createIngestionStatus()) {
    return new RuntimeProfileService(
      new EmailConfigService(),
      new EscrowContractConfigService(),
      new PersistenceConfigService(),
      new SmartAccountConfigService(),
      new EscrowChainSyncDaemonDeploymentService(
        new OperationsConfigService(),
        new PersistenceConfigService(),
      ),
      {
        getStatus: jest.fn().mockResolvedValue(ingestionStatus),
      } as never,
    );
  }

  it('reports a deployment-like profile when Postgres and all relay providers are configured', async () => {
    process.env.NODE_ENV = 'production';
    process.env.PERSISTENCE_DRIVER = 'postgres';
    process.env.DATABASE_URL =
      'postgresql://escrow:escrow@localhost:5432/escrow';
    process.env.AUTH_EMAIL_MODE = 'relay';
    process.env.AUTH_EMAIL_FROM_EMAIL = 'ops@example.com';
    process.env.AUTH_EMAIL_RELAY_BASE_URL = 'https://email.example.com';
    process.env.WALLET_SMART_ACCOUNT_MODE = 'relay';
    process.env.WALLET_SMART_ACCOUNT_CHAIN_ID = '84532';
    process.env.WALLET_SMART_ACCOUNT_ENTRY_POINT_ADDRESS =
      '0x00000061FEfce24A79343c27127435286BB7A4E1';
    process.env.WALLET_SMART_ACCOUNT_FACTORY_ADDRESS =
      '0x3333333333333333333333333333333333333333';
    process.env.WALLET_SMART_ACCOUNT_BUNDLER_URL =
      'https://bundler.example.com';
    process.env.WALLET_SMART_ACCOUNT_RELAY_BASE_URL =
      'https://wallet.example.com';
    process.env.WALLET_SMART_ACCOUNT_PAYMASTER_URL =
      'https://paymaster.example.com';
    process.env.ESCROW_CONTRACT_MODE = 'relay';
    process.env.ESCROW_CHAIN_ID = '84532';
    process.env.ESCROW_CONTRACT_ADDRESS =
      '0x1111111111111111111111111111111111111111';
    process.env.ESCROW_ARBITRATOR_ADDRESS =
      '0x2222222222222222222222222222222222222222';
    process.env.ESCROW_RELAY_BASE_URL = 'https://escrow.example.com';
    process.env.NEST_API_CORS_ORIGINS =
      'https://web.example.com,https://admin.example.com';

    const profile = await createService().getProfile();

    expect(profile.profile).toBe('deployment-like');
    expect(profile.environment.corsOrigins).toEqual([
      'https://web.example.com',
      'https://admin.example.com',
    ]);
    expect(profile.operator.arbitratorAddress).toBe(
      '0x2222222222222222222222222222222222222222',
    );
    expect(profile.operator.exportSupport).toBe(true);
    expect(profile.operations.chainIngestion).toMatchObject({
      enabled: true,
      status: 'ok',
      authorityReadsEnabled: false,
      confirmationDepth: 6,
    });
    expect(profile.operations.chainSyncDaemon).toMatchObject({
      status: 'ok',
      required: false,
      rpcConfigured: false,
      alertingConfigured: false,
      lockProvider: 'postgres_advisory',
    });
    expect(profile.warnings).toEqual([]);
  });

  it('reports a local-mock profile with explicit warnings for development defaults', async () => {
    process.env.NODE_ENV = 'development';
    process.env.PERSISTENCE_DRIVER = 'postgres';
    process.env.DATABASE_URL =
      'postgresql://escrow:escrow@localhost:5432/escrow';
    process.env.AUTH_EMAIL_MODE = 'mock';
    process.env.AUTH_EMAIL_FROM_EMAIL = 'ops@example.com';
    process.env.WALLET_SMART_ACCOUNT_MODE = 'mock';
    process.env.WALLET_SMART_ACCOUNT_CHAIN_ID = '84532';
    process.env.WALLET_SMART_ACCOUNT_ENTRY_POINT_ADDRESS =
      '0x00000061FEfce24A79343c27127435286BB7A4E1';
    process.env.WALLET_SMART_ACCOUNT_FACTORY_ADDRESS =
      '0x3333333333333333333333333333333333333333';
    process.env.ESCROW_CONTRACT_MODE = 'mock';
    process.env.ESCROW_CHAIN_ID = '84532';
    process.env.ESCROW_CONTRACT_ADDRESS =
      '0x1111111111111111111111111111111111111111';
    process.env.ESCROW_ARBITRATOR_ADDRESS =
      '0x2222222222222222222222222222222222222222';
    process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_REQUIRED = 'true';
    process.env.OPERATIONS_ESCROW_BATCH_SYNC_SCHEDULE_INTERVAL_SEC = '300';
    process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_MAX_HEARTBEAT_AGE_SEC =
      '300';

    const profile = await createService(
      createIngestionStatus({
        status: 'warning',
        summary: 'Escrow chain ingestion has not published a cursor yet.',
        warnings: ['Escrow chain ingestion has not published a cursor yet.'],
        cursor: null,
      }),
    ).getProfile();

    expect(profile.profile).toBe('local-mock');
    expect(profile.operations.chainSyncDaemon.status).toBe('failed');
    expect(profile.operations.chainIngestion.status).toBe('warning');
    expect(profile.warnings).toContain(
      'Auth email delivery is using mock mode, so OTP behavior is not exercising a deployed relay.',
    );
    expect(profile.warnings).toContain(
      'Escrow chain ingestion has not published a cursor yet.',
    );
    expect(profile.warnings).toContain(
      'Recurring chain sync is required, but OPERATIONS_ESCROW_RPC_URL or ESCROW_CHAIN_RPC_URL is not set.',
    );
    expect(profile.warnings).toContain(
      'No browser CORS origins are configured. Separate frontend origins may fail against this backend profile.',
    );
  });
});
