function normalizePath(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}

export function resolvePublicAppHref(path: string) {
  const normalizedPath = normalizePath(path);
  const configuredBaseUrl = process.env.NEXT_PUBLIC_WEB_BASE_URL?.trim();

  if (!configuredBaseUrl) {
    return normalizedPath;
  }

  try {
    const baseUrl = configuredBaseUrl.endsWith('/')
      ? configuredBaseUrl
      : `${configuredBaseUrl}/`;
    return new URL(normalizedPath, baseUrl).toString();
  } catch {
    return normalizedPath;
  }
}
