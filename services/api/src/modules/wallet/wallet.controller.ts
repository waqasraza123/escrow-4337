import { Controller, Post } from '@nestjs/common';

@Controller('wallet')
export class WalletController {
  @Post('create')
  create() {
    // TODO: Safe/Kernel account creation + guardian config
    return { address: '0xSmartAccount' };
  }
}
