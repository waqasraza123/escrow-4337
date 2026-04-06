import type { PersistenceDriver } from '../../persistence/persistence.types';

export type RuntimeProfileKind = 'local-mock' | 'mixed' | 'deployment-like';

export type BackendRuntimeProfile = {
  generatedAt: string;
  profile: RuntimeProfileKind;
  summary: string;
  environment: {
    nodeEnv: string;
    persistenceDriver: PersistenceDriver;
    trustProxyRaw: string | null;
    corsOrigins: string[];
  };
  providers: {
    emailMode: 'mock' | 'relay';
    smartAccountMode: 'mock' | 'relay';
    escrowMode: 'mock' | 'relay';
  };
  operator: {
    arbitratorAddress: string | null;
    resolutionAuthority: 'linked_arbitrator_wallet';
    exportSupport: false;
  };
  warnings: string[];
};
