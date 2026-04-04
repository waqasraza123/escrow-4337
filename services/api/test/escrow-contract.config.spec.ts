import { EscrowContractConfigService } from '../src/modules/escrow/onchain/escrow-contract.config';

describe('EscrowContractConfigService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ESCROW_CONTRACT_MODE;
    delete process.env.ESCROW_CHAIN_ID;
    delete process.env.ESCROW_CONTRACT_ADDRESS;
    delete process.env.ESCROW_ARBITRATOR_ADDRESS;
    delete process.env.ESCROW_RELAY_BASE_URL;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reads escrow relay settings from the environment', () => {
    process.env.NODE_ENV = 'production';
    process.env.ESCROW_CONTRACT_MODE = 'relay';
    process.env.ESCROW_CHAIN_ID = '8453';
    process.env.ESCROW_CONTRACT_ADDRESS =
      '0x1111111111111111111111111111111111111111';
    process.env.ESCROW_ARBITRATOR_ADDRESS =
      '0x2222222222222222222222222222222222222222';
    process.env.ESCROW_RELAY_BASE_URL = 'https://escrow.example.com/';

    const config = new EscrowContractConfigService();

    expect(config.mode).toBe('relay');
    expect(config.chainId).toBe(8453);
    expect(config.contractAddress).toBe(
      '0x1111111111111111111111111111111111111111',
    );
    expect(config.arbitratorAddress).toBe(
      '0x2222222222222222222222222222222222222222',
    );
    expect(config.relayBaseUrl).toBe('https://escrow.example.com');
  });

  it('requires escrow relay settings outside test mode', () => {
    process.env.NODE_ENV = 'production';
    process.env.ESCROW_CONTRACT_MODE = 'relay';

    const config = new EscrowContractConfigService();

    expect(() => config.contractAddress).toThrow(
      'ESCROW_CONTRACT_ADDRESS must be set',
    );

    process.env.ESCROW_CONTRACT_ADDRESS =
      '0x1111111111111111111111111111111111111111';
    expect(() => config.arbitratorAddress).toThrow(
      'ESCROW_ARBITRATOR_ADDRESS must be set',
    );

    process.env.ESCROW_ARBITRATOR_ADDRESS =
      '0x2222222222222222222222222222222222222222';
    expect(() => config.relayBaseUrl).toThrow(
      'ESCROW_RELAY_BASE_URL must be set',
    );
  });

  it('rejects invalid escrow relay values', () => {
    process.env.NODE_ENV = 'production';
    process.env.ESCROW_CONTRACT_ADDRESS = 'not-an-address';
    process.env.ESCROW_ARBITRATOR_ADDRESS =
      '0x2222222222222222222222222222222222222222';
    process.env.ESCROW_RELAY_BASE_URL = 'not-a-url';

    const config = new EscrowContractConfigService();

    expect(() => config.contractAddress).toThrow('Invalid EVM address');

    process.env.ESCROW_CONTRACT_ADDRESS =
      '0x1111111111111111111111111111111111111111';
    expect(() => config.relayBaseUrl).toThrow(
      'ESCROW_RELAY_BASE_URL must be a valid URL',
    );
  });
});
