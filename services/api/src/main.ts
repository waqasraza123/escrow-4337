import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { readTrustProxyValue } from './common/http/trust-proxy';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const trustProxy = readTrustProxyValue(process.env.NEST_API_TRUST_PROXY);

  if (trustProxy !== undefined) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxy);
  }

  await app.listen(process.env.NEST_API_PORT ?? 4000);
}

void bootstrap();
