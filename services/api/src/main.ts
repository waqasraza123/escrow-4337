import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { isCorsOriginAllowed, readCorsOrigins } from './common/http/cors';
import { readApiPort } from './common/http/port';
import { readTrustProxyValue } from './common/http/trust-proxy';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = readApiPort();
  const trustProxy = readTrustProxyValue(process.env.NEST_API_TRUST_PROXY);

  if (trustProxy !== undefined) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxy);
  }

  const corsOrigins = readCorsOrigins(process.env.NEST_API_CORS_ORIGINS);
  if (corsOrigins.length > 0) {
    app.enableCors({
      origin(origin, callback) {
        callback(null, isCorsOriginAllowed(origin, corsOrigins));
      },
    });
  }

  try {
    await app.listen(port);
  } catch (error) {
    await app.close().catch(() => undefined);

    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'EADDRINUSE'
    ) {
      throw new Error(
        `API startup failed: port ${port} is already in use. Stop the other process or override NEST_API_PORT (or PORT). If you change the API port locally, update NEXT_PUBLIC_API_PORT in apps/web and apps/admin to match.`,
      );
    }

    throw error;
  }
}

void bootstrap().catch((error) => {
  if (error instanceof Error && error.message.startsWith('API startup failed:')) {
    console.error(error.message);
    process.exit(1);
    return;
  }

  console.error(error);
  process.exit(1);
});
