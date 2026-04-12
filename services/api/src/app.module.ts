import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { EscrowModule } from './modules/escrow/escrow.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { OperationsModule } from './modules/operations/operations.module';
import { RuntimeValidationService } from './modules/operations/runtime-validation.service';
import { PolicyModule } from './modules/policy/policy.module';
import { WalletModule } from './modules/wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env.local',
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env',
      ],
      expandVariables: true,
    }),
    AuthModule,
    WalletModule,
    EscrowModule,
    MarketplaceModule,
    PolicyModule,
    OperationsModule,
  ],
  providers: [RuntimeValidationService],
})
export class AppModule {}
