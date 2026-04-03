import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../common/zod.pipe';
import * as escrowDto from './escrow.dto';
import { EscrowService } from './escrow.service';

@Controller('jobs')
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(escrowDto.createJobSchema))
    dto: escrowDto.CreateJobDto,
  ) {
    return this.escrowService.createJob(dto);
  }

  @Post(':id/fund')
  fund(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(escrowDto.fundJobSchema))
    dto: escrowDto.FundJobDto,
  ) {
    return this.escrowService.fundJob(id, dto);
  }

  @Post(':id/milestones')
  setMilestones(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(escrowDto.setMilestonesSchema))
    dto: escrowDto.SetMilestonesDto,
  ) {
    return this.escrowService.setMilestones(id, dto);
  }

  @Post(':id/milestones/:m/deliver')
  deliver(
    @Param('id') id: string,
    @Param('m', ParseIntPipe) milestoneIndex: number,
    @Body(new ZodValidationPipe(escrowDto.deliverMilestoneSchema))
    dto: escrowDto.DeliverMilestoneDto,
  ) {
    return this.escrowService.deliverMilestone(id, milestoneIndex, dto);
  }

  @Post(':id/milestones/:m/release')
  release(
    @Param('id') id: string,
    @Param('m', ParseIntPipe) milestoneIndex: number,
  ) {
    return this.escrowService.releaseMilestone(id, milestoneIndex);
  }

  @Post(':id/milestones/:m/dispute')
  dispute(
    @Param('id') id: string,
    @Param('m', ParseIntPipe) milestoneIndex: number,
    @Body(new ZodValidationPipe(escrowDto.disputeMilestoneSchema))
    dto: escrowDto.DisputeMilestoneDto,
  ) {
    return this.escrowService.disputeMilestone(id, milestoneIndex, dto);
  }

  @Post(':id/milestones/:m/resolve')
  resolve(
    @Param('id') id: string,
    @Param('m', ParseIntPipe) milestoneIndex: number,
    @Body(new ZodValidationPipe(escrowDto.resolveMilestoneSchema))
    dto: escrowDto.ResolveMilestoneDto,
  ) {
    return this.escrowService.resolveMilestone(id, milestoneIndex, dto);
  }

  @Get(':id/audit')
  audit(@Param('id') id: string) {
    return this.escrowService.getAuditBundle(id);
  }
}
