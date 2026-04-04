import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { SmartAccountModule } from './provisioning/smart-account.module';
import { WalletConfigService } from './wallet.config';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [AuthModule, UsersModule, SmartAccountModule],
  providers: [WalletService, WalletConfigService],
  controllers: [WalletController],
})
export class WalletModule {}
