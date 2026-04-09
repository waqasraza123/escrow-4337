import { Injectable } from '@nestjs/common';
import { readCorsOrigins } from '../../common/http/cors';
import { EmailConfigService } from '../auth/email/email.config';
import { EscrowContractConfigService } from '../escrow/onchain/escrow-contract.config';
import { PersistenceConfigService } from '../../persistence/persistence.config';
import { SmartAccountConfigService } from '../wallet/provisioning/smart-account.config';
import { EscrowChainSyncDaemonDeploymentService } from './escrow-chain-sync-daemon-deployment.service';
import type { BackendRuntimeProfile } from './runtime-profile.types';

@Injectable()
export class RuntimeProfileService {
  constructor(
    private readonly emailConfig: EmailConfigService,
    private readonly escrowConfig: EscrowContractConfigService,
    private readonly persistenceConfig: PersistenceConfigService,
    private readonly smartAccountConfig: SmartAccountConfigService,
    private readonly daemonDeployment: EscrowChainSyncDaemonDeploymentService,
  ) {}

  getProfile(): BackendRuntimeProfile {
    const environment = {
      nodeEnv: process.env.NODE_ENV || 'development',
      persistenceDriver: this.persistenceConfig.driver,
      trustProxyRaw: process.env.NEST_API_TRUST_PROXY?.trim() || null,
      corsOrigins: readCorsOrigins(process.env.NEST_API_CORS_ORIGINS),
    };
    const providers = {
      emailMode: this.emailConfig.mode,
      smartAccountMode: this.smartAccountConfig.mode,
      escrowMode: this.escrowConfig.mode,
    };
    const daemonPosture = this.daemonDeployment.getPosture();
    const warnings: string[] = [];

    if (environment.persistenceDriver !== 'postgres') {
      warnings.push(
        'Persistence is not using Postgres, so this backend profile is not deployment-ready.',
      );
    }

    if (providers.emailMode === 'mock') {
      warnings.push(
        'Auth email delivery is using mock mode, so OTP behavior is not exercising a deployed relay.',
      );
    }

    if (providers.smartAccountMode === 'mock') {
      warnings.push(
        'Smart-account provisioning is using mock mode, so wallet onboarding is not exercising deployed relay infrastructure.',
      );
    }

    if (providers.escrowMode === 'mock') {
      warnings.push(
        'Escrow execution is using mock mode, so lifecycle mutations are not exercising deployed contract relay infrastructure.',
      );
    }

    if (environment.corsOrigins.length === 0) {
      warnings.push(
        'No browser CORS origins are configured. Separate frontend origins may fail against this backend profile.',
      );
    }

    warnings.push(...daemonPosture.issues, ...daemonPosture.warnings);

    const allRelaysEnabled =
      environment.persistenceDriver === 'postgres' &&
      providers.emailMode === 'relay' &&
      providers.smartAccountMode === 'relay' &&
      providers.escrowMode === 'relay';
    const allMocksEnabled =
      providers.emailMode === 'mock' &&
      providers.smartAccountMode === 'mock' &&
      providers.escrowMode === 'mock';

    const profile = allRelaysEnabled
      ? 'deployment-like'
      : allMocksEnabled
        ? 'local-mock'
        : 'mixed';

    return {
      generatedAt: new Date().toISOString(),
      profile,
      summary: this.buildSummary(profile),
      environment,
      providers,
      operator: {
        arbitratorAddress: this.readArbitratorAddress(),
        resolutionAuthority: 'linked_arbitrator_wallet',
        exportSupport: true,
      },
      operations: {
        chainSyncDaemon: daemonPosture,
      },
      warnings,
    };
  }

  private buildSummary(profile: BackendRuntimeProfile['profile']) {
    switch (profile) {
      case 'deployment-like':
        return 'This backend profile is relay-backed and aligned with deployed infrastructure expectations.';
      case 'local-mock':
        return 'This backend profile is optimized for local development and uses mock providers for operator-visible flows.';
      case 'mixed':
        return 'This backend profile mixes deployed and mock dependencies. Validate operator behavior carefully before treating it as staging-ready.';
    }
  }

  private readArbitratorAddress() {
    try {
      return this.escrowConfig.arbitratorAddress;
    } catch {
      return null;
    }
  }
}
