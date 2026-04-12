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

export type ChainIngestionRuntimePosture = {
  enabled: boolean;
  authorityReadsEnabled: boolean;
  status: 'ok' | 'warning' | 'failed';
  summary: string;
  confirmationDepth: number;
  batchBlocks: number;
  resyncBlocks: number;
  latestBlock: number | null;
  finalizedBlock: number | null;
  lagBlocks: number | null;
  cursor: {
    nextFromBlock: number | null;
    lastFinalizedBlock: number | null;
    lastScannedBlock: number | null;
    updatedAt: number | null;
  };
  projections: {
    totalJobs: number;
    projectedJobs: number;
    healthyJobs: number;
    degradedJobs: number;
    staleJobs: number;
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
    chainIngestion: ChainIngestionRuntimePosture;
    chainSyncDaemon: ChainSyncDaemonRuntimePosture;
  };
  warnings: string[];
};
