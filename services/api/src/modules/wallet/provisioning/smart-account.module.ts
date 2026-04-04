import { Module } from '@nestjs/common';
import { SmartAccountConfigService } from './smart-account.config';
import { MockSmartAccountProvider } from './mock-smart-account.provider';
import { SmartAccountPolicyService } from './smart-account-policy.service';
import { RelaySmartAccountProvider } from './relay-smart-account.provider';
import { SMART_ACCOUNT_PROVIDER } from './smart-account.tokens';

@Module({
  providers: [
    SmartAccountConfigService,
    SmartAccountPolicyService,
    RelaySmartAccountProvider,
    MockSmartAccountProvider,
    {
      provide: SMART_ACCOUNT_PROVIDER,
      inject: [
        SmartAccountConfigService,
        RelaySmartAccountProvider,
        MockSmartAccountProvider,
      ],
      useFactory: (
        config: SmartAccountConfigService,
        relayProvider: RelaySmartAccountProvider,
        mockProvider: MockSmartAccountProvider,
      ) => (config.mode === 'mock' ? mockProvider : relayProvider),
    },
  ],
  exports: [
    SmartAccountConfigService,
    SmartAccountPolicyService,
    SMART_ACCOUNT_PROVIDER,
  ],
})
export class SmartAccountModule {}
