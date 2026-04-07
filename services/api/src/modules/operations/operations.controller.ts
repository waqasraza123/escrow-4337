import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { User, type ReqUser } from '../../common/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/zod.pipe';
import { AuthGuard } from '../auth/guards/auth.guard';
import { EscrowHealthService } from './escrow-health.service';
import * as operationsDto from './operations.dto';
import { RuntimeProfileService } from './runtime-profile.service';

@Controller('operations')
export class OperationsController {
  constructor(
    private readonly runtimeProfile: RuntimeProfileService,
    private readonly escrowHealth: EscrowHealthService,
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
}
