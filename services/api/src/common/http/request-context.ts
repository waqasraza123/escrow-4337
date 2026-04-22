import { randomBytes } from 'crypto';

const requestTokenPattern = /^[A-Za-z0-9._:-]{8,200}$/;

export type RequestExecutionContext = {
  requestId: string;
  idempotencyKey: string | null;
};

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
  requestId?: string;
  idempotencyKey?: string | null;
};

function readHeaderValue(
  headers: RequestLike['headers'],
  name: string,
): string | null {
  if (!headers) {
    return null;
  }

  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : null;
  }

  return typeof value === 'string' ? value : null;
}

function normalizeToken(raw: string | null): string | null {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim();
  if (!requestTokenPattern.test(normalized)) {
    return null;
  }

  return normalized;
}

export function createRequestId(prefix: 'req' | 'svc' = 'req') {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

export function readRequestExecutionContext(
  request: unknown,
): RequestExecutionContext {
  if (typeof request !== 'object' || request === null) {
    return {
      requestId: createRequestId('svc'),
      idempotencyKey: null,
    };
  }

  const candidate = request as RequestLike;
  const requestId =
    normalizeToken(candidate.requestId ?? null) ??
    normalizeToken(readHeaderValue(candidate.headers, 'x-request-id')) ??
    createRequestId('req');
  const idempotencyKey =
    normalizeToken(candidate.idempotencyKey ?? null) ??
    normalizeToken(readHeaderValue(candidate.headers, 'idempotency-key')) ??
    normalizeToken(readHeaderValue(candidate.headers, 'x-idempotency-key'));

  return {
    requestId,
    idempotencyKey,
  };
}
