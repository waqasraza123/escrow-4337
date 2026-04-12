import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createErrorState,
  createSuccessState,
  createWorkingState,
  defaultLocalApiPort,
  getLocaleDefinition,
  formatTimestamp,
  localeCookieName,
  previewHash,
  pushStoredStringList,
  readErrorMessage,
  readLocaleCookie,
  readContentDispositionFilename,
  requestDocument,
  requestJson,
  resolveLocalApiBaseUrl,
  syncDocumentLocale,
  saveDownloadedDocument,
  describeRuntimeAlignment,
  resolveApiBaseUrl,
  toErrorMessage,
} from '../index';
import * as frontendCore from '../index';

describe('frontend core helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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
    expect(
      formatTimestamp(1_700_000_000_000, { locale: 'ar' }),
    ).toBeTruthy();
    expect(previewHash(undefined)).toBe('Pending');
    expect(previewHash('0x1234567890abcdef')).toBe('0x12345678...abcdef');
  });

  it('resolves locale defaults and syncs document direction', () => {
    expect(readLocaleCookie(null)).toBe('en');
    expect(readLocaleCookie('ar')).toBe('ar');
    expect(getLocaleDefinition('ar')).toMatchObject({
      langTag: 'ar',
      dir: 'rtl',
    });

    vi.stubGlobal('document', {
      cookie: `${localeCookieName}=ar`,
      documentElement: {
        lang: 'en',
        dir: 'ltr',
        dataset: {},
      },
    });

    syncDocumentLocale('ar');

    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.dataset.locale).toBe('ar');
  });

  it('pushes deduplicated string lists with a limit', () => {
    expect(
      pushStoredStringList(['job-3', 'job-2', 'job-1'], 'job-2', 3),
    ).toEqual(['job-2', 'job-3', 'job-1']);
  });

  it('resolves API base URLs and error payloads consistently', async () => {
    expect(resolveLocalApiBaseUrl()).toBe(`http://localhost:${defaultLocalApiPort}`);
    expect(resolveApiBaseUrl('http://localhost:4100///')).toBe(
      'http://localhost:4100',
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
        resolveLocalApiBaseUrl(),
        '/test',
        {
          method: 'POST',
          body: JSON.stringify({ hello: 'world' }),
        },
        'token-123',
      ),
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      `${resolveLocalApiBaseUrl()}/test`,
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

  it('requests downloadable documents and parses attachment filenames', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('case export', {
        status: 200,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition':
            'attachment; filename="escrow-job-123-job-history.csv"',
        },
      }),
    );

    await expect(
      requestDocument(resolveLocalApiBaseUrl(), '/jobs/job-123/export'),
    ).resolves.toMatchObject({
      filename: 'escrow-job-123-job-history.csv',
      contentType: 'text/csv; charset=utf-8',
    });

    expect(
      readContentDispositionFilename(
        "attachment; filename*=UTF-8''escrow-job-123-dispute-case.json",
      ),
    ).toBe('escrow-job-123-dispute-case.json');
  });

  it('saves downloaded documents through a browser anchor', () => {
    const clickSpy = vi.fn();
    const anchor = {
      click: clickSpy,
      remove: vi.fn(),
      style: {},
      rel: '',
      href: '',
      download: '',
    };
    const createObjectUrl = vi.fn(() => 'blob:download');
    const revokeObjectUrl = vi.fn();
    vi.stubGlobal('window', {
      URL: {
        createObjectURL: createObjectUrl,
        revokeObjectURL: revokeObjectUrl,
      },
      setTimeout,
    });
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
      body: {
        appendChild: vi.fn(),
      },
    });

    saveDownloadedDocument({
      blob: new Blob(['hello'], { type: 'text/plain' }),
      filename: 'hello.txt',
      contentType: 'text/plain',
    });

    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(revokeObjectUrl).toHaveBeenCalledWith('blob:download');
        resolve();
      }, 0);
    });
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

    expect(
      describeRuntimeAlignment(
        'https://api.example.com',
        null,
        'https://web.example.com',
      ),
    ).toMatchObject({
      transportLabel: 'HTTPS target',
      corsLabel: 'Runtime profile unavailable',
      persistenceLabel: 'Unknown',
      trustProxyLabel: 'Unavailable',
      corsOriginsLabel: 'Unavailable',
    });
  });

  it('keeps the root export surface server-safe', () => {
    expect('WalkthroughOverlay' in frontendCore).toBe(false);
    expect('WalkthroughLauncherMenu' in frontendCore).toBe(false);
    expect('readStoredWalkthroughState' in frontendCore).toBe(false);
  });
});
