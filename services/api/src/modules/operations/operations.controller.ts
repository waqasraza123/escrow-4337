import { Controller, Get } from '@nestjs/common';
import { RuntimeProfileService } from './runtime-profile.service';

@Controller('operations')
export class OperationsController {
  constructor(private readonly runtimeProfile: RuntimeProfileService) {}

  @Get('runtime-profile')
  getRuntimeProfile() {
    return this.runtimeProfile.getProfile();
  }
}
