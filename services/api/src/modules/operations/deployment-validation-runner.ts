import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { loadApiEnvironment } from '../../common/env/load-env';
import { OperationsModule } from './operations.module';
import { DeploymentValidationService } from './deployment-validation.service';

async function main() {
  loadApiEnvironment();

  const app = await NestFactory.createApplicationContext(OperationsModule, {
    logger: false,
  });

  try {
    const validation = app.get(DeploymentValidationService);
    const report = await validation.runValidation();
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));

    if (!report.ok) {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
