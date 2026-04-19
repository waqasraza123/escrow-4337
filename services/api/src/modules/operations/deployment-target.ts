export type DeploymentTargetEnvironment = 'staging' | 'production';

const DEPLOYMENT_TARGET_ENVIRONMENT_NAMES = [
  'DEPLOYMENT_TARGET_ENVIRONMENT',
  'LAUNCH_CANDIDATE_ENVIRONMENT',
  'DEPLOYED_SMOKE_ENVIRONMENT',
] as const;

function normalizeUrl(url: string) {
  return new URL(url).toString().replace(/\/+$/, '');
}

export function readDeploymentTargetEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): DeploymentTargetEnvironment | null {
  for (const envName of DEPLOYMENT_TARGET_ENVIRONMENT_NAMES) {
    const rawValue = env[envName]?.trim().toLowerCase();
    if (!rawValue) {
      continue;
    }

    if (rawValue === 'staging' || rawValue === 'production') {
      return rawValue;
    }

    throw new Error(
      `${envName} must be one of staging or production when set`,
    );
  }

  return null;
}

export function isStrictDeploymentValidationEnvironment(
  env: NodeJS.ProcessEnv = process.env,
) {
  return (
    env.NODE_ENV === 'production' || readDeploymentTargetEnvironment(env) !== null
  );
}

export function readOptionalAbsoluteUrl(
  value: string | undefined,
  envName: string,
) {
  const candidate = value?.trim();
  if (!candidate) {
    return null;
  }

  try {
    return normalizeUrl(candidate);
  } catch {
    throw new Error(`${envName} must be a valid absolute URL`);
  }
}

export function readBooleanFlag(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return (
    normalized === '1' ||
    normalized === 'true' ||
    normalized === 'yes' ||
    normalized === 'on'
  );
}

export function readRequiredDeployedBrowserTargets(
  env: NodeJS.ProcessEnv = process.env,
) {
  const webBaseUrl = readOptionalAbsoluteUrl(
    env.PLAYWRIGHT_DEPLOYED_WEB_BASE_URL,
    'PLAYWRIGHT_DEPLOYED_WEB_BASE_URL',
  );
  const adminBaseUrl = readOptionalAbsoluteUrl(
    env.PLAYWRIGHT_DEPLOYED_ADMIN_BASE_URL,
    'PLAYWRIGHT_DEPLOYED_ADMIN_BASE_URL',
  );
  const apiBaseUrl = readOptionalAbsoluteUrl(
    env.PLAYWRIGHT_DEPLOYED_API_BASE_URL,
    'PLAYWRIGHT_DEPLOYED_API_BASE_URL',
  );

  if (!webBaseUrl) {
    throw new Error('PLAYWRIGHT_DEPLOYED_WEB_BASE_URL must be set');
  }
  if (!adminBaseUrl) {
    throw new Error('PLAYWRIGHT_DEPLOYED_ADMIN_BASE_URL must be set');
  }
  if (!apiBaseUrl) {
    throw new Error('PLAYWRIGHT_DEPLOYED_API_BASE_URL must be set');
  }

  return {
    webBaseUrl,
    adminBaseUrl,
    apiBaseUrl,
  };
}

export function toOrigin(url: string) {
  return new URL(url).origin.replace(/\/+$/, '');
}

export function isLoopbackUrl(url: string) {
  const hostname = new URL(url).hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost')
  );
}
