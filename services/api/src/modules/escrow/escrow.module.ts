import { Module } from '@nestjs/common';
import { PersistenceModule } from '../../persistence/persistence.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { EscrowActorService } from './escrow-actor.service';
import { EscrowController } from './escrow.controller';
import { EscrowService } from './escrow.service';
import { EscrowContractModule } from './onchain/escrow-contract.module';

@Module({
  imports: [PersistenceModule, EscrowContractModule, UsersModule, AuthModule],
  controllers: [EscrowController],
  providers: [EscrowService, EscrowActorService],
  exports: [EscrowService, EscrowActorService],
})
export class EscrowModule {}
