import {
  BadRequestException,
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SiweMessage, generateNonce } from 'siwe';
import { normalizeEvmAddress } from '../../common/evm-address';
import { WALLET_LINK_CHALLENGES_REPOSITORY } from '../../persistence/persistence.tokens';
import type { WalletLinkChallengesRepository } from '../../persistence/persistence.types';
import { UsersService } from '../users/users.service';
import type {
  EoaUserWalletRecord,
  SmartAccountUserWalletRecord,
  UserRecord,
} from '../users/users.types';
import { isEoaWallet, isSmartAccountWallet } from '../users/users.types';
import { WalletConfigService } from './wallet.config';
import type {
  CreateLinkWalletChallengeDto,
  ProvisionSmartAccountDto,
  SetDefaultWalletDto,
  VerifyLinkWalletDto,
} from './wallet.dto';
import { SmartAccountConfigService } from './provisioning/smart-account.config';
import { SmartAccountPolicyService } from './provisioning/smart-account-policy.service';
import { SmartAccountProviderError } from './provisioning/smart-account.errors';
import { SMART_ACCOUNT_PROVIDER } from './provisioning/smart-account.tokens';
import type { SmartAccountProvider } from './provisioning/smart-account.types';
import type {
  WalletLinkChallengeRecord,
  WalletLinkChallengeResponse,
  SmartAccountProvisionResponse,
  WalletStateResponse,
} from './wallet.types';

@Injectable()
export class WalletService {
  constructor(
    private readonly usersService: UsersService,
    private readonly walletConfig: WalletConfigService,
    private readonly smartAccountConfig: SmartAccountConfigService,
    private readonly smartAccountPolicy: SmartAccountPolicyService,
    @Inject(SMART_ACCOUNT_PROVIDER)
    private readonly smartAccountProvider: SmartAccountProvider,
    @Inject(WALLET_LINK_CHALLENGES_REPOSITORY)
    private readonly walletLinkChallengesRepository: WalletLinkChallengesRepository,
  ) {}

  async getWalletState(userId: string): Promise<WalletStateResponse> {
    const user = await this.usersService.getRequiredById(userId);
    return this.toWalletStateResponse(user);
  }

  async createLinkWalletChallenge(
    userId: string,
    dto: CreateLinkWalletChallengeDto,
  ): Promise<WalletLinkChallengeResponse> {
    await this.usersService.getRequiredById(userId);
    const existingOwner = await this.usersService.getByWalletAddress(
      dto.address,
    );
    if (existingOwner && existingOwner.id !== userId) {
      throw new ConflictException('Wallet address is already linked');
    }

    const challenge = this.buildLinkChallenge(userId, dto);
    await this.walletLinkChallengesRepository.create(challenge);
    return {
      challengeId: challenge.id,
      message: challenge.message,
      issuedAt: challenge.issuedAt,
      expiresAt: challenge.expiresAt,
    };
  }

  async verifyLinkWallet(
    userId: string,
    dto: VerifyLinkWalletDto,
  ): Promise<WalletStateResponse> {
    const challenge = await this.getLinkChallengeOrThrow(dto.challengeId);
    this.assertChallengeOwnership(userId, challenge);
    this.assertChallengeActive(challenge);

    try {
      const verifiedAddress = await this.verifyMessage(challenge, dto);
      const verifiedAt = Date.now();
      await this.walletLinkChallengesRepository.markConsumed(
        challenge.id,
        verifiedAt,
      );
      const linkedUser = await this.usersService.linkWallet(userId, {
        address: verifiedAddress,
        walletKind: 'eoa',
        label: challenge.label,
        verificationMethod: 'siwe',
        verificationChainId: challenge.chainId,
        verifiedAt,
      });
      return this.toWalletStateResponse(linkedUser);
    } catch (error) {
      await this.recordFailedAttempt(challenge);
      throw error;
    }
  }

  async setDefaultWallet(
    userId: string,
    dto: SetDefaultWalletDto,
  ): Promise<WalletStateResponse> {
    const user = await this.usersService.setDefaultExecutionWallet(
      userId,
      dto.address,
    );
    return this.toWalletStateResponse(user);
  }

