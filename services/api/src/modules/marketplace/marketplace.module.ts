import { Module } from '@nestjs/common';
import { PersistenceModule } from '../../persistence/persistence.module';
import { AuthModule } from '../auth/auth.module';
import { EscrowModule } from '../escrow/escrow.module';
import { UsersModule } from '../users/users.module';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

@Module({
  imports: [PersistenceModule, UsersModule, AuthModule, EscrowModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
