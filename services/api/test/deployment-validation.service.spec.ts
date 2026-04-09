import { readdirSync } from 'fs';
import { join } from 'path';
import { AuthConfigService } from '../src/modules/auth/auth.config';
import { EmailConfigService } from '../src/modules/auth/email/email.config';
import { EscrowContractConfigService } from '../src/modules/escrow/onchain/escrow-contract.config';
import { EscrowChainSyncDaemonDeploymentService } from '../src/modules/operations/escrow-chain-sync-daemon-deployment.service';
import { EscrowChainSyncDaemonMonitoringService } from '../src/modules/operations/escrow-chain-sync-daemon-monitoring.service';
import { DeploymentValidationService } from '../src/modules/operations/deployment-validation.service';
import { OperationsConfigService } from '../src/modules/operations/operations.config';
import { PersistenceConfigService } from '../src/persistence/persistence.config';
import { SmartAccountConfigService } from '../src/modules/wallet/provisioning/smart-account.config';

describe('DeploymentValidationService', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'test_jwt_secret_for_integration_123';
    process.env.DATABASE_URL =
      'postgresql://escrow:escrow@localhost:5432/escrow';
    process.env.AUTH_EMAIL_MODE = 'relay';
    process.env.AUTH_EMAIL_FROM_EMAIL = 'no-reply@example.com';
    process.env.AUTH_EMAIL_RELAY_BASE_URL = 'https://email.example.com';
    process.env.WALLET_SMART_ACCOUNT_MODE = 'relay';
    process.env.WALLET_SMART_ACCOUNT_CHAIN_ID = '84532';
    process.env.WALLET_SMART_ACCOUNT_ENTRY_POINT_ADDRESS =
      '0x00000061FEfce24A79343c27127435286BB7A4E1';
    process.env.WALLET_SMART_ACCOUNT_FACTORY_ADDRESS =
      '0x3333333333333333333333333333333333333333';
    process.env.WALLET_SMART_ACCOUNT_BUNDLER_URL =
      'https://bundler.example.com';
    process.env.WALLET_SMART_ACCOUNT_PAYMASTER_URL =
      'https://paymaster.example.com';
    process.env.WALLET_SMART_ACCOUNT_RELAY_BASE_URL =
      'https://relay.example.com';
    process.env.ESCROW_CONTRACT_MODE = 'relay';
    process.env.ESCROW_CHAIN_ID = '84532';
    process.env.ESCROW_CONTRACT_ADDRESS =
      '0x1111111111111111111111111111111111111111';
    process.env.ESCROW_ARBITRATOR_ADDRESS =
      '0x2222222222222222222222222222222222222222';
    process.env.ESCROW_RELAY_BASE_URL = 'https://escrow.example.com';
    process.env.NEST_API_TRUST_PROXY = 'loopback';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  it('reports a green deployment validation result when configuration and probes pass', async () => {
    const fetchMock = jest.mocked(global.fetch);
    fetchMock.mockImplementation((input) => {
      const url = resolveFetchInput(input);
      if (url === 'https://bundler.example.com') {
        return Promise.resolve(jsonResponse({ result: '0x14a34' }));
      }
      if (url === 'https://paymaster.example.com') {
        return Promise.resolve(jsonResponse({ result: '0x14a34' }));
      }
      return Promise.resolve(new Response('', { status: 200 }));
    });

    const service = createService(allMigrationsAppliedQuery());
    const report = await service.runValidation();

    expect(report.ok).toBe(true);
    expect(report.checks.find((check) => check.id === 'database')).toEqual(
      expect.objectContaining({
        status: 'ok',
      }),
    );
    expect(report.checks.find((check) => check.id === 'bundler')).toEqual(
      expect.objectContaining({
        status: 'ok',
      }),
    );
    expect(report.checks.find((check) => check.id === 'paymaster')).toEqual(
      expect.objectContaining({
        status: 'ok',
      }),
    );
  });

  it('fails when migrations are pending and warns when the paymaster does not expose eth_chainId', async () => {
    const fetchMock = jest.mocked(global.fetch);
    fetchMock.mockImplementation((input) => {
      const url = resolveFetchInput(input);
      if (url === 'https://bundler.example.com') {
        return Promise.resolve(jsonResponse({ result: '0x14a34' }));
      }
      if (url === 'https://paymaster.example.com') {
        return Promise.resolve(
          jsonResponse({
            error: {
              code: -32601,
              message: 'Method not found',
            },
          }),
        );
      }
      return Promise.resolve(new Response('', { status: 200 }));
    });

    const service = createService(pendingMigrationQuery());
    const report = await service.runValidation();

    expect(report.ok).toBe(false);
    expect(report.checks.find((check) => check.id === 'database')).toEqual(
      expect.objectContaining({
        status: 'failed',
      }),
    );
    expect(report.checks.find((check) => check.id === 'paymaster')).toEqual(
      expect.objectContaining({
        status: 'warning',
      }),
    );
  });

  it('returns a structured failed report instead of crashing when required config is missing', async () => {
    delete process.env.DATABASE_URL;
    delete process.env.AUTH_EMAIL_RELAY_BASE_URL;

    const service = createService(allMigrationsAppliedQuery());
    const report = await service.runValidation();

    expect(report.ok).toBe(false);
    expect(
      report.checks.find((check) => check.id === 'persistence-config'),
    ).toEqual(
      expect.objectContaining({
        status: 'failed',
        details: 'DATABASE_URL must be set',
      }),
    );
    expect(report.checks.find((check) => check.id === 'database')).toEqual(
      expect.objectContaining({
        status: 'skipped',
        metadata: {
          blockedBy: 'persistence-config',
        },
      }),
    );
    expect(report.checks.find((check) => check.id === 'email-config')).toEqual(
      expect.objectContaining({
        status: 'failed',
        details: 'AUTH_EMAIL_RELAY_BASE_URL must be set',
      }),
    );
    expect(report.checks.find((check) => check.id === 'email-relay')).toEqual(
      expect.objectContaining({
        status: 'skipped',
        metadata: {
          blockedBy: 'email-config',
        },
      }),
    );
  });

  it('fails deployment validation when required recurring chain-sync orchestration is misconfigured', async () => {
    process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_REQUIRED = 'true';
    process.env.OPERATIONS_ESCROW_BATCH_SYNC_SCHEDULE_INTERVAL_SEC = '300';
    process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_MAX_HEARTBEAT_AGE_SEC =
      '300';
    delete process.env.OPERATIONS_ESCROW_RPC_URL;
    delete process.env.ESCROW_CHAIN_RPC_URL;
    delete process.env.OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_WEBHOOK_URL;

    const service = createService(allMigrationsAppliedQuery());
    const report = await service.runValidation();

    expect(report.ok).toBe(false);
    expect(
      report.checks.find((check) => check.id === 'chain-sync-daemon-config'),
    ).toEqual(
      expect.objectContaining({
        status: 'failed',
        summary:
          'Recurring chain-sync daemon deployment posture is misconfigured.',
        metadata: expect.objectContaining({
          required: true,
          rpcConfigured: false,
          alertingConfigured: false,
        }),
      }),
    );
  });

  it('allows a zero-cost local development profile to validate runtime configuration', () => {
    process.env.NODE_ENV = 'development';
    process.env.AUTH_EMAIL_MODE = 'mock';
    delete process.env.AUTH_EMAIL_RELAY_BASE_URL;
    process.env.WALLET_SMART_ACCOUNT_MODE = 'mock';
    delete process.env.WALLET_SMART_ACCOUNT_ENTRY_POINT_ADDRESS;
    delete process.env.WALLET_SMART_ACCOUNT_FACTORY_ADDRESS;
    delete process.env.WALLET_SMART_ACCOUNT_BUNDLER_URL;
    delete process.env.WALLET_SMART_ACCOUNT_RELAY_BASE_URL;
    delete process.env.WALLET_SMART_ACCOUNT_PAYMASTER_URL;
    process.env.ESCROW_CONTRACT_MODE = 'mock';
    delete process.env.ESCROW_CONTRACT_ADDRESS;
    delete process.env.ESCROW_ARBITRATOR_ADDRESS;
    delete process.env.ESCROW_RELAY_BASE_URL;

    const service = createService(allMigrationsAppliedQuery());

    expect(() => service.assertRuntimeConfiguration()).not.toThrow();
  });

  function createService(
    query: (text: string) => Promise<{ rows: Record<string, unknown>[] }>,
  ) {
    return new DeploymentValidationService(
      new AuthConfigService(),
      new EmailConfigService(),
      new EscrowContractConfigService(),
      new PersistenceConfigService(),
      { query } as never,
      new SmartAccountConfigService(),
      new EscrowChainSyncDaemonDeploymentService(
        new OperationsConfigService(),
        new PersistenceConfigService(),
      ),
      {
        getReport: jest.fn().mockResolvedValue({
          generatedAt: '2026-04-09T00:00:00.000Z',
          ok: true,
          status: 'ok',
          required: false,
          summary: 'Recurring chain-sync daemon is healthy on worker worker-1.',
          thresholds: {
            maxHeartbeatAgeMs: 900_000,
            maxCurrentRunAgeMs: 1_800_000,
            maxConsecutiveFailures: 3,
            maxConsecutiveSkips: 6,
          },
          issues: [],
          daemon: null,
        }),
      } as unknown as EscrowChainSyncDaemonMonitoringService,
    );
  }

  function allMigrationsAppliedQuery() {
    return (text: string) => {
      if (text.includes('current_database()')) {
        return Promise.resolve({
          rows: [{ currentDatabase: 'escrow' }],
        });
      }

      if (text.includes("to_regclass('public.schema_migrations')")) {
        return Promise.resolve({
          rows: [{ relationName: 'schema_migrations' }],
        });
      }

      if (text.includes('SELECT name FROM schema_migrations')) {
        return Promise.resolve({
          rows: migrationRows(),
        });
      }

      return Promise.reject(new Error(`Unexpected query: ${text}`));
    };
  }

  function pendingMigrationQuery() {
    return (text: string) => {
      if (text.includes('current_database()')) {
        return Promise.resolve({
          rows: [{ currentDatabase: 'escrow' }],
        });
      }

      if (text.includes("to_regclass('public.schema_migrations')")) {
        return Promise.resolve({
          rows: [{ relationName: 'schema_migrations' }],
        });
      }

      if (text.includes('SELECT name FROM schema_migrations')) {
        return Promise.resolve({
          rows: migrationRows().slice(0, -1),
        });
      }

      return Promise.reject(new Error(`Unexpected query: ${text}`));
    };
  }

  function migrationRows() {
    return readdirSync(
      join(process.cwd(), 'src', 'persistence', 'postgres', 'migrations'),
    )
      .filter((name) => name.endsWith('.sql'))
      .sort()
      .map((name) => ({ name }));
  }

  function jsonResponse(body: Record<string, unknown>) {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  function resolveFetchInput(input: RequestInfo | URL) {
    if (typeof input === 'string') {
      return input;
    }

    if (input instanceof URL) {
      return input.toString();
    }

    return input.url;
  }
});