  async provisionSmartAccount(
    userId: string,
    dto: ProvisionSmartAccountDto,
  ): Promise<SmartAccountProvisionResponse> {
    const user = await this.usersService.getRequiredById(userId);
    const ownerWallet = this.getProvisionableOwnerWallet(
      user,
      dto.ownerAddress,
    );
    const sponsorship =
      this.smartAccountPolicy.getSponsorshipDecision(ownerWallet);
    const existingWallet = this.findSmartAccountForOwner(user, ownerWallet);

    const smartAccount =
      (existingWallet
        ? await this.syncExistingSmartAccount(userId, existingWallet, dto)
        : null) ??
      (await this.createSmartAccount(
        userId,
        ownerWallet,
        dto,
        sponsorship.policy,
      ));
    const nextUser = dto.setAsDefault
      ? await this.usersService.setDefaultExecutionWallet(
          userId,
          smartAccount.address,
        )
      : await this.usersService.getRequiredById(userId);

    return {
      ...this.toWalletStateResponse(nextUser),
      smartAccount: this.getSmartAccountResponse(
        nextUser,
        smartAccount.address,
      ),
      sponsorship: {
        eligible: sponsorship.eligible,
        policy: sponsorship.policy,
        providerKind: smartAccount.providerKind,
        chainId: smartAccount.chainId,
        reason: sponsorship.reason,
      },
    };
  }

  private buildLinkChallenge(
    userId: string,
    dto: CreateLinkWalletChallengeDto,
  ): WalletLinkChallengeRecord {
    const address = normalizeEvmAddress(dto.address);
    const messageAddress = dto.address.trim();
    const issuedAt = Date.now();
    const expiresAt = issuedAt + this.walletConfig.challengeTtlMs;
    const nonce = generateNonce();
    const challengeId = randomUUID();
    const message = new SiweMessage({
      domain: this.walletConfig.siweDomain,
      address: messageAddress,
      statement: this.walletConfig.linkStatement,
      uri: this.walletConfig.siweUri,
      version: '1',
      chainId: dto.chainId,
      nonce,
      issuedAt: new Date(issuedAt).toISOString(),
      expirationTime: new Date(expiresAt).toISOString(),
      requestId: challengeId,
    }).prepareMessage();

    return {
      id: challengeId,
      userId,
      address,
      walletKind: dto.walletKind,
      label: dto.label,
      chainId: dto.chainId,
      nonce,
      message,
      issuedAt,
      expiresAt,
      failedAttempts: 0,
    };
  }

  private async getLinkChallengeOrThrow(challengeId: string) {
    const challenge =
      await this.walletLinkChallengesRepository.getById(challengeId);
    if (!challenge) {
      throw new UnauthorizedException('Wallet link challenge not found');
    }
    return challenge;
  }

  private assertChallengeOwnership(
    userId: string,
    challenge: WalletLinkChallengeRecord,
  ) {
    if (challenge.userId !== userId) {
      throw new ForbiddenException(
        'Wallet link challenge belongs to another user',
      );
    }
  }

  private assertChallengeActive(challenge: WalletLinkChallengeRecord) {
    if (challenge.consumedAt !== undefined) {
      throw new ConflictException(
        'Wallet link challenge has already been used',
      );
    }
    if (challenge.expiresAt <= Date.now()) {
      throw new UnauthorizedException('Wallet link challenge has expired');
    }
    if (challenge.failedAttempts >= this.walletConfig.maxVerificationAttempts) {
      throw new UnauthorizedException('Wallet link challenge is locked');
    }
  }

  private async verifyMessage(
    challenge: WalletLinkChallengeRecord,
    dto: VerifyLinkWalletDto,
  ) {
    if (dto.message !== challenge.message) {
      throw new UnauthorizedException(
        'Wallet link message does not match the issued challenge',
      );
    }

    const message = new SiweMessage(dto.message);
    const verification = await message.verify(
      {
        signature: dto.signature,
        domain: this.walletConfig.siweDomain,
        nonce: challenge.nonce,
        time: new Date().toISOString(),
      },
      { suppressExceptions: true },
    );

    if (!verification.success) {
      throw new UnauthorizedException('Wallet signature verification failed');
    }

    const verifiedAddress = normalizeEvmAddress(message.address);
    if (verifiedAddress !== challenge.address) {
      throw new UnauthorizedException(
        'Wallet signature did not recover the expected address',
      );
    }
    if (message.uri !== this.walletConfig.siweUri) {
      throw new BadRequestException('Wallet link message URI is invalid');
    }
    if (message.requestId !== challenge.id) {
      throw new BadRequestException(
        'Wallet link message request id is invalid',
      );
    }
    if (Number(message.chainId) !== challenge.chainId) {
      throw new BadRequestException('Wallet link message chain id is invalid');
    }

    return verifiedAddress;
  }

