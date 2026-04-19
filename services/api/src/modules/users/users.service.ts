import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { normalizeEvmAddress } from '../../common/evm-address';
import { USERS_REPOSITORY } from '../../persistence/persistence.tokens';
import type { UsersRepository } from '../../persistence/persistence.types';
import type {
  LinkEoaWalletInput,
  LinkSmartAccountWalletInput,
  LinkUserWalletInput,
  UserRecord,
  UserWalletRecord,
} from './users.types';

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
      activeWorkspaceId: null,
      wallets: [],
      createdAt: now,
      updatedAt: now,
    };

    return this.usersRepository.create(user);
  }

  async getById(id: string) {
    return this.usersRepository.getById(id);
  }

  async getByWalletAddress(address: string) {
    return this.usersRepository.getByWalletAddress(
      normalizeEvmAddress(address),
    );
  }

  async getRequiredById(id: string) {
    const user = await this.usersRepository.getById(id);
    if (!user) {
      throw new UnauthorizedException('Not found');
    }
    return user;
  }

  async linkWallet(userId: string, input: LinkUserWalletInput) {
    const normalizedInput = this.normalizeWalletInput(input);
    const normalizedAddress = normalizedInput.address;
    const user = await this.getRequiredById(userId);
    const existingOwner =
      await this.usersRepository.getByWalletAddress(normalizedAddress);

    if (existingOwner && existingOwner.id !== userId) {
      throw new ConflictException('Wallet address is already linked');
    }

    const now = Date.now();
    const nextWallets = this.upsertWallet(user, normalizedInput);
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

  async setActiveWorkspace(userId: string, workspaceId: string | null) {
    const user = await this.getRequiredById(userId);
    return this.usersRepository.update({
      ...user,
      activeWorkspaceId: workspaceId,
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

  findWallet(user: UserRecord, address: string): UserWalletRecord | undefined {
    const normalizedAddress = normalizeEvmAddress(address);
    return user.wallets.find((wallet) => wallet.address === normalizedAddress);
  }

  async getRequiredWallet(userId: string, address: string) {
    const user = await this.getRequiredById(userId);
    const wallet = this.findWallet(user, address);
    if (!wallet) {
      throw new NotFoundException('Wallet address is not linked');
    }
    return wallet;
  }

  private hasWallet(user: UserRecord, address: string) {
    return user.wallets.some((wallet) => wallet.address === address);
  }

  private upsertWallet(
    user: UserRecord,
    input: LinkUserWalletInput,
  ): UserRecord['wallets'] {
    const now = Date.now();
    const normalizedInput = this.normalizeWalletInput(input);
    const existingWallet = user.wallets.find(
      (wallet) => wallet.address === normalizedInput.address,
    );

    if (existingWallet) {
      if (existingWallet.walletKind !== normalizedInput.walletKind) {
        throw new ConflictException(
          'Wallet address is already linked with a different wallet kind',
        );
      }

      return user.wallets.map((wallet) =>
        wallet.address === normalizedInput.address
          ? this.createWalletRecord(normalizedInput, wallet.createdAt, now)
          : wallet,
      );
    }

    return [
      ...user.wallets,
      this.createWalletRecord(normalizedInput, now, now),
    ];
  }

  private normalizeWalletInput(
    input: LinkUserWalletInput,
  ): LinkUserWalletInput {
    if (input.walletKind === 'eoa') {
      return {
        ...input,
        address: normalizeEvmAddress(input.address),
        label: input.label?.trim() || undefined,
      } satisfies LinkEoaWalletInput;
    }

    return {
      ...input,
      address: normalizeEvmAddress(input.address),
      ownerAddress: normalizeEvmAddress(input.ownerAddress),
      recoveryAddress: normalizeEvmAddress(input.recoveryAddress),
      entryPointAddress: normalizeEvmAddress(input.entryPointAddress),
      factoryAddress: normalizeEvmAddress(input.factoryAddress),
      label: input.label?.trim() || undefined,
    } satisfies LinkSmartAccountWalletInput;
  }

  private createWalletRecord(
    input: LinkUserWalletInput,
    createdAt: number,
    updatedAt: number,
  ): UserWalletRecord {
    if (input.walletKind === 'eoa') {
      return {
        address: input.address,
        walletKind: input.walletKind,
        verificationMethod: input.verificationMethod,
        verificationChainId: input.verificationChainId,
        verifiedAt: input.verifiedAt,
        label: input.label,
        createdAt,
        updatedAt,
      };
    }

    return {
      address: input.address,
      walletKind: input.walletKind,
      ownerAddress: input.ownerAddress,
      recoveryAddress: input.recoveryAddress,
      chainId: input.chainId,
      providerKind: input.providerKind,
      entryPointAddress: input.entryPointAddress,
      factoryAddress: input.factoryAddress,
      sponsorshipPolicy: input.sponsorshipPolicy,
      provisionedAt: input.provisionedAt,
      label: input.label,
      createdAt,
      updatedAt,
    };
  }
}
