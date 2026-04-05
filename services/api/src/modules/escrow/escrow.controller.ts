import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { User, type ReqUser } from '../../common/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/zod.pipe';
import { AuthGuard } from '../auth/guards/auth.guard';
import * as escrowDto from './escrow.dto';
import { EscrowService } from './escrow.service';
import type {
  CreateJobResponse,
  EscrowAuditBundle,
  EscrowJobsListResponse,
  FundJobResponse,
  MilestoneMutationResponse,
  SetMilestonesResponse,
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
  ): Promise<CreateJobResponse> {
    return this.escrowService.createJob(user.id, dto);
  }

  @UseGuards(AuthGuard)
  @Post(':id/fund')
  fund(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(escrowDto.fundJobSchema))
    dto: escrowDto.FundJobDto,
  ): Promise<FundJobResponse> {
    return this.escrowService.fundJob(user.id, id, dto);
  }

  @UseGuards(AuthGuard)
  @Post(':id/milestones')
  setMilestones(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(escrowDto.setMilestonesSchema))
    dto: escrowDto.SetMilestonesDto,
  ): Promise<SetMilestonesResponse> {
    return this.escrowService.setMilestones(user.id, id, dto);
  }

  @UseGuards(AuthGuard)
  @Post(':id/milestones/:m/deliver')
  deliver(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Param('m', ParseIntPipe) milestoneIndex: number,
    @Body(new ZodValidationPipe(escrowDto.deliverMilestoneSchema))
    dto: escrowDto.DeliverMilestoneDto,
  ): Promise<MilestoneMutationResponse> {
    return this.escrowService.deliverMilestone(
      user.id,
      id,
      milestoneIndex,
      dto,
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
  ): Promise<MilestoneMutationResponse> {
    void dto;
    return this.escrowService.releaseMilestone(user.id, id, milestoneIndex);
  }

  @UseGuards(AuthGuard)
  @Post(':id/milestones/:m/dispute')
  dispute(
    @User() user: ReqUser,
    @Param('id') id: string,
    @Param('m', ParseIntPipe) milestoneIndex: number,
    @Body(new ZodValidationPipe(escrowDto.disputeMilestoneSchema))
    dto: escrowDto.DisputeMilestoneDto,
  ): Promise<MilestoneMutationResponse> {
    return this.escrowService.disputeMilestone(
      user.id,
      id,
      milestoneIndex,
      dto,
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
  ): Promise<MilestoneMutationResponse> {
    return this.escrowService.resolveMilestone(
      user.id,
      id,
      milestoneIndex,
      dto,
    );
  }

  @Get(':id/audit')
  audit(@Param('id') id: string): Promise<EscrowAuditBundle> {
    return this.escrowService.getAuditBundle(id);
  }
}
