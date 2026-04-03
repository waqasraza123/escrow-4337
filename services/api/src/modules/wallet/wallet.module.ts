import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';

@Module({ providers: [], controllers: [WalletController] })
export class WalletModule {}
