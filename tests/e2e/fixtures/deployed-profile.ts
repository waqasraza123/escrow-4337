import {
  describeRuntimeAlignment,
  type RuntimeAlignmentDiagnostics,
} from '@escrow4334/frontend-core';

type RuntimeProfileKind = 'mixed' | 'deployment-like';
type RuntimeProfileLabelKind = 'local-mock' | RuntimeProfileKind;

export type DeployedProfileConfig = {
  webBaseUrl: string;
  adminBaseUrl: string;
  apiBaseUrl: string;
  auditJobId: string | null;
  expectedProfile: RuntimeProfileKind;
  expectLaunchReady: boolean;
  allowInsecureHttp: boolean;
  allowLocalhost: boolean;
};

export type DeployedLaunchCandidateActorConfig = {
  email: string;
  otpCode: string;
  privateKey: string;
};

export type DeployedLaunchCandidateFlowConfig = {
  currencyAddress: string;
  client: DeployedLaunchCandidateActorConfig;
  contractor: DeployedLaunchCandidateActorConfig;
  operator: DeployedLaunchCandidateActorConfig;
};

export type RuntimeProfileResponse = {
  generatedAt: string;
  profile: 'local-mock' | 'mixed' | 'deployment-like';
  summary: string;
  environment: {
    corsOrigins: string[];
    persistenceDriver: 'postgres' | 'file';
    trustProxyRaw: string | null;
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
  warnings: string[];
};

function readBooleanFlag(value: string | undefined) {
  return value?.trim().toLowerCase() === 'true';
}

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function readRequiredEnv(env: NodeJS.ProcessEnv, key: string) {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(
      `PLAYWRIGHT_PROFILE=deployed requires ${key}. Copy .env.e2e.deployed.example to .env.e2e.deployed or export the variable explicitly.`,
    );
  }

  return value;
}

function readOptionalEnv(env: NodeJS.ProcessEnv, key: string) {
  return env[key]?.trim() || '';
}

