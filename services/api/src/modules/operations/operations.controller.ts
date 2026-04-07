import { Controller, Get, UseGuards } from '@nestjs/common';
import { User, type ReqUser } from '../../common/decorators/user.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { EscrowHealthService } from './escrow-health.service';
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
  getEscrowHealth(@User() user: ReqUser) {
    return this.escrowHealth.getReport(user.id);
  }
}
