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

jest.setTimeout(15000);

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
});