function readRequiredGroup(
  env: NodeJS.ProcessEnv,
  keys: string[],
): Record<string, string> | null {
  const values = Object.fromEntries(keys.map((key) => [key, readOptionalEnv(env, key)]));
  const populated = Object.values(values).filter(Boolean).length;

  if (populated === 0) {
    return null;
  }

  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Deployed launch-candidate flow config is incomplete. Missing: ${missing.join(', ')}.`,
    );
  }

  return values;
}

function normalizeAbsoluteUrl(
  rawValue: string,
  name: string,
  {
    allowInsecureHttp,
    allowLocalhost,
  }: {
    allowInsecureHttp: boolean;
    allowLocalhost: boolean;
  },
) {
  let parsed: URL;

  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error(`${name} must be an absolute URL. Received: ${rawValue}`);
  }

  if (parsed.protocol !== 'https:' && !(allowInsecureHttp && parsed.protocol === 'http:')) {
    throw new Error(
      `${name} must use https unless PLAYWRIGHT_DEPLOYED_ALLOW_INSECURE_HTTP=true. Received: ${rawValue}`,
    );
  }

  if (!allowLocalhost && isLocalHostname(parsed.hostname)) {
    throw new Error(
      `${name} must not target localhost unless PLAYWRIGHT_DEPLOYED_ALLOW_LOCALHOST=true. Received: ${rawValue}`,
    );
  }

  return parsed.toString().replace(/\/+$/, '');
}

export function readDeployedProfileConfig(
  env: NodeJS.ProcessEnv = process.env,
): DeployedProfileConfig {
  const allowInsecureHttp = readBooleanFlag(env.PLAYWRIGHT_DEPLOYED_ALLOW_INSECURE_HTTP);
  const allowLocalhost = readBooleanFlag(env.PLAYWRIGHT_DEPLOYED_ALLOW_LOCALHOST);
  const expectedProfileRaw = env.PLAYWRIGHT_DEPLOYED_EXPECT_PROFILE?.trim() || 'deployment-like';

  if (expectedProfileRaw !== 'deployment-like' && expectedProfileRaw !== 'mixed') {
    throw new Error(
      `PLAYWRIGHT_DEPLOYED_EXPECT_PROFILE must be deployment-like or mixed. Received: ${expectedProfileRaw}`,
    );
  }

  return {
    webBaseUrl: normalizeAbsoluteUrl(
      readRequiredEnv(env, 'PLAYWRIGHT_DEPLOYED_WEB_BASE_URL'),
      'PLAYWRIGHT_DEPLOYED_WEB_BASE_URL',
      {
        allowInsecureHttp,
        allowLocalhost,
      },
    ),
    adminBaseUrl: normalizeAbsoluteUrl(
      readRequiredEnv(env, 'PLAYWRIGHT_DEPLOYED_ADMIN_BASE_URL'),
      'PLAYWRIGHT_DEPLOYED_ADMIN_BASE_URL',
      {
        allowInsecureHttp,
        allowLocalhost,
      },
    ),
    apiBaseUrl: normalizeAbsoluteUrl(
      readRequiredEnv(env, 'PLAYWRIGHT_DEPLOYED_API_BASE_URL'),
      'PLAYWRIGHT_DEPLOYED_API_BASE_URL',
      {
        allowInsecureHttp,
        allowLocalhost,
      },
    ),
    auditJobId: env.PLAYWRIGHT_DEPLOYED_AUDIT_JOB_ID?.trim() || null,
    expectedProfile: expectedProfileRaw,
    expectLaunchReady: readBooleanFlag(env.PLAYWRIGHT_DEPLOYED_EXPECT_LAUNCH_READY),
    allowInsecureHttp,
    allowLocalhost,
  };
}

export function readDeployedLaunchCandidateFlowConfig(
  env: NodeJS.ProcessEnv = process.env,
): DeployedLaunchCandidateFlowConfig | null {
  const values = readRequiredGroup(env, [
    'PLAYWRIGHT_DEPLOYED_FLOW_CURRENCY_ADDRESS',
    'PLAYWRIGHT_DEPLOYED_FLOW_CLIENT_EMAIL',
    'PLAYWRIGHT_DEPLOYED_FLOW_CLIENT_OTP_CODE',
    'PLAYWRIGHT_DEPLOYED_FLOW_CLIENT_PRIVATE_KEY',
    'PLAYWRIGHT_DEPLOYED_FLOW_CONTRACTOR_EMAIL',
    'PLAYWRIGHT_DEPLOYED_FLOW_CONTRACTOR_OTP_CODE',
    'PLAYWRIGHT_DEPLOYED_FLOW_CONTRACTOR_PRIVATE_KEY',
    'PLAYWRIGHT_DEPLOYED_FLOW_OPERATOR_EMAIL',
    'PLAYWRIGHT_DEPLOYED_FLOW_OPERATOR_OTP_CODE',
    'PLAYWRIGHT_DEPLOYED_FLOW_OPERATOR_PRIVATE_KEY',
  ]);

  if (!values) {
    return null;
  }

  return {
    currencyAddress: values.PLAYWRIGHT_DEPLOYED_FLOW_CURRENCY_ADDRESS,
    client: {
      email: values.PLAYWRIGHT_DEPLOYED_FLOW_CLIENT_EMAIL,
      otpCode: values.PLAYWRIGHT_DEPLOYED_FLOW_CLIENT_OTP_CODE,
      privateKey: values.PLAYWRIGHT_DEPLOYED_FLOW_CLIENT_PRIVATE_KEY,
    },
    contractor: {
      email: values.PLAYWRIGHT_DEPLOYED_FLOW_CONTRACTOR_EMAIL,
      otpCode: values.PLAYWRIGHT_DEPLOYED_FLOW_CONTRACTOR_OTP_CODE,
      privateKey: values.PLAYWRIGHT_DEPLOYED_FLOW_CONTRACTOR_PRIVATE_KEY,
    },
    operator: {
      email: values.PLAYWRIGHT_DEPLOYED_FLOW_OPERATOR_EMAIL,
      otpCode: values.PLAYWRIGHT_DEPLOYED_FLOW_OPERATOR_OTP_CODE,
      privateKey: values.PLAYWRIGHT_DEPLOYED_FLOW_OPERATOR_PRIVATE_KEY,
    },
  };
}

export function getRuntimeProfileLabel(profile: RuntimeProfileLabelKind) {
  switch (profile) {
    case 'local-mock':
      return 'Local mock';
    case 'deployment-like':
      return 'Deployment-like';
    case 'mixed':
      return 'Mixed';
  }
}

export function describeDeployedRuntimeAlignment(
  apiBaseUrl: string,
  currentOrigin: string,
  runtimeProfile: RuntimeProfileResponse | null,
): RuntimeAlignmentDiagnostics {
  return describeRuntimeAlignment(
    apiBaseUrl,
    runtimeProfile
      ? {
          environment: runtimeProfile.environment,
        }
      : null,
    currentOrigin,
  );
}
