import { Module } from '@nestjs/common';

@Module({ providers: [WalletService], controllers: [WalletController] })
export class WalletModule {}
