export const defaultLocalApiPort = '4100';

export function resolveLocalApiBaseUrl(localApiPort?: string) {
  const port = localApiPort?.trim() || defaultLocalApiPort;
  return `http://localhost:${port}`;
}

export function resolveApiBaseUrl(
  envValue?: string,
  defaultApiBaseUrl = resolveLocalApiBaseUrl(),
) {
  return envValue?.trim().replace(/\/+$/, '') || defaultApiBaseUrl;
}

export function createQueryString(
  query?: Record<string, string | number | boolean | null | undefined>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }

  const value = search.toString();
  return value ? `?${value}` : '';
}

export async function readErrorMessage(response: Response) {
  const text = await response.text();
  if (!text) {
    return `Request failed with ${response.status}`;
  }

  try {
    const body = JSON.parse(text) as {
      message?: string | string[];
      error?: string;
    };
    if (Array.isArray(body.message)) {
      return body.message.join(', ');
    }

    return body.message || body.error || text;
  } catch {
    return text;
  }
}

export async function requestJson<T>(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
  accessToken?: string | null,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
