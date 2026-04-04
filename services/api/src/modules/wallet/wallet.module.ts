import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { WalletConfigService } from './wallet.config';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [AuthModule, UsersModule],
  providers: [WalletService, WalletConfigService],
  controllers: [WalletController],
})
export class WalletModule {}
