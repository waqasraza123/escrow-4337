import { Module } from '@nestjs/common';
import { EmailConfigService } from './email.config';
import { EmailTemplateService } from './email-template.service';
import { RelayEmailProvider } from './relay-email.provider';
import { MockEmailProvider } from './mock-email.provider';
import { EMAIL_PROVIDER } from './email.tokens';

@Module({
  providers: [
    EmailConfigService,
    EmailTemplateService,
    RelayEmailProvider,
    MockEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      inject: [EmailConfigService, RelayEmailProvider, MockEmailProvider],
      useFactory: (
        config: EmailConfigService,
        relayProvider: RelayEmailProvider,
        mockProvider: MockEmailProvider,
      ) => (config.mode === 'mock' ? mockProvider : relayProvider),
    },
  ],
  exports: [EmailConfigService, EmailTemplateService, EMAIL_PROVIDER],
})
export class AuthEmailModule {}
