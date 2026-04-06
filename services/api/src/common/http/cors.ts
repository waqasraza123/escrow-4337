function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, '');
}

export function readCorsOrigins(value: string | undefined): string[] {
  const candidate = value?.trim();
  if (!candidate) {
    return [];
  }

  const origins = candidate.split(',').map(normalizeOrigin).filter(Boolean);

  for (const origin of origins) {
    try {
      const parsed = new URL(origin);
      if (!parsed.protocol || !parsed.host) {
        throw new Error('Missing protocol or host');
      }
    } catch {
      throw new Error(
        `NEST_API_CORS_ORIGINS must contain comma-separated absolute origins. Received: ${origin}`,
      );
    }
  }

  return [...new Set(origins)];
}

export function isCorsOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[],
) {
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(normalizeOrigin(origin));
}
