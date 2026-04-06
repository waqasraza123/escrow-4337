import { EmailConfigService } from '../src/modules/auth/email/email.config';
import { EscrowContractConfigService } from '../src/modules/escrow/onchain/escrow-contract.config';
import { RuntimeProfileService } from '../src/modules/operations/runtime-profile.service';
import { PersistenceConfigService } from '../src/persistence/persistence.config';
import { SmartAccountConfigService } from '../src/modules/wallet/provisioning/smart-account.config';

describe('RuntimeProfileService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function createService() {
    return new RuntimeProfileService(
      new EmailConfigService(),
      new EscrowContractConfigService(),
      new PersistenceConfigService(),
      new SmartAccountConfigService(),
    );
  }

  it('reports a deployment-like profile when Postgres and all relay providers are configured', () => {
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

    const profile = createService().getProfile();

    expect(profile.profile).toBe('deployment-like');
    expect(profile.environment.corsOrigins).toEqual([
      'https://web.example.com',
      'https://admin.example.com',
    ]);
    expect(profile.operator.arbitratorAddress).toBe(
      '0x2222222222222222222222222222222222222222',
    );
    expect(profile.operator.exportSupport).toBe(true);
    expect(profile.warnings).toEqual([]);
  });

  it('reports a local-mock profile with explicit warnings for development defaults', () => {
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

    const profile = createService().getProfile();

    expect(profile.profile).toBe('local-mock');
    expect(profile.warnings).toContain(
      'Auth email delivery is using mock mode, so OTP behavior is not exercising a deployed relay.',
    );
    expect(profile.warnings).toContain(
      'No browser CORS origins are configured. Separate frontend origins may fail against this backend profile.',
    );
  });
});
