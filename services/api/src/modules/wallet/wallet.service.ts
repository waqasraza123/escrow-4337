import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SiweMessage, generateNonce } from 'siwe';
import { normalizeEvmAddress } from '../../common/evm-address';
import { WALLET_LINK_CHALLENGES_REPOSITORY } from '../../persistence/persistence.tokens';
import type { WalletLinkChallengesRepository } from '../../persistence/persistence.types';
import { UsersService } from '../users/users.service';
import { WalletConfigService } from './wallet.config';
import type {
  CreateLinkWalletChallengeDto,
  SetDefaultWalletDto,
  VerifyLinkWalletDto,
} from './wallet.dto';
import type {
  WalletLinkChallengeRecord,
  WalletLinkChallengeResponse,
  WalletStateResponse,
} from './wallet.types';

@Injectable()
export class WalletService {
  constructor(
    private readonly usersService: UsersService,
    private readonly walletConfig: WalletConfigService,
    @Inject(WALLET_LINK_CHALLENGES_REPOSITORY)
    private readonly walletLinkChallengesRepository: WalletLinkChallengesRepository,
  ) {}

  async getWalletState(userId: string): Promise<WalletStateResponse> {
    const user = await this.usersService.getRequiredById(userId);
    return {
      defaultExecutionWalletAddress: user.defaultExecutionWalletAddress,
      wallets: structuredClone(user.wallets),
    };
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
      await this.walletLinkChallengesRepository.markConsumed(
        challenge.id,
        Date.now(),
      );
      const linkedUser = await this.usersService.linkWallet(userId, {
        address: verifiedAddress,
        walletKind: challenge.walletKind,
        label: challenge.label,
      });
      return {
        defaultExecutionWalletAddress: linkedUser.defaultExecutionWalletAddress,
        wallets: structuredClone(linkedUser.wallets),
      };
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
    return {
      defaultExecutionWalletAddress: user.defaultExecutionWalletAddress,
      wallets: structuredClone(user.wallets),
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
}
