export type ReqUser = {
  id: string;
  email: string;
  sid: string;
};

export type AuthenticatedRequest = {
  headers: {
    authorization?: string | string[] | undefined;
    'x-request-id'?: string | string[] | undefined;
    'idempotency-key'?: string | string[] | undefined;
    'x-idempotency-key'?: string | string[] | undefined;
  };
  user?: ReqUser;
  requestId?: string;
  idempotencyKey?: string | null;
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
