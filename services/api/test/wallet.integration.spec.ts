import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Wallet } from 'ethers';
import { Test, type TestingModule } from '@nestjs/testing';
import { UsersService } from '../src/modules/users/users.service';
import { WalletModule } from '../src/modules/wallet/wallet.module';
import { WalletService } from '../src/modules/wallet/wallet.service';
import { configureFilePersistence } from './support/test-persistence';

jest.setTimeout(60000);

describe('Wallet integration', () => {
  let walletService: WalletService;
  let usersService: UsersService;
  let moduleFixture: TestingModule;
  let cleanupPersistence: (() => void) | undefined;

  beforeEach(async () => {
    process.env.WALLET_SIWE_DOMAIN = 'api.escrow.local';
    process.env.WALLET_SIWE_URI = 'https://app.escrow.local/wallet/link';
    process.env.WALLET_SIWE_STATEMENT =
      'Link this wallet to your Escrow4337 account.';
    process.env.WALLET_SMART_ACCOUNT_CHAIN_ID = '84532';
    process.env.WALLET_SMART_ACCOUNT_MODE = 'mock';
    process.env.WALLET_SMART_ACCOUNT_ENTRY_POINT_ADDRESS =
      '0x00000061FEfce24A79343c27127435286BB7A4E1';
    process.env.WALLET_SMART_ACCOUNT_FACTORY_ADDRESS =
      '0x3333333333333333333333333333333333333333';
    process.env.WALLET_SMART_ACCOUNT_BUNDLER_URL =
      'https://bundler.wallet.local';
    process.env.WALLET_SMART_ACCOUNT_PAYMASTER_URL =
      'https://paymaster.wallet.local';
    process.env.WALLET_SMART_ACCOUNT_SPONSORSHIP_MODE = 'verified_owner';

    const persistence = configureFilePersistence();
    cleanupPersistence = persistence.cleanup;

    moduleFixture = await Test.createTestingModule({
      imports: [WalletModule],
    }).compile();

    walletService = moduleFixture.get(WalletService);
    usersService = moduleFixture.get(UsersService);
  });

  afterEach(async () => {
    jest.useRealTimers();
    await moduleFixture.close();
    cleanupPersistence?.();
    cleanupPersistence = undefined;
  });

  it('links a wallet through a verified SIWE challenge and sets it as default', async () => {
    const user = await usersService.getOrCreateByEmail(
      'wallet-owner@example.com',
    );
    const signer = Wallet.createRandom();

    const challenge = await walletService.createLinkWalletChallenge(user.id, {
      address: signer.address,
      walletKind: 'eoa',
      chainId: 8453,
      label: 'Primary wallet',
    });
    const signature = await signer.signMessage(challenge.message);

    const linkedWallets = await walletService.verifyLinkWallet(user.id, {
      challengeId: challenge.challengeId,
      message: challenge.message,
      signature,
    });

    expect(linkedWallets.defaultExecutionWalletAddress).toBe(
      signer.address.toLowerCase(),
    );
    expect(linkedWallets.wallets).toEqual([
      expect.objectContaining({
        address: signer.address.toLowerCase(),
        walletKind: 'eoa',
        label: 'Primary wallet',
      }),
    ]);

    const secondSigner = Wallet.createRandom();
    const secondChallenge = await walletService.createLinkWalletChallenge(
      user.id,
      {
        address: secondSigner.address,
        walletKind: 'eoa',
        chainId: 8453,
        label: 'Secondary wallet',
      },
    );
    const secondSignature = await secondSigner.signMessage(
      secondChallenge.message,
    );

    await walletService.verifyLinkWallet(user.id, {
      challengeId: secondChallenge.challengeId,
      message: secondChallenge.message,
      signature: secondSignature,
    });

    const updatedWallets = await walletService.setDefaultWallet(user.id, {
      address: secondSigner.address,
    });

    expect(updatedWallets.defaultExecutionWalletAddress).toBe(
      secondSigner.address.toLowerCase(),
    );
    expect(updatedWallets.wallets).toHaveLength(2);
  });

  it('rejects replaying a consumed challenge', async () => {
    const user = await usersService.getOrCreateByEmail('replay@example.com');
    const signer = Wallet.createRandom();
    const challenge = await walletService.createLinkWalletChallenge(user.id, {
      address: signer.address,
      walletKind: 'eoa',
      chainId: 1,
    });
    const signature = await signer.signMessage(challenge.message);

    await walletService.verifyLinkWallet(user.id, {
      challengeId: challenge.challengeId,
      message: challenge.message,
      signature,
    });

    await expect(
      walletService.verifyLinkWallet(user.id, {
        challengeId: challenge.challengeId,
        message: challenge.message,
        signature,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects verifying a challenge for another authenticated user', async () => {
    const owner = await usersService.getOrCreateByEmail('owner@example.com');
    const attacker = await usersService.getOrCreateByEmail(
      'attacker@example.com',
    );
    const signer = Wallet.createRandom();
    const challenge = await walletService.createLinkWalletChallenge(owner.id, {
      address: signer.address,
      walletKind: 'eoa',
      chainId: 1,
    });
    const signature = await signer.signMessage(challenge.message);

    await expect(
      walletService.verifyLinkWallet(attacker.id, {
        challengeId: challenge.challengeId,
        message: challenge.message,
        signature,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects expired wallet link challenges', async () => {
    const user = await usersService.getOrCreateByEmail('expired@example.com');
    const signer = Wallet.createRandom();
    const challenge = await walletService.createLinkWalletChallenge(user.id, {
      address: signer.address,
      walletKind: 'eoa',
      chainId: 1,
    });
    const signature = await signer.signMessage(challenge.message);

    jest.useFakeTimers();
    jest.setSystemTime(challenge.expiresAt + 1);

    await expect(
      walletService.verifyLinkWallet(user.id, {
        challengeId: challenge.challengeId,
        message: challenge.message,
        signature,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects linking a wallet that is already owned by another user', async () => {
    const firstUser =
      await usersService.getOrCreateByEmail('first@example.com');
    const secondUser =
      await usersService.getOrCreateByEmail('second@example.com');
    const signer = Wallet.createRandom();

    const firstChallenge = await walletService.createLinkWalletChallenge(
      firstUser.id,
      {
        address: signer.address,
        walletKind: 'eoa',
        chainId: 1,
      },
    );

    await walletService.verifyLinkWallet(firstUser.id, {
      challengeId: firstChallenge.challengeId,
      message: firstChallenge.message,
      signature: await signer.signMessage(firstChallenge.message),
    });

    await expect(
      walletService.createLinkWalletChallenge(secondUser.id, {
        address: signer.address,
        walletKind: 'eoa',
        chainId: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('provisions a deterministic smart account for a verified owner wallet and sets it as default', async () => {
    const user = await usersService.getOrCreateByEmail(
      'smart-owner@example.com',
    );
    const signer = Wallet.createRandom();

    const challenge = await walletService.createLinkWalletChallenge(user.id, {
      address: signer.address,
      walletKind: 'eoa',
      chainId: 84532,
      label: 'Owner wallet',
    });

    await walletService.verifyLinkWallet(user.id, {
      challengeId: challenge.challengeId,
      message: challenge.message,
      signature: await signer.signMessage(challenge.message),
    });

    const provisioned = await walletService.provisionSmartAccount(user.id, {
      ownerAddress: signer.address,
      label: 'Execution wallet',
      setAsDefault: true,
    });

    expect(provisioned.defaultExecutionWalletAddress).toBe(
      provisioned.smartAccount.address,
    );
    expect(provisioned.smartAccount).toEqual(
      expect.objectContaining({
        walletKind: 'smart_account',
        ownerAddress: signer.address.toLowerCase(),
        recoveryAddress: signer.address.toLowerCase(),
        providerKind: 'mock',
        sponsorshipPolicy: 'sponsored',
        label: 'Execution wallet',
      }),
    );
    expect(provisioned.wallets).toHaveLength(2);
    expect(provisioned.sponsorship).toEqual({
      eligible: true,
      policy: 'sponsored',
      providerKind: 'mock',
      chainId: 84532,
      reason: undefined,
    });

    const repeatedProvision = await walletService.provisionSmartAccount(
      user.id,
      {
        ownerAddress: signer.address,
        label: 'Primary execution wallet',
        setAsDefault: true,
      },
    );

    expect(repeatedProvision.smartAccount.address).toBe(
      provisioned.smartAccount.address,
    );
    expect(repeatedProvision.smartAccount.label).toBe(
      'Primary execution wallet',
    );
    expect(repeatedProvision.wallets).toHaveLength(2);
  });

  it('rejects smart-account provisioning for legacy linked owners', async () => {
    const user = await usersService.getOrCreateByEmail('legacy@example.com');
    await usersService.linkWallet(user.id, {
      address: '0x9999999999999999999999999999999999999999',
      walletKind: 'eoa',
      verificationMethod: 'legacy_link',
      verifiedAt: Date.now(),
      label: 'Legacy owner',
    });

    await expect(
      walletService.provisionSmartAccount(user.id, {
        ownerAddress: '0x9999999999999999999999999999999999999999',
        setAsDefault: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns an explicit unsponsored decision when gas sponsorship is disabled', async () => {
    process.env.WALLET_SMART_ACCOUNT_SPONSORSHIP_MODE = 'disabled';
    await moduleFixture.close();
    cleanupPersistence?.();
    cleanupPersistence = undefined;

    const persistence = configureFilePersistence();
    cleanupPersistence = persistence.cleanup;

    moduleFixture = await Test.createTestingModule({
      imports: [WalletModule],
    }).compile();

    walletService = moduleFixture.get(WalletService);
    usersService = moduleFixture.get(UsersService);

    const user = await usersService.getOrCreateByEmail(
      'unsponsored@example.com',
    );
    const signer = Wallet.createRandom();
    const challenge = await walletService.createLinkWalletChallenge(user.id, {
      address: signer.address,
      walletKind: 'eoa',
      chainId: 84532,
    });

    await walletService.verifyLinkWallet(user.id, {
      challengeId: challenge.challengeId,
      message: challenge.message,
      signature: await signer.signMessage(challenge.message),
    });

    const provisioned = await walletService.provisionSmartAccount(user.id, {
      ownerAddress: signer.address,
      setAsDefault: false,
    });

    expect(provisioned.sponsorship).toEqual({
      eligible: false,
      policy: 'disabled',
      providerKind: 'mock',
      chainId: 84532,
      reason: 'Gas sponsorship is disabled',
    });
    expect(provisioned.smartAccount.sponsorshipPolicy).toBe('disabled');
  });
});
