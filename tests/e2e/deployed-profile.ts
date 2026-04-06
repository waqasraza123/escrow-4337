type RuntimeProfileKind = 'mixed' | 'deployment-like';

export type DeployedProfileConfig = {
  webBaseUrl: string;
  adminBaseUrl: string;
  apiBaseUrl: string;
  auditJobId: string | null;
  expectedProfile: RuntimeProfileKind;
  allowInsecureHttp: boolean;
  allowLocalhost: boolean;
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
  const expectedProfileRaw =
    env.PLAYWRIGHT_DEPLOYED_EXPECT_PROFILE?.trim() || 'deployment-like';

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
    allowInsecureHttp,
    allowLocalhost,
  };
}

export function getRuntimeProfileLabel(profile: RuntimeProfileKind) {
  switch (profile) {
    case 'deployment-like':
      return 'Deployment-like';
    case 'mixed':
      return 'Mixed';
  }
}
