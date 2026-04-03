export type ReqUser = {
  id: string;
  email: string;
  sid: string;
};

export type AuthenticatedRequest = {
  headers: {
    authorization?: string | string[] | undefined;
  };
  user?: ReqUser;
};

export function isAuthenticatedRequest(
  value: unknown,
): value is AuthenticatedRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('headers' in value)) {
    return false;
  }

  const candidate = value as { headers?: unknown };
  return typeof candidate.headers === 'object' && candidate.headers !== null;
}
