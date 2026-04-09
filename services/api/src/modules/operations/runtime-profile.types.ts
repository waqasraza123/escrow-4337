import type { PersistenceDriver } from '../../persistence/persistence.types';

export type RuntimeProfileKind = 'local-mock' | 'mixed' | 'deployment-like';

export type ChainSyncDaemonRuntimePosture = {
  status: 'ok' | 'warning' | 'failed';
  summary: string;
  required: boolean;
  rpcConfigured: boolean;
  persistDefault: boolean;
  intervalSeconds: number;
  runOnStart: boolean;
  lockProvider: 'local' | 'postgres_advisory';
  alertingConfigured: boolean;
  alertMinSeverity: 'warning' | 'critical';
  alertSendRecovery: boolean;
  alertResendIntervalSeconds: number;
  thresholds: {
    maxHeartbeatAgeSeconds: number;
    maxCurrentRunAgeSeconds: number;
    maxConsecutiveFailures: number;
    maxConsecutiveSkips: number;
  };
  issues: string[];
  warnings: string[];
};

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
    exportSupport: boolean;
  };
  operations: {
    chainSyncDaemon: ChainSyncDaemonRuntimePosture;
  };
  warnings: string[];
};
