import { ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { UsersService } from '../src/modules/users/users.service';
import { WalletModule } from '../src/modules/wallet/wallet.module';
import { WalletService } from '../src/modules/wallet/wallet.service';
import { configureFilePersistence } from './support/test-persistence';

const firstWalletAddress = '0x1111111111111111111111111111111111111111';
const secondWalletAddress = '0x2222222222222222222222222222222222222222';

describe('Wallet integration', () => {
  let walletService: WalletService;
  let usersService: UsersService;
  let moduleFixture: TestingModule;
  let cleanupPersistence: (() => void) | undefined;

  beforeEach(async () => {
    const persistence = configureFilePersistence();
    cleanupPersistence = persistence.cleanup;

    moduleFixture = await Test.createTestingModule({
      imports: [WalletModule],
    }).compile();

    walletService = moduleFixture.get(WalletService);
    usersService = moduleFixture.get(UsersService);
  });

  afterEach(async () => {
    await moduleFixture.close();
    cleanupPersistence?.();
    cleanupPersistence = undefined;
  });

  it('links wallets, normalizes addresses, and sets the first wallet as default', async () => {
    const user = await usersService.getOrCreateByEmail(
      'wallet-owner@example.com',
    );

    const linkedWallets = await walletService.linkWallet(user.id, {
      address: firstWalletAddress.toUpperCase(),
      walletKind: 'eoa',
      label: 'Primary wallet',
    });

    expect(linkedWallets.defaultExecutionWalletAddress).toBe(
      firstWalletAddress,
    );
    expect(linkedWallets.wallets).toEqual([
      expect.objectContaining({
        address: firstWalletAddress,
        walletKind: 'eoa',
        label: 'Primary wallet',
      }),
    ]);

    await walletService.linkWallet(user.id, {
      address: secondWalletAddress,
      walletKind: 'smart_account',
      label: 'Execution account',
    });

    const updatedWallets = await walletService.setDefaultWallet(user.id, {
      address: secondWalletAddress,
    });

    expect(updatedWallets.defaultExecutionWalletAddress).toBe(
      secondWalletAddress,
    );
    expect(updatedWallets.wallets).toHaveLength(2);
  });

  it('rejects linking a wallet that is already owned by another user', async () => {
    const firstUser =
      await usersService.getOrCreateByEmail('first@example.com');
    const secondUser =
      await usersService.getOrCreateByEmail('second@example.com');

    await walletService.linkWallet(firstUser.id, {
      address: firstWalletAddress,
      walletKind: 'eoa',
    });

    await expect(
      walletService.linkWallet(secondUser.id, {
        address: firstWalletAddress,
        walletKind: 'eoa',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
