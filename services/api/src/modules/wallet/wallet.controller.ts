import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { User, type ReqUser } from '../../common/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/zod.pipe';
import { AuthGuard } from '../auth/guards/auth.guard';
import * as walletDto from './wallet.dto';
import { WalletService } from './wallet.service';
import type {
  WalletLinkChallengeResponse,
  SmartAccountProvisionResponse,
  WalletStateResponse,
} from './wallet.types';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @UseGuards(AuthGuard)
  @Get()
  getWalletState(@User() user: ReqUser): Promise<WalletStateResponse> {
    return this.walletService.getWalletState(user.id);
  }

  @UseGuards(AuthGuard)
  @Post('link/challenge')
  createLinkWalletChallenge(
    @User() user: ReqUser,
    @Body(new ZodValidationPipe(walletDto.createLinkWalletChallengeSchema))
    dto: walletDto.CreateLinkWalletChallengeDto,
  ): Promise<WalletLinkChallengeResponse> {
    return this.walletService.createLinkWalletChallenge(user.id, dto);
  }

  @UseGuards(AuthGuard)
  @Post('link/verify')
  verifyLinkWallet(
    @User() user: ReqUser,
    @Body(new ZodValidationPipe(walletDto.verifyLinkWalletSchema))
    dto: walletDto.VerifyLinkWalletDto,
  ): Promise<WalletStateResponse> {
    return this.walletService.verifyLinkWallet(user.id, dto);
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

  @UseGuards(AuthGuard)
  @Post('smart-account/provision')
  provisionSmartAccount(
    @User() user: ReqUser,
    @Body(new ZodValidationPipe(walletDto.provisionSmartAccountSchema))
    dto: walletDto.ProvisionSmartAccountDto,
  ): Promise<SmartAccountProvisionResponse> {
    return this.walletService.provisionSmartAccount(user.id, dto);
  }
}
