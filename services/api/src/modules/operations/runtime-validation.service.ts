import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DeploymentValidationService } from './deployment-validation.service';

@Injectable()
export class RuntimeValidationService implements OnApplicationBootstrap {
  constructor(
    private readonly deploymentValidation: DeploymentValidationService,
  ) {}

  onApplicationBootstrap() {
    this.deploymentValidation.assertRuntimeConfiguration();
  }
}
