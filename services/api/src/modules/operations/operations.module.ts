import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthConfigService } from '../auth/auth.config';
import { AuthModule } from '../auth/auth.module';
import { AuthEmailModule } from '../auth/email/email.module';
import { EscrowContractModule } from '../escrow/onchain/escrow-contract.module';
import { PersistenceModule } from '../../persistence/persistence.module';
import { SmartAccountModule } from '../wallet/provisioning/smart-account.module';
import { DeploymentValidationService } from './deployment-validation.service';
import { EscrowChainSyncDaemonDeploymentService } from './escrow-chain-sync-daemon-deployment.service';
import {
  ESCROW_CHAIN_LOG_PROVIDER,
  JsonRpcEscrowChainLogProvider,
} from './escrow-chain-log.provider';
import { EscrowChainSyncService } from './escrow-chain-sync.service';
import { EscrowChainSyncDaemonStatusService } from './escrow-chain-sync-daemon-status.service';
import { EscrowChainSyncDaemonAlertStateService } from './escrow-chain-sync-daemon-alert-state.service';
import { EscrowChainSyncDaemonAlertingService } from './escrow-chain-sync-daemon-alerting.service';
import { EscrowChainSyncDaemonMonitoringService } from './escrow-chain-sync-daemon-monitoring.service';
import { EscrowChainIngestionStatusService } from './escrow-chain-ingestion-status.service';
import { EscrowChainSyncRunLockService } from './escrow-chain-sync-run-lock.service';
import { EscrowHealthService } from './escrow-health.service';
import { EscrowHistoryImportService } from './escrow-history-import.service';
import { LaunchReadinessService } from './launch-readiness.service';
import { OperationsConfigService } from './operations.config';
import { OperationsController } from './operations.controller';
import { EscrowOnchainAuthorityService } from './escrow-onchain-authority.service';
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
    EscrowChainSyncDaemonDeploymentService,
    {
      provide: ESCROW_CHAIN_LOG_PROVIDER,
      useClass: JsonRpcEscrowChainLogProvider,
    },
    EscrowChainSyncService,
    EscrowChainSyncDaemonAlertStateService,
    EscrowChainSyncDaemonAlertingService,
    EscrowChainIngestionStatusService,
    EscrowChainSyncDaemonStatusService,
    EscrowChainSyncDaemonMonitoringService,
    EscrowChainSyncRunLockService,
    EscrowOnchainAuthorityService,
    EscrowReconciliationService,
    EscrowHistoryImportService,
    LaunchReadinessService,
    OperationsConfigService,
    EscrowHealthService,
    RuntimeProfileService,
  ],
  exports: [
    DeploymentValidationService,
    EscrowChainSyncService,
    EscrowChainSyncDaemonDeploymentService,
    EscrowChainSyncDaemonAlertingService,
    EscrowChainSyncDaemonMonitoringService,
    EscrowChainIngestionStatusService,
    EscrowHealthService,
    EscrowHistoryImportService,
    LaunchReadinessService,
    EscrowOnchainAuthorityService,
    EscrowReconciliationService,
    RuntimeProfileService,
  ],
})
export class OperationsModule {}
