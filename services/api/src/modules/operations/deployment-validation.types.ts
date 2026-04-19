export type DeploymentCheckStatus = 'ok' | 'warning' | 'failed' | 'skipped';

export type DeploymentCheck = {
  id: string;
  status: DeploymentCheckStatus;
  summary: string;
  details?: string;
  metadata?: Record<string, unknown>;
};

export type DeploymentValidationReport = {
  generatedAt: string;
  ok: boolean;
  environment: {
    nodeEnv: string;
    targetEnvironment: 'staging' | 'production' | null;
    strictValidation: boolean;
    persistenceDriver: string;
    trustProxyRaw: string | null;
    trustProxyParsed: boolean | number | string | null;
  };
  checks: DeploymentCheck[];
};
