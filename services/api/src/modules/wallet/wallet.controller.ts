import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { User, type ReqUser } from '../../common/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/zod.pipe';
import { AuthGuard } from '../auth/guards/auth.guard';
import * as walletDto from './wallet.dto';
import { WalletService } from './wallet.service';
import type { WalletStateResponse } from './wallet.types';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @UseGuards(AuthGuard)
  @Get()
  getWalletState(@User() user: ReqUser): Promise<WalletStateResponse> {
    return this.walletService.getWalletState(user.id);
  }

  @UseGuards(AuthGuard)
  @Post('link')
  linkWallet(
    @User() user: ReqUser,
    @Body(new ZodValidationPipe(walletDto.linkWalletSchema))
    dto: walletDto.LinkWalletDto,
  ): Promise<WalletStateResponse> {
    return this.walletService.linkWallet(user.id, dto);
  }

  @UseGuards(AuthGuard)
  @Patch('default')
  setDefaultWallet(
    @User() user: ReqUser,
    @Body(new ZodValidationPipe(walletDto.setDefaultWalletSchema))
    dto: walletDto.SetDefaultWalletDto,
  ): Promise<WalletStateResponse> {
    return this.walletService.setDefaultWallet(user.id, dto);
  }
}
