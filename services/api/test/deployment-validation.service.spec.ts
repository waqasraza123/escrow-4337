import { readdirSync } from 'fs';
import { join } from 'path';
import { AuthConfigService } from '../src/modules/auth/auth.config';
import { EmailConfigService } from '../src/modules/auth/email/email.config';
import { EscrowContractConfigService } from '../src/modules/escrow/onchain/escrow-contract.config';
import { EscrowChainSyncDaemonDeploymentService } from '../src/modules/operations/escrow-chain-sync-daemon-deployment.service';
import { EscrowChainSyncDaemonMonitoringService } from '../src/modules/operations/escrow-chain-sync-daemon-monitoring.service';
import { DeploymentValidationService } from '../src/modules/operations/deployment-validation.service';
import type { DeploymentCheck } from '../src/modules/operations/deployment-validation.types';
import { OperationsConfigService } from '../src/modules/operations/operations.config';
import { PersistenceConfigService } from '../src/persistence/persistence.config';
import { SmartAccountConfigService } from '../src/modules/wallet/provisioning/smart-account.config';

describe('DeploymentValidationService', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'production';
    process.env.NEST_API_PORT = '4100';
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
    process.env.NEST_API_CORS_ORIGINS =
      'https://web.example.com,https://admin.example.com';
    process.env.PLAYWRIGHT_DEPLOYED_WEB_BASE_URL = 'https://web.example.com';
    process.env.PLAYWRIGHT_DEPLOYED_ADMIN_BASE_URL =
      'https://admin.example.com';
    process.env.PLAYWRIGHT_DEPLOYED_API_BASE_URL = 'https://api.example.com';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  function findCheck(
    checks: DeploymentCheck[],
    id: string,
  ): DeploymentCheck | undefined {
    return checks.find((check) => check.id === id);
  }

  it('reports a green deployment validation result when configuration and probes pass', async () => {
    const fetchMock = jest.mocked(global.fetch);
    fetchMock.mockImplementation((input, init) => {
      const url = resolveFetchInput(input);
      if (url === 'https://email.example.com/email/send') {
        expect(init?.method).toBe('POST');
        expect(readHeader(init?.headers, 'x-api-key')).toBeNull();
        return Promise.resolve(new Response('', { status: 400 }));
      }
      if (
        url === 'https://relay.example.com/wallets/smart-accounts/provision'
      ) {
        expect(init?.method).toBe('POST');
        expect(readHeader(init?.headers, 'x-api-key')).toBeNull();
        return Promise.resolve(new Response('', { status: 400 }));
      }
      if (url === 'https://escrow.example.com/escrow/execute') {
        expect(init?.method).toBe('POST');
        expect(readHeader(init?.headers, 'x-api-key')).toBeNull();
        return Promise.resolve(new Response('', { status: 400 }));
      }
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
    expect(findCheck(report.checks, 'database')?.status).toBe('ok');
    expect(findCheck(report.checks, 'bundler')?.status).toBe('ok');
    expect(findCheck(report.checks, 'email-relay-auth')?.status).toBe('ok');
    expect(findCheck(report.checks, 'smart-account-relay-auth')?.status).toBe(
      'ok',
    );
    expect(findCheck(report.checks, 'escrow-relay-auth')?.status).toBe('ok');
    expect(findCheck(report.checks, 'paymaster')?.status).toBe('ok');
  });

  it('uses authenticated provider validation URL overrides when they are configured', async () => {
    process.env.AUTH_EMAIL_RELAY_VALIDATION_URL =
      'https://email.example.com/custom/email-check';
    process.env.WALLET_SMART_ACCOUNT_RELAY_VALIDATION_URL =
      'https://relay.example.com/custom/provision-check';
    process.env.ESCROW_RELAY_VALIDATION_URL =
      'https://escrow.example.com/custom/execute-check';

    const fetchMock = jest.mocked(global.fetch);
    fetchMock.mockImplementation((input) => {
      const url = resolveFetchInput(input);
      if (
        url === 'https://email.example.com/custom/email-check' ||
        url === 'https://relay.example.com/custom/provision-check' ||
        url === 'https://escrow.example.com/custom/execute-check'
      ) {
        return Promise.resolve(new Response('', { status: 400 }));
      }
      if (
        url === 'https://email.example.com/email/send' ||
        url === 'https://relay.example.com/wallets/smart-accounts/provision' ||
        url === 'https://escrow.example.com/escrow/execute'
      ) {
        throw new Error(
          `Default validation route should not be called: ${url}`,
        );
      }
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
    const emailCheck = findCheck(report.checks, 'email-relay-auth');
    const smartAccountCheck = findCheck(
      report.checks,
      'smart-account-relay-auth',
    );
    const escrowCheck = findCheck(report.checks, 'escrow-relay-auth');
    expect(emailCheck?.status).toBe('ok');
    expect(emailCheck?.metadata).toMatchObject({
      url: 'https://email.example.com/custom/email-check',
    });
    expect(smartAccountCheck?.status).toBe('ok');
    expect(smartAccountCheck?.metadata).toMatchObject({
      url: 'https://relay.example.com/custom/provision-check',
    });
    expect(escrowCheck?.status).toBe('ok');
    expect(escrowCheck?.metadata).toMatchObject({
      url: 'https://escrow.example.com/custom/execute-check',
    });
  });

  it('fails when migrations are pending and warns when the paymaster does not expose eth_chainId', async () => {
    const fetchMock = jest.mocked(global.fetch);
    fetchMock.mockImplementation((input) => {
      const url = resolveFetchInput(input);
      if (
        url === 'https://email.example.com/email/send' ||
        url === 'https://relay.example.com/wallets/smart-accounts/provision' ||
        url === 'https://escrow.example.com/escrow/execute'
      ) {
        return Promise.resolve(new Response('', { status: 400 }));
      }
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
    expect(findCheck(report.checks, 'database')?.status).toBe('failed');
    expect(findCheck(report.checks, 'paymaster')?.status).toBe('warning');
  });

  it('fails deployment validation when an authenticated relay route rejects credentials', async () => {
    process.env.AUTH_EMAIL_RELAY_API_KEY = 'email-key';

    const fetchMock = jest.mocked(global.fetch);
    fetchMock.mockImplementation((input, init) => {
      const url = resolveFetchInput(input);
      if (url === 'https://email.example.com/email/send') {
        expect(readHeader(init?.headers, 'x-api-key')).toBe('email-key');
        return Promise.resolve(new Response('', { status: 401 }));
      }
      if (
        url === 'https://relay.example.com/wallets/smart-accounts/provision'
      ) {
        return Promise.resolve(new Response('', { status: 400 }));
      }
      if (url === 'https://escrow.example.com/escrow/execute') {
        return Promise.resolve(new Response('', { status: 400 }));
      }
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

    expect(report.ok).toBe(false);
    expect(
      report.checks.find((check) => check.id === 'email-relay-auth'),
    ).toEqual(
      expect.objectContaining({
        status: 'failed',
        details: 'Authenticated route rejected credentials with 401',
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
    const chainSyncCheck = report.checks.find(
      (check) => check.id === 'chain-sync-daemon-config',
    );

    expect(report.ok).toBe(false);
    expect(chainSyncCheck).toBeDefined();
    expect(chainSyncCheck?.status).toBe('failed');
    expect(chainSyncCheck?.summary).toBe(
      'Recurring chain-sync daemon deployment posture is misconfigured.',
    );
    expect(chainSyncCheck?.metadata).toMatchObject({
      required: true,
      rpcConfigured: false,
      alertingConfigured: false,
    });
  });

  it('allows a zero-cost local development profile to validate runtime configuration', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEST_API_PORT = '4100';
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

  it('enforces staging browser target and CORS alignment when a staging deployment target is set', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DEPLOYMENT_TARGET_ENVIRONMENT = 'staging';
    delete process.env.NEST_API_CORS_ORIGINS;

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

    expect(report.ok).toBe(false);
    expect(report.environment.targetEnvironment).toBe('staging');
    expect(report.environment.strictValidation).toBe(true);
    expect(
      report.checks.find((check) => check.id === 'deployed-browser-targets'),
    ).toEqual(
      expect.objectContaining({
        status: 'ok',
      }),
    );
    expect(
      report.checks.find((check) => check.id === 'deployed-browser-cors'),
    ).toEqual(
      expect.objectContaining({
        status: 'failed',
        details:
          'NEST_API_CORS_ORIGINS must include deployed browser origins: https://web.example.com, https://admin.example.com',
      }),
    );
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
          ingestion: null,
          daemon: null,
        }),
      } as unknown as EscrowChainSyncDaemonMonitoringService,
    );
  }

  function allMigrationsAppliedQuery() {
    return (text: string) => {
      if (text.includes('SET search_path TO public')) {
        return Promise.resolve({ rows: [] });
      }

      if (text.includes('current_database()')) {
        return Promise.resolve({
          rows: [{ currentDatabase: 'escrow' }],
        });
      }

      if (text.includes('SELECT to_regclass($1) AS "relationName"')) {
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
      if (text.includes('SET search_path TO public')) {
        return Promise.resolve({ rows: [] });
      }

      if (text.includes('current_database()')) {
        return Promise.resolve({
          rows: [{ currentDatabase: 'escrow' }],
        });
      }

      if (text.includes('SELECT to_regclass($1) AS "relationName"')) {
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

  function readHeader(
    headers: RequestInit['headers'] | undefined,
    headerName: string,
  ) {
    if (!headers) {
      return null;
    }

    if (headers instanceof Headers) {
      return headers.get(headerName);
    }

    if (Array.isArray(headers)) {
      const match = headers.find(
        ([name]) => name.toLowerCase() === headerName.toLowerCase(),
      );
      return match?.[1] ?? null;
    }

    const entries = Object.entries(headers);
    const match = entries.find(
      ([name]) => name.toLowerCase() === headerName.toLowerCase(),
    );
    return typeof match?.[1] === 'string' ? match[1] : null;
  }
});
