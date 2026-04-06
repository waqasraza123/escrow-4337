import { Module } from '@nestjs/common';
import { AuthConfigService } from '../auth/auth.config';
import { AuthEmailModule } from '../auth/email/email.module';
import { EscrowContractModule } from '../escrow/onchain/escrow-contract.module';
import { PersistenceModule } from '../../persistence/persistence.module';
import { SmartAccountModule } from '../wallet/provisioning/smart-account.module';
import { DeploymentValidationService } from './deployment-validation.service';
import { OperationsController } from './operations.controller';
import { RuntimeProfileService } from './runtime-profile.service';

@Module({
  imports: [
    PersistenceModule,
    AuthEmailModule,
    SmartAccountModule,
    EscrowContractModule,
  ],
  controllers: [OperationsController],
  providers: [
    AuthConfigService,
    DeploymentValidationService,
    RuntimeProfileService,
  ],
  exports: [DeploymentValidationService, RuntimeProfileService],
})
export class OperationsModule {}
