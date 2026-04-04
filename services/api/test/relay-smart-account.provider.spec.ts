import { RelaySmartAccountProvider } from '../src/modules/wallet/provisioning/relay-smart-account.provider';
import { SmartAccountConfigService } from '../src/modules/wallet/provisioning/smart-account.config';
import { SmartAccountProviderError } from '../src/modules/wallet/provisioning/smart-account.errors';

describe('RelaySmartAccountProvider', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'production';
    process.env.WALLET_SMART_ACCOUNT_MODE = 'relay';
    process.env.WALLET_SMART_ACCOUNT_CHAIN_ID = '8453';
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
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  it('posts the configured bundler and paymaster context to the relay provider', async () => {
    const fetchMock = jest.mocked(global.fetch);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          provisionedAt: 123456,
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    const provider = new RelaySmartAccountProvider(
      new SmartAccountConfigService(),
    );

    const result = await provider.provision({
      ownerAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      recoveryAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
      sponsorshipPolicy: 'sponsored',
    });

    expect(result).toEqual(
      expect.objectContaining({
        address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        chainId: 8453,
        providerKind: 'relay',
        sponsorshipPolicy: 'sponsored',
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://relay.example.com/wallets/smart-accounts/provision',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          chainId: 8453,
          ownerAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          recoveryAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
          entryPointAddress: '0x00000061fefce24a79343c27127435286bb7a4e1',
          factoryAddress: '0x3333333333333333333333333333333333333333',
          bundlerUrl: 'https://bundler.example.com',
          paymasterUrl: 'https://paymaster.example.com',
          sponsorshipPolicy: 'sponsored',
        }),
      }),
    );
  });

  it('surfaces relay failures as provider errors', async () => {
    const fetchMock = jest.mocked(global.fetch);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'bundler_rejected',
          message: 'Bundler rejected the request',
        }),
        {
          status: 502,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    const provider = new RelaySmartAccountProvider(
      new SmartAccountConfigService(),
    );

    await expect(
      provider.provision({
        ownerAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        recoveryAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
        sponsorshipPolicy: 'sponsored',
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<SmartAccountProviderError>>({
        name: 'SmartAccountProviderError',
        code: 'bundler_rejected',
        providerKind: 'relay',
        chainId: 8453,
      }),
    );
  });
});
