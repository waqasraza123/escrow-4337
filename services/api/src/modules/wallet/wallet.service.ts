import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import type { LinkWalletDto, SetDefaultWalletDto } from './wallet.dto';
import type { WalletStateResponse } from './wallet.types';

@Injectable()
export class WalletService {
  constructor(private readonly usersService: UsersService) {}

  async getWalletState(userId: string): Promise<WalletStateResponse> {
    const user = await this.usersService.getRequiredById(userId);
    return {
      defaultExecutionWalletAddress: user.defaultExecutionWalletAddress,
      wallets: structuredClone(user.wallets),
    };
  }

  async linkWallet(
    userId: string,
    dto: LinkWalletDto,
  ): Promise<WalletStateResponse> {
    const user = await this.usersService.linkWallet(userId, dto);
    return {
      defaultExecutionWalletAddress: user.defaultExecutionWalletAddress,
      wallets: structuredClone(user.wallets),
    };
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
}
