import { SmartAccountConfigService } from '../src/modules/wallet/provisioning/smart-account.config';

describe('SmartAccountConfigService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.WALLET_SMART_ACCOUNT_MODE;
    delete process.env.WALLET_SMART_ACCOUNT_CHAIN_ID;
    delete process.env.WALLET_SMART_ACCOUNT_ENTRY_POINT_ADDRESS;
    delete process.env.WALLET_SMART_ACCOUNT_FACTORY_ADDRESS;
    delete process.env.WALLET_SMART_ACCOUNT_BUNDLER_URL;
    delete process.env.WALLET_SMART_ACCOUNT_PAYMASTER_URL;
    delete process.env.WALLET_SMART_ACCOUNT_SPONSORSHIP_MODE;
    delete process.env.WALLET_SMART_ACCOUNT_RELAY_BASE_URL;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reads the chain and infrastructure settings from environment variables', () => {
    process.env.NODE_ENV = 'production';
    process.env.WALLET_SMART_ACCOUNT_MODE = 'relay';
    process.env.WALLET_SMART_ACCOUNT_CHAIN_ID = '8453';
    process.env.WALLET_SMART_ACCOUNT_ENTRY_POINT_ADDRESS =
      '0x00000061FEfce24A79343c27127435286BB7A4E1';
    process.env.WALLET_SMART_ACCOUNT_FACTORY_ADDRESS =
      '0x3333333333333333333333333333333333333333';
    process.env.WALLET_SMART_ACCOUNT_BUNDLER_URL =
      'https://bundler.example.com/';
    process.env.WALLET_SMART_ACCOUNT_PAYMASTER_URL =
      'https://paymaster.example.com/';
    process.env.WALLET_SMART_ACCOUNT_RELAY_BASE_URL =
      'https://relay.example.com/';

    const config = new SmartAccountConfigService();

    expect(config.mode).toBe('relay');
    expect(config.chainId).toBe(8453);
    expect(config.entryPointAddress).toBe(
      '0x00000061fefce24a79343c27127435286bb7a4e1',
    );
    expect(config.factoryAddress).toBe(
      '0x3333333333333333333333333333333333333333',
    );
    expect(config.bundlerUrl).toBe('https://bundler.example.com');
    expect(config.paymasterUrl).toBe('https://paymaster.example.com');
    expect(config.relayBaseUrl).toBe('https://relay.example.com');
    expect(config.sponsorshipMode).toBe('verified_owner');
    expect(config.recoveryMode).toBe('owner_eoa');
  });

  it('rejects invalid chain configuration', () => {
    process.env.WALLET_SMART_ACCOUNT_CHAIN_ID = 'abc';

    const config = new SmartAccountConfigService();

    expect(config.chainId).toBe(84532);
  });

  it('requires paymaster configuration when sponsorship is enabled in relay mode', () => {
    process.env.NODE_ENV = 'production';
    process.env.WALLET_SMART_ACCOUNT_MODE = 'relay';
    process.env.WALLET_SMART_ACCOUNT_ENTRY_POINT_ADDRESS =
      '0x00000061FEfce24A79343c27127435286BB7A4E1';
    process.env.WALLET_SMART_ACCOUNT_FACTORY_ADDRESS =
      '0x3333333333333333333333333333333333333333';
    process.env.WALLET_SMART_ACCOUNT_BUNDLER_URL =
      'https://bundler.example.com';
    process.env.WALLET_SMART_ACCOUNT_RELAY_BASE_URL =
      'https://relay.example.com';

    const config = new SmartAccountConfigService();

    expect(() => config.paymasterUrl).toThrow(
      'WALLET_SMART_ACCOUNT_PAYMASTER_URL must be set',
    );
  });
});