  private async recordFailedAttempt(challenge: WalletLinkChallengeRecord) {
    await this.walletLinkChallengesRepository.recordFailedAttempt(
      challenge.id,
      Date.now(),
    );
  }

  private toWalletStateResponse(user: UserRecord): WalletStateResponse {
    return {
      defaultExecutionWalletAddress: user.defaultExecutionWalletAddress,
      wallets: structuredClone(user.wallets),
    };
  }

  private getProvisionableOwnerWallet(user: UserRecord, ownerAddress: string) {
    const ownerWallet = this.usersService.findWallet(user, ownerAddress);
    if (!ownerWallet) {
      throw new ConflictException('Wallet address is not linked');
    }
    if (!isEoaWallet(ownerWallet)) {
      throw new ConflictException(
        'Smart-account owners must be linked externally owned accounts',
      );
    }
    if (ownerWallet.verificationMethod !== 'siwe') {
      throw new ForbiddenException(
        'Smart-account provisioning requires a SIWE-verified owner wallet',
      );
    }
    return ownerWallet;
  }

  private findSmartAccountForOwner(
    user: UserRecord,
    ownerWallet: EoaUserWalletRecord,
  ) {
    return user.wallets.find(
      (wallet): wallet is SmartAccountUserWalletRecord =>
        isSmartAccountWallet(wallet) &&
        wallet.ownerAddress === ownerWallet.address &&
        wallet.providerKind === this.smartAccountProvider.providerKind &&
        wallet.chainId === this.smartAccountConfig.chainId,
    );
  }

  private async syncExistingSmartAccount(
    userId: string,
    wallet: SmartAccountUserWalletRecord,
    dto: ProvisionSmartAccountDto,
  ) {
    if (!dto.label || dto.label.trim() === wallet.label) {
      return wallet;
    }

    const linkedUser = await this.usersService.linkWallet(userId, {
      address: wallet.address,
      walletKind: 'smart_account',
      ownerAddress: wallet.ownerAddress,
      recoveryAddress: wallet.recoveryAddress,
      chainId: wallet.chainId,
      providerKind: wallet.providerKind,
      entryPointAddress: wallet.entryPointAddress,
      factoryAddress: wallet.factoryAddress,
      sponsorshipPolicy: wallet.sponsorshipPolicy,
      provisionedAt: wallet.provisionedAt,
      label: dto.label,
    });
    return this.getSmartAccountResponse(linkedUser, wallet.address);
  }

  private async createSmartAccount(
    userId: string,
    ownerWallet: EoaUserWalletRecord,
    dto: ProvisionSmartAccountDto,
    sponsorshipPolicy: SmartAccountUserWalletRecord['sponsorshipPolicy'],
  ) {
    const recoveryAddress =
      this.smartAccountPolicy.getRecoveryAddress(ownerWallet);

    let provisionedWallet: SmartAccountUserWalletRecord;
    try {
      const provisionedResult = await this.smartAccountProvider.provision({
        ownerAddress: ownerWallet.address,
        recoveryAddress,
        sponsorshipPolicy,
      });
      provisionedWallet = {
        ...provisionedResult,
        label: dto.label?.trim() || undefined,
        createdAt: provisionedResult.provisionedAt,
        updatedAt: provisionedResult.provisionedAt,
      };
    } catch (error) {
      this.rethrowProvisioningError(error);
    }

    const existingOwner = await this.usersService.getByWalletAddress(
      provisionedWallet.address,
    );
    if (existingOwner && existingOwner.id !== userId) {
      throw new ConflictException(
        'Provisioned smart account is already linked',
      );
    }

    const linkedUser = await this.usersService.linkWallet(
      userId,
      provisionedWallet,
    );
    return this.getSmartAccountResponse(linkedUser, provisionedWallet.address);
  }

  private getSmartAccountResponse(
    user: UserRecord,
    address: string,
  ): SmartAccountUserWalletRecord {
    const wallet = this.usersService.findWallet(user, address);
    if (!wallet || !isSmartAccountWallet(wallet)) {
      throw new ConflictException('Smart account was not persisted');
    }
    return structuredClone(wallet);
  }

  private rethrowProvisioningError(error: unknown): never {
    if (!(error instanceof SmartAccountProviderError)) {
      throw error;
    }
    if (error.code === 'relay_unavailable') {
      throw new ServiceUnavailableException(error.message);
    }
    throw new BadGatewayException(error.message);
  }
}
