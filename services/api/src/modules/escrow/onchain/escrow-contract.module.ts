import { Module } from '@nestjs/common';
import { EscrowContractConfigService } from './escrow-contract.config';
import { RelayEscrowContractGateway } from './relay-escrow-contract.gateway';
import { MockEscrowContractGateway } from './mock-escrow-contract.gateway';
import { ESCROW_CONTRACT_GATEWAY } from './escrow-contract.tokens';

@Module({
  providers: [
    EscrowContractConfigService,
    RelayEscrowContractGateway,
    MockEscrowContractGateway,
    {
      provide: ESCROW_CONTRACT_GATEWAY,
      inject: [
        EscrowContractConfigService,
        RelayEscrowContractGateway,
        MockEscrowContractGateway,
      ],
      useFactory: (
        config: EscrowContractConfigService,
        relayGateway: RelayEscrowContractGateway,
        mockGateway: MockEscrowContractGateway,
      ) => (config.mode === 'mock' ? mockGateway : relayGateway),
    },
  ],
  exports: [EscrowContractConfigService, ESCROW_CONTRACT_GATEWAY],
})
export class EscrowContractModule {}
