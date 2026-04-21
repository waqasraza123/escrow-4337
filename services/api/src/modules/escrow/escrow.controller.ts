import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { User, type ReqUser } from '../../common/decorators/user.decorator';
import type { RequestExecutionContext } from '../../common/http/request-context';
import { ZodValidationPipe } from '../../common/zod.pipe';
import { AuthGuard } from '../auth/guards/auth.guard';
import * as escrowDto from './escrow.dto';
import { EscrowService } from './escrow.service';
import type {
  ContractorInviteResponse,
  ContractorJoinReadinessResponse,
  CreateJobResponse,
  EscrowAuditBundle,
  EscrowProjectDeliverSubmissionResponse,
  EscrowJobsListResponse,
  EscrowProjectMessageResponse,
  EscrowProjectRoomResponse,
  EscrowProjectSubmissionResponse,
  FundJobResponse,
  JoinContractorResponse,
  MilestoneMutationResponse,
  SetMilestonesResponse,
  UpdateContractorEmailResponse,
} from './escrow.types';

@Controller('jobs')
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @UseGuards(AuthGuard)
  @Get()
  list(@User() user: ReqUser): Promise<EscrowJobsListResponse> {
    return this.escrowService.listJobsForUser(user.id);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(
    @User() user: ReqUser,
    @Body(new ZodValidationPipe(escrowDto.createJobSchema))
    dto: escrowDto.CreateJobDto,
    @RequestContext() requestContext?: RequestExecutionContext,
  ): Promise<CreateJobResponse> {
    return this.escrowService.createJob(user.id, dto, requestContext);
  }

  @UseGuards(AuthGuard)
  @Post(':id/fund')
  fund(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(escrowDto.fundJobSchema))
    dto: escrowDto.FundJobDto,
    @RequestContext() requestContext?: RequestExecutionContext,
  ): Promise<FundJobResponse> {
    return this.escrowService.fundJob(user.id, id, dto, requestContext);
  }

  @UseGuards(AuthGuard)
  @Post(':id/contractor/invite')
  inviteContractor(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(escrowDto.contractorInviteSchema))
    dto: escrowDto.ContractorInviteDto,
  ): Promise<ContractorInviteResponse> {
    return this.escrowService.inviteContractor(user.id, id, dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/contractor/email')
  updateContractorEmail(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(escrowDto.updateContractorEmailSchema))
    dto: escrowDto.UpdateContractorEmailDto,
  ): Promise<UpdateContractorEmailResponse> {
    return this.escrowService.updateContractorEmail(user.id, id, dto);
  }

  @UseGuards(AuthGuard)
  @Get(':id/contractor/join-readiness')
  getContractorJoinReadiness(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(escrowDto.contractorJoinReadinessQuerySchema))
    query: escrowDto.ContractorJoinReadinessQueryDto,
  ): Promise<ContractorJoinReadinessResponse> {
    return this.escrowService.getContractorJoinReadiness(
      user.id,
      id,
      query.inviteToken,
    );
  }

  @UseGuards(AuthGuard)
  @Post(':id/contractor/join')
  joinContractor(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(escrowDto.joinContractorSchema))
    dto: escrowDto.JoinContractorDto,
  ): Promise<JoinContractorResponse> {
    return this.escrowService.joinContractor(user.id, id, dto);
  }

  @UseGuards(AuthGuard)
  @Get(':id/project-room')
  getProjectRoom(
    @User() user: ReqUser,
    @Param('id') id: string,
  ): Promise<EscrowProjectRoomResponse> {
    return this.escrowService.getProjectRoom(user.id, id);
  }

  @UseGuards(AuthGuard)
  @Post(':id/project-room/messages')
  postProjectRoomMessage(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(escrowDto.postProjectRoomMessageSchema))
    dto: escrowDto.PostProjectRoomMessageDto,
  ): Promise<EscrowProjectMessageResponse> {
    return this.escrowService.postProjectRoomMessage(user.id, id, dto);
  }

  @UseGuards(AuthGuard)
  @Post(':id/project-room/milestones/:m/submissions')
  submitProjectMilestone(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Param('m', ParseIntPipe) milestoneIndex: number,
    @Body(new ZodValidationPipe(escrowDto.submitProjectMilestoneSchema))
    dto: escrowDto.SubmitProjectMilestoneDto,
  ): Promise<EscrowProjectSubmissionResponse> {
    return this.escrowService.submitProjectMilestone(
      user.id,
      id,
      milestoneIndex,
      dto,
    );
  }

  @UseGuards(AuthGuard)
  @Post(':id/project-room/submissions/:submissionId/revision-request')
  requestProjectRevision(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Param('submissionId') submissionId: string,
    @Body(new ZodValidationPipe(escrowDto.requestProjectRevisionSchema))
    dto: escrowDto.RequestProjectRevisionDto,
  ): Promise<EscrowProjectSubmissionResponse> {
    return this.escrowService.requestProjectRevision(
      user.id,
      id,
      submissionId,
      dto,
    );
  }

  @UseGuards(AuthGuard)
  @Post(':id/project-room/submissions/:submissionId/approve')
  approveProjectSubmission(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Param('submissionId') submissionId: string,
    @Body(new ZodValidationPipe(escrowDto.approveProjectSubmissionSchema))
    dto: escrowDto.ApproveProjectSubmissionDto,
  ): Promise<EscrowProjectSubmissionResponse> {
    return this.escrowService.approveProjectSubmission(
      user.id,
      id,
      submissionId,
      dto,
    );
  }

  @UseGuards(AuthGuard)
  @Post(':id/project-room/submissions/:submissionId/deliver')
  deliverProjectSubmission(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Param('submissionId') submissionId: string,
    @Body(new ZodValidationPipe(escrowDto.deliverProjectSubmissionSchema))
    dto: escrowDto.DeliverProjectSubmissionDto,
    @RequestContext() requestContext?: RequestExecutionContext,
  ): Promise<EscrowProjectDeliverSubmissionResponse> {
    void dto;
    return this.escrowService.deliverProjectSubmission(
      user.id,
      id,
      submissionId,
      requestContext,
    );
  }

  @UseGuards(AuthGuard)
  @Post(':id/milestones')
  setMilestones(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(escrowDto.setMilestonesSchema))
    dto: escrowDto.SetMilestonesDto,
    @RequestContext() requestContext?: RequestExecutionContext,
  ): Promise<SetMilestonesResponse> {
    return this.escrowService.setMilestones(user.id, id, dto, requestContext);
  }

  @UseGuards(AuthGuard)
  @Post(':id/milestones/:m/deliver')
  deliver(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Param('m', ParseIntPipe) milestoneIndex: number,
    @Body(new ZodValidationPipe(escrowDto.deliverMilestoneSchema))
    dto: escrowDto.DeliverMilestoneDto,
    @RequestContext() requestContext?: RequestExecutionContext,
  ): Promise<MilestoneMutationResponse> {
    return this.escrowService.deliverMilestone(
      user.id,
      id,
      milestoneIndex,
      dto,
      requestContext,
    );
  }

  @UseGuards(AuthGuard)
  @Post(':id/milestones/:m/release')
  release(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Param('m', ParseIntPipe) milestoneIndex: number,
    @Body(new ZodValidationPipe(escrowDto.releaseMilestoneSchema))
    dto: escrowDto.ReleaseMilestoneDto,
    @RequestContext() requestContext?: RequestExecutionContext,
  ): Promise<MilestoneMutationResponse> {
    void dto;
    return this.escrowService.releaseMilestone(
      user.id,
      id,
      milestoneIndex,
      requestContext,
    );
  }

  @UseGuards(AuthGuard)
  @Post(':id/milestones/:m/dispute')
  dispute(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Param('m', ParseIntPipe) milestoneIndex: number,
    @Body(new ZodValidationPipe(escrowDto.disputeMilestoneSchema))
    dto: escrowDto.DisputeMilestoneDto,
    @RequestContext() requestContext?: RequestExecutionContext,
  ): Promise<MilestoneMutationResponse> {
    return this.escrowService.disputeMilestone(
      user.id,
      id,
      milestoneIndex,
      dto,
      requestContext,
    );
  }

  @UseGuards(AuthGuard)
  @Post(':id/milestones/:m/resolve')
  resolve(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Param('m', ParseIntPipe) milestoneIndex: number,
    @Body(new ZodValidationPipe(escrowDto.resolveMilestoneSchema))
    dto: escrowDto.ResolveMilestoneDto,
    @RequestContext() requestContext?: RequestExecutionContext,
  ): Promise<MilestoneMutationResponse> {
    return this.escrowService.resolveMilestone(
      user.id,
      id,
      milestoneIndex,
      dto,
      requestContext,
    );
  }

  @Get(':id/audit')
  audit(@Param('id') id: string): Promise<EscrowAuditBundle> {
    return this.escrowService.getAuditBundle(id);
  }

  @Get(':id/export')
  async exportArtifact(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(escrowDto.exportArtifactQuerySchema))
    query: escrowDto.ExportArtifactQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const document = await this.escrowService.getExportDocument(
      id,
      query.artifact,
      query.format,
    );

    response.setHeader('content-type', document.contentType);
    response.setHeader(
      'content-disposition',
      `attachment; filename="${document.fileName}"`,
    );
    response.setHeader('cache-control', 'no-store');

    return document.body;
  }
}
