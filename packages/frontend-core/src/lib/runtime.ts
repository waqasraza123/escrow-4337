export type RuntimeProfileSnapshot = {
  environment: {
    corsOrigins: string[];
    persistenceDriver: 'postgres' | 'file';
    trustProxyRaw: string | null;
  };
};

export type RuntimeAlignmentDiagnostics = {
  currentOrigin: string;
  transportLabel: 'HTTPS target' | 'HTTP target' | 'Invalid target';
  transportMessage: string;
  corsLabel:
    | 'Current origin allowed'
    | 'Origin blocked'
    | 'CORS not configured'
    | 'Runtime profile unavailable'
    | 'Origin unavailable';
  corsMessage: string;
  persistenceLabel: 'Postgres' | 'File' | 'Unknown';
  trustProxyLabel: string;
  corsOriginsLabel: string;
};

function normalizeOrigin(origin: string | null | undefined) {
  return origin?.trim().replace(/\/+$/, '') || null;
}

export function describeRuntimeAlignment(
  apiBaseUrl: string,
  runtimeProfile: RuntimeProfileSnapshot | null,
  currentOrigin?: string | null,
): RuntimeAlignmentDiagnostics {
  const normalizedCurrentOrigin = normalizeOrigin(currentOrigin);
  const normalizedCorsOrigins =
    runtimeProfile?.environment.corsOrigins
      .map((origin) => normalizeOrigin(origin))
      .filter((origin): origin is string => Boolean(origin)) ?? [];

  let transportLabel: RuntimeAlignmentDiagnostics['transportLabel'] = 'Invalid target';
  let transportMessage = 'API target is not a valid absolute URL.';

  try {
    const parsedApiBaseUrl = new URL(apiBaseUrl);
    if (parsedApiBaseUrl.protocol === 'https:') {
      transportLabel = 'HTTPS target';
      transportMessage = 'Browser traffic to the API target uses HTTPS.';
    } else {
      transportLabel = 'HTTP target';
      transportMessage = normalizedCurrentOrigin?.startsWith('https://')
        ? 'This page is secure but the API target is HTTP, so browser requests may be blocked as mixed content.'
        : 'API target uses HTTP. Keep this to local or explicitly trusted environments.';
    }
  } catch {
    // Keep invalid target defaults.
  }

  let corsLabel: RuntimeAlignmentDiagnostics['corsLabel'] = 'Origin unavailable';
  let corsMessage = 'Frontend origin is not available in this environment yet.';

  if (!normalizedCurrentOrigin) {
    corsLabel = 'Origin unavailable';
    corsMessage = 'Frontend origin is not available in this environment yet.';
  } else if (!runtimeProfile) {
    corsLabel = 'Runtime profile unavailable';
    corsMessage =
      'Backend runtime profile could not be loaded from the browser. Check API reachability, transport safety, and CORS policy.';
  } else if (normalizedCorsOrigins.length === 0) {
    corsLabel = 'CORS not configured';
    corsMessage =
      'Backend CORS allowlist is empty, so separate frontend origins may fail.';
  } else if (normalizedCorsOrigins.includes(normalizedCurrentOrigin)) {
    corsLabel = 'Current origin allowed';
    corsMessage =
      'Backend CORS allowlist includes the current frontend origin.';
  } else {
    corsLabel = 'Origin blocked';
    corsMessage =
      'Current frontend origin is missing from the backend CORS allowlist.';
  }

  return {
    currentOrigin: normalizedCurrentOrigin || 'Unavailable',
    transportLabel,
    transportMessage,
    corsLabel,
    corsMessage,
    persistenceLabel: !runtimeProfile
      ? 'Unknown'
      : runtimeProfile.environment.persistenceDriver === 'file'
        ? 'File'
        : 'Postgres',
    trustProxyLabel: runtimeProfile
      ? runtimeProfile.environment.trustProxyRaw || 'Not configured'
      : 'Unavailable',
    corsOriginsLabel: runtimeProfile
      ? normalizedCorsOrigins.join(', ') || 'None configured'
      : 'Unavailable',
  };
}
