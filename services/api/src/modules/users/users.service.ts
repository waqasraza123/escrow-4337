import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { normalizeEvmAddress } from '../../common/evm-address';
import { USERS_REPOSITORY } from '../../persistence/persistence.tokens';
import type { UsersRepository } from '../../persistence/persistence.types';
import type { LinkUserWalletInput, UserRecord } from './users.types';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {}

  private key(email: string) {
    return email.trim().toLowerCase();
  }

  async getOrCreateByEmail(email: string) {
    const normalizedEmail = this.key(email);
    const found = await this.usersRepository.getByEmail(normalizedEmail);
    if (found) {
      return found;
    }

    const now = Date.now();
    const user: UserRecord = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      shariahMode: false,
      defaultExecutionWalletAddress: null,
      wallets: [],
      createdAt: now,
      updatedAt: now,
    };

    return this.usersRepository.create(user);
  }

  async getById(id: string) {
    return this.usersRepository.getById(id);
  }

  async getRequiredById(id: string) {
    const user = await this.usersRepository.getById(id);
    if (!user) {
      throw new UnauthorizedException('Not found');
    }
    return user;
  }

  async linkWallet(userId: string, input: LinkUserWalletInput) {
    const normalizedAddress = normalizeEvmAddress(input.address);
    const user = await this.getRequiredById(userId);
    const existingOwner =
      await this.usersRepository.getByWalletAddress(normalizedAddress);

    if (existingOwner && existingOwner.id !== userId) {
      throw new ConflictException('Wallet address is already linked');
    }

    const now = Date.now();
    const nextWallets = this.upsertWallet(user, {
      address: normalizedAddress,
      walletKind: input.walletKind,
      label: input.label?.trim() || undefined,
    });
    const defaultExecutionWalletAddress =
      user.defaultExecutionWalletAddress ?? normalizedAddress;

    return this.usersRepository.update({
      ...user,
      wallets: nextWallets,
      defaultExecutionWalletAddress,
      updatedAt: now,
    });
  }

  async setDefaultExecutionWallet(userId: string, address: string) {
    const normalizedAddress = normalizeEvmAddress(address);
    const user = await this.getRequiredById(userId);

    if (!this.hasWallet(user, normalizedAddress)) {
      throw new ConflictException('Wallet address is not linked');
    }

    return this.usersRepository.update({
      ...user,
      defaultExecutionWalletAddress: normalizedAddress,
      updatedAt: Date.now(),
    });
  }

  async setShariahMode(id: string, value: boolean) {
    const user = await this.usersRepository.getById(id);
    if (!user) {
      return null;
    }
    return this.usersRepository.update({
      ...user,
      shariahMode: value,
      updatedAt: Date.now(),
    });
  }

  userHasWalletAddress(user: UserRecord, address: string) {
    return this.hasWallet(user, normalizeEvmAddress(address));
  }

  private hasWallet(user: UserRecord, address: string) {
    return user.wallets.some((wallet) => wallet.address === address);
  }

  private upsertWallet(
    user: UserRecord,
    input: LinkUserWalletInput,
  ): UserRecord['wallets'] {
    const now = Date.now();
    const existingWallet = user.wallets.find(
      (wallet) => wallet.address === input.address,
    );

    if (existingWallet) {
      if (existingWallet.walletKind !== input.walletKind) {
        throw new ConflictException(
          'Wallet address is already linked with a different wallet kind',
        );
      }

      return user.wallets.map((wallet) =>
        wallet.address === input.address
          ? {
              ...wallet,
              label: input.label,
              updatedAt: now,
            }
          : wallet,
      );
    }

    return [
      ...user.wallets,
      {
        address: input.address,
        walletKind: input.walletKind,
        label: input.label,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
}
