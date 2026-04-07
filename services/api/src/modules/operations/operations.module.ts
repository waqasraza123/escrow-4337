import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthConfigService } from '../auth/auth.config';
import { AuthModule } from '../auth/auth.module';
import { AuthEmailModule } from '../auth/email/email.module';
import { EscrowContractModule } from '../escrow/onchain/escrow-contract.module';
import { PersistenceModule } from '../../persistence/persistence.module';
import { SmartAccountModule } from '../wallet/provisioning/smart-account.module';
import { DeploymentValidationService } from './deployment-validation.service';
import { EscrowHealthService } from './escrow-health.service';
import { EscrowHistoryImportService } from './escrow-history-import.service';
import { OperationsConfigService } from './operations.config';
import { OperationsController } from './operations.controller';
import { EscrowReconciliationService } from './escrow-reconciliation.service';
import { RuntimeProfileService } from './runtime-profile.service';

@Module({
  imports: [
    PersistenceModule,
    AuthModule,
    AuthEmailModule,
    UsersModule,
    SmartAccountModule,
    EscrowContractModule,
  ],
  controllers: [OperationsController],
  providers: [
    AuthConfigService,
    DeploymentValidationService,
    EscrowReconciliationService,
    EscrowHistoryImportService,
    OperationsConfigService,
    EscrowHealthService,
    RuntimeProfileService,
  ],
  exports: [
    DeploymentValidationService,
    EscrowHealthService,
    EscrowHistoryImportService,
    EscrowReconciliationService,
    RuntimeProfileService,
  ],
})
export class OperationsModule {}
