import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createErrorState,
  createSuccessState,
  createWorkingState,
  formatTimestamp,
  previewHash,
  pushStoredStringList,
  readErrorMessage,
  requestJson,
  describeRuntimeAlignment,
  resolveApiBaseUrl,
  toErrorMessage,
} from '../index';

describe('frontend core helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats async state and errors consistently', () => {
    expect(createWorkingState('Loading')).toEqual({
      kind: 'working',
      message: 'Loading',
    });
    expect(createSuccessState('Ready')).toEqual({
      kind: 'success',
      message: 'Ready',
    });
    expect(toErrorMessage(new Error('Boom'), 'Fallback')).toBe('Boom');
    expect(createErrorState(null, 'Fallback')).toEqual({
      kind: 'error',
      message: 'Fallback',
    });
  });

  it('normalizes timestamps and hash previews', () => {
    expect(formatTimestamp(null)).toBe('Not available');
    expect(previewHash(undefined)).toBe('Pending');
    expect(previewHash('0x1234567890abcdef')).toBe('0x12345678...abcdef');
  });

  it('pushes deduplicated string lists with a limit', () => {
    expect(
      pushStoredStringList(['job-3', 'job-2', 'job-1'], 'job-2', 3),
    ).toEqual(['job-2', 'job-3', 'job-1']);
  });

  it('resolves API base URLs and error payloads consistently', async () => {
    expect(resolveApiBaseUrl('http://localhost:4000///')).toBe(
      'http://localhost:4000',
    );

    const response = new Response(
      JSON.stringify({ message: ['a', 'b'], error: 'ignored' }),
      { status: 400 },
    );
    await expect(readErrorMessage(response)).resolves.toBe('a, b');
  });

  it('makes JSON requests with shared header handling', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

    await expect(
      requestJson<{ ok: true }>(
        'http://localhost:4000',
        '/test',
        {
          method: 'POST',
          body: JSON.stringify({ hello: 'world' }),
        },
        'token-123',
      ),
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ hello: 'world' }),
        headers: expect.any(Headers),
      }),
    );

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('authorization')).toBe('Bearer token-123');
  });

  it('describes runtime alignment for deployment diagnostics', () => {
    expect(
      describeRuntimeAlignment(
        'https://api.example.com',
        {
          environment: {
            corsOrigins: ['https://web.example.com'],
            persistenceDriver: 'postgres',
            trustProxyRaw: 'loopback',
          },
        },
        'https://web.example.com',
      ),
    ).toMatchObject({
      currentOrigin: 'https://web.example.com',
      transportLabel: 'HTTPS target',
      corsLabel: 'Current origin allowed',
      persistenceLabel: 'Postgres',
      trustProxyLabel: 'loopback',
      corsOriginsLabel: 'https://web.example.com',
    });

    expect(
      describeRuntimeAlignment(
        'http://api.example.com',
        {
          environment: {
            corsOrigins: [],
            persistenceDriver: 'file',
            trustProxyRaw: null,
          },
        },
        'https://web.example.com',
      ),
    ).toMatchObject({
      transportLabel: 'HTTP target',
      corsLabel: 'CORS not configured',
      persistenceLabel: 'File',
      trustProxyLabel: 'Not configured',
    });
  });
});
