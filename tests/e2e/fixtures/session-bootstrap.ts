import type { StorageState } from '@playwright/test';

export type BootstrapSessionTokens = {
  accessToken: string;
  refreshToken: string;
};

type VerifyAuthResponse = BootstrapSessionTokens & {
  user: {
    id: string;
    email: string;
  };
};

async function readErrorMessage(response: Response) {
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

async function apiJson<T>(
  apiBaseUrl: string,
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
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

export async function createApiSession(input: {
  apiBaseUrl: string;
  email: string;
  otpCode: string;
}): Promise<BootstrapSessionTokens> {
  const { apiBaseUrl, email, otpCode } = input;

  await apiJson<{ ok: true }>(apiBaseUrl, '/auth/start', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  const response = await apiJson<VerifyAuthResponse>(apiBaseUrl, '/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code: otpCode }),
  });

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  };
}

export function createSessionStorageState(input: {
  origin: string;
  storageKey: string;
  session: BootstrapSessionTokens;
}): StorageState {
  return {
    cookies: [],
    origins: [
      {
        origin: input.origin,
        localStorage: [
          {
            name: input.storageKey,
            value: JSON.stringify(input.session),
          },
        ],
      },
    ],
  };
}
