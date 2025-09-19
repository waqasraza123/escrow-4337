import { Body, Controller, Get, Param, Post } from '@nestjs/common';

@Controller('jobs')
export class EscrowController {
  @Post() create(
    @Body() dto: { title: string; description: string; termsJSON: any },
  ) {
    console.log(dto);
    return { jobId: 1, jobHash: '0x...' };
  }
  @Post(':id/fund') fund(
    @Param('id') id: string,
    @Body() dto: { amount: string },
  ) {
    console.log(dto, id);
    return { prepared: true };
  }
  @Post(':id/milestones') setMilestones(
    @Param('id') id: string,
    @Body() dto: any[],
  ) {
    console.log(dto, id);
    return { ok: true };
  }
  @Post(':id/milestones/:m/deliver') deliver() {
    return { ok: true };
  }
  @Post(':id/milestones/:m/release') release() {
    return { ok: true };
  }
  @Post(':id/milestones/:m/dispute') dispute() {
    return { ok: true };
  }
  @Post(':id/milestones/:m/resolve') resolve() {
    return { ok: true };
  }
  @Get(':id/audit') audit() {
    return { bundle: {} };
  }
}
