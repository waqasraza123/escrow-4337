import { Module } from '@nestjs/common';
import { PersistenceModule } from '../../persistence/persistence.module';
import { EscrowContractModule } from '../escrow/onchain/escrow-contract.module';
import { UserCapabilitiesService } from './user-capabilities.service';
import { UsersService } from './users.service';

@Module({
  imports: [PersistenceModule, EscrowContractModule],
  providers: [UsersService, UserCapabilitiesService],
  exports: [UsersService, UserCapabilitiesService],
})
export class UsersModule {}
