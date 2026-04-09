import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { User, type ReqUser } from '../../common/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/zod.pipe';
import { AuthGuard } from '../auth/guards/auth.guard';
import { EscrowChainSyncService } from './escrow-chain-sync.service';
import { EscrowHealthService } from './escrow-health.service';
import { EscrowHistoryImportService } from './escrow-history-import.service';
import * as operationsDto from './operations.dto';
import { RuntimeProfileService } from './runtime-profile.service';

@Controller('operations')
export class OperationsController {
  constructor(
    private readonly runtimeProfile: RuntimeProfileService,
    private readonly escrowHealth: EscrowHealthService,
    private readonly escrowHistoryImport: EscrowHistoryImportService,
    private readonly escrowChainSync: EscrowChainSyncService,
  ) {}

  @Get('runtime-profile')
  getRuntimeProfile() {
    return this.runtimeProfile.getProfile();
  }

  @UseGuards(AuthGuard)
  @Get('escrow-health')
  getEscrowHealth(
    @User() user: ReqUser,
    @Query(new ZodValidationPipe(operationsDto.escrowHealthQuerySchema))
    query: operationsDto.EscrowHealthQueryDto,
  ) {
    return this.escrowHealth.getReport(user.id, query);
  }

  @UseGuards(AuthGuard)
  @Post('reconciliation/job-history-import')
  importJobHistory(
    @User() user: ReqUser,
    @Body(new ZodValidationPipe(operationsDto.importJobHistorySchema))
    body: operationsDto.ImportJobHistoryDto,
  ) {
    return this.escrowHistoryImport.importJobHistory(user.id, body);
  }

  @UseGuards(AuthGuard)
  @Get('reconciliation/chain-audit-sync/daemon-status')
  getChainAuditDaemonStatus(@User() user: ReqUser) {
    return this.escrowChainSync.getDaemonStatus(user.id);
  }

  @UseGuards(AuthGuard)
  @Get('reconciliation/chain-audit-sync/daemon-health')
  getChainAuditDaemonHealth(@User() user: ReqUser) {
    return this.escrowChainSync.getDaemonHealthReport(user.id);
  }

  @UseGuards(AuthGuard)
  @Post('reconciliation/chain-audit-sync')
  syncChainAudit(
    @User() user: ReqUser,
    @Body(new ZodValidationPipe(operationsDto.syncEscrowChainAuditSchema))
    body: operationsDto.SyncEscrowChainAuditDto,
  ) {
    return this.escrowChainSync.syncJobAudit(user.id, body);
  }

  @UseGuards(AuthGuard)
  @Post('reconciliation/chain-audit-sync/batch')
  syncChainAuditBatch(
    @User() user: ReqUser,
    @Body(new ZodValidationPipe(operationsDto.syncEscrowChainAuditBatchSchema))
    body: operationsDto.SyncEscrowChainAuditBatchDto,
  ) {
    return this.escrowChainSync.syncBatch(user.id, body);
  }

  @UseGuards(AuthGuard)
  @Post('escrow-health/:jobId/stale-claim')
  claimStaleJob(
    @User() user: ReqUser,
    @Param('jobId') jobId: string,
    @Body(new ZodValidationPipe(operationsDto.claimStaleJobSchema))
    body: operationsDto.ClaimStaleJobDto,
  ) {
    return this.escrowHealth.claimStaleJob(user.id, jobId, body);
  }

  @UseGuards(AuthGuard)
  @Post('escrow-health/:jobId/failure-claim')
  claimExecutionFailureWorkflow(
    @User() user: ReqUser,
    @Param('jobId') jobId: string,
    @Body(
      new ZodValidationPipe(operationsDto.claimExecutionFailureWorkflowSchema),
    )
    body: operationsDto.ClaimExecutionFailureWorkflowDto,
  ) {
    return this.escrowHealth.claimExecutionFailureWorkflow(
      user.id,
      jobId,
      body,
    );
  }

  @UseGuards(AuthGuard)
  @Post('escrow-health/:jobId/failure-acknowledge')
  acknowledgeExecutionFailures(
    @User() user: ReqUser,
    @Param('jobId') jobId: string,
    @Body(
      new ZodValidationPipe(
        operationsDto.acknowledgeExecutionFailureWorkflowSchema,
      ),
    )
    body: operationsDto.AcknowledgeExecutionFailureWorkflowDto,
  ) {
    return this.escrowHealth.acknowledgeExecutionFailures(user.id, jobId, body);
  }

  @UseGuards(AuthGuard)
  @Post('escrow-health/:jobId/failure-update')
  updateExecutionFailureWorkflow(
    @User() user: ReqUser,
    @Param('jobId') jobId: string,
    @Body(
      new ZodValidationPipe(operationsDto.updateExecutionFailureWorkflowSchema),
    )
    body: operationsDto.UpdateExecutionFailureWorkflowDto,
  ) {
    return this.escrowHealth.updateExecutionFailureWorkflow(
      user.id,
      jobId,
      body,
    );
  }

  @UseGuards(AuthGuard)
  @Post('escrow-health/:jobId/stale-release')
  releaseStaleJob(
    @User() user: ReqUser,
    @Param('jobId') jobId: string,
    @Body(new ZodValidationPipe(operationsDto.releaseStaleJobSchema))
    body: operationsDto.ReleaseStaleJobDto,
  ) {
    void body;
    return this.escrowHealth.releaseStaleJob(user.id, jobId);
  }

  @UseGuards(AuthGuard)
  @Post('escrow-health/:jobId/failure-release')
  releaseExecutionFailureWorkflow(
    @User() user: ReqUser,
    @Param('jobId') jobId: string,
    @Body(
      new ZodValidationPipe(
        operationsDto.releaseExecutionFailureWorkflowSchema,
      ),
    )
    body: operationsDto.ReleaseExecutionFailureWorkflowDto,
  ) {
    void body;
    return this.escrowHealth.releaseExecutionFailureWorkflow(user.id, jobId);
  }
}
