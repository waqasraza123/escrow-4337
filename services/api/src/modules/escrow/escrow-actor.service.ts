import { ForbiddenException, Injectable } from '@nestjs/common';
import { normalizeEvmAddress } from '../../common/evm-address';
import { UsersService } from '../users/users.service';
import { isSmartAccountWallet } from '../users/users.types';
import type { EscrowJobRecord } from './escrow.types';
import { EscrowContractConfigService } from './onchain/escrow-contract.config';

@Injectable()
export class EscrowActorService {
  constructor(
    private readonly usersService: UsersService,
    private readonly escrowContractConfig: EscrowContractConfigService,
  ) {}

  async resolveClientForCreate(userId: string) {
    const user = await this.usersService.getRequiredById(userId);
    if (!user.defaultExecutionWalletAddress) {
      throw new ForbiddenException(
        'Provision a smart account and set it as the default execution wallet before creating jobs',
      );
    }
    const executionWallet = this.usersService.findWallet(
      user,
      user.defaultExecutionWalletAddress,
    );
    if (!executionWallet || !isSmartAccountWallet(executionWallet)) {
      throw new ForbiddenException(
        'Default execution wallet must be a provisioned smart account before creating jobs',
      );
    }
    return executionWallet.address;
  }

  async resolveClientForJob(userId: string, job: EscrowJobRecord) {
    return this.requireLinkedWallet(userId, job.onchain.clientAddress);
  }

  async resolveWorkerForJob(userId: string, job: EscrowJobRecord) {
    return this.requireLinkedWallet(userId, job.onchain.workerAddress);
  }

  async resolvePartyForJob(userId: string, job: EscrowJobRecord) {
    const user = await this.usersService.getRequiredById(userId);
    const allowedAddresses = new Set([
      job.onchain.clientAddress,
      job.onchain.workerAddress,
    ]);
    const matchedWallet = user.wallets.find((wallet) =>
      allowedAddresses.has(wallet.address),
    );

    if (!matchedWallet) {
      throw new ForbiddenException(
        'Authenticated user must control the client or worker wallet for this job',
      );
    }

    return matchedWallet.address;
  }

  async resolveArbitrator(userId: string) {
    return this.requireLinkedWallet(
      userId,
      normalizeEvmAddress(this.escrowContractConfig.arbitratorAddress),
      'Authenticated user must control the configured arbitrator wallet',
    );
  }

  private async requireLinkedWallet(
    userId: string,
    address: string,
    message = 'Authenticated user does not control the required wallet',
  ) {
    const normalizedAddress = normalizeEvmAddress(address);
    const user = await this.usersService.getRequiredById(userId);

    if (!this.usersService.userHasWalletAddress(user, normalizedAddress)) {
      throw new ForbiddenException(message);
    }

    return normalizedAddress;
  }
}
