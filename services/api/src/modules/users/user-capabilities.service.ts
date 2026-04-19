import { ForbiddenException, Injectable } from '@nestjs/common';
import { EscrowContractConfigService } from '../escrow/onchain/escrow-contract.config';
import { UsersService } from './users.service';
import type {
  UserCapabilities,
  UserCapability,
  UserCapabilityName,
  UserRecord,
} from './users.types';

const missingArbitratorCapabilityReason =
  'Backend operator capability configuration is unavailable';
const missingArbitratorWalletReason =
  'Authenticated user must control the configured arbitrator wallet';
const controlsArbitratorWalletReason =
  'Authenticated user controls the configured arbitrator wallet';

@Injectable()
export class UserCapabilitiesService {
  constructor(
    private readonly usersService: UsersService,
    private readonly escrowContractConfig: EscrowContractConfigService,
  ) {}

  buildCapabilities(user: UserRecord): UserCapabilities {
    const arbitratorCapability = this.buildArbitratorWalletCapability(user);

    return {
      escrowResolution: { ...arbitratorCapability },
      escrowOperations: { ...arbitratorCapability },
      chainAuditSync: { ...arbitratorCapability },
      jobHistoryImport: { ...arbitratorCapability },
      marketplaceModeration: { ...arbitratorCapability },
    };
  }

  async getCapabilitiesForUser(userId: string): Promise<UserCapabilities> {
    const user = await this.usersService.getRequiredById(userId);
    return this.buildCapabilities(user);
  }

  async requireCapability(
    userId: string,
    capabilityName: UserCapabilityName,
  ): Promise<UserRecord> {
    const user = await this.usersService.getRequiredById(userId);
    const capability = this.buildCapabilities(user)[capabilityName];

    if (!capability.allowed) {
      throw new ForbiddenException(
        capability.reason ?? 'Authenticated user is not authorized for this action',
      );
    }

    return user;
  }

  private buildArbitratorWalletCapability(user: UserRecord): UserCapability {
    const requiredWalletAddress = this.readRequiredArbitratorWalletAddress();

    if (!requiredWalletAddress) {
      return {
        allowed: false,
        reason: missingArbitratorCapabilityReason,
        grantedBy: 'none',
        requiredWalletAddress: null,
      };
    }

    if (this.usersService.userHasWalletAddress(user, requiredWalletAddress)) {
      return {
        allowed: true,
        reason: controlsArbitratorWalletReason,
        grantedBy: 'linked_arbitrator_wallet',
        requiredWalletAddress,
      };
    }

    return {
      allowed: false,
      reason: missingArbitratorWalletReason,
      grantedBy: 'none',
      requiredWalletAddress,
    };
  }

  private readRequiredArbitratorWalletAddress(): string | null {
    try {
      return this.escrowContractConfig.arbitratorAddress;
    } catch {
      return null;
    }
  }
}
