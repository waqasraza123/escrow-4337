export const defaultLocalApiPort = '4100';

export function resolveLocalApiBaseUrl(
  localApiPort = process.env.NEXT_PUBLIC_API_PORT,
) {
  const port = localApiPort?.trim() || defaultLocalApiPort;
  return `http://localhost:${port}`;
}

export function resolveApiBaseUrl(
  envValue?: string,
  defaultApiBaseUrl = resolveLocalApiBaseUrl(),
) {
  return envValue?.trim().replace(/\/+$/, '') || defaultApiBaseUrl;
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
  accessToken?: string,
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

export type DownloadedDocument = {
  blob: Blob;
  filename: string | null;
  contentType: string | null;
};

export function readContentDispositionFilename(
  contentDisposition: string | null,
) {
  if (!contentDisposition) {
    return null;
  }

  const encodedMatch = contentDisposition.match(
    /filename\*=UTF-8''([^;]+)/i,
  );
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch {
      return encodedMatch[1];
    }
  }

  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] || null;
}

export async function requestDocument(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<DownloadedDocument> {
  const headers = new Headers(init.headers);
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

  return {
    blob: await response.blob(),
    filename: readContentDispositionFilename(
      response.headers.get('content-disposition'),
    ),
    contentType: response.headers.get('content-type'),
  };
}

export function saveDownloadedDocument(documentToSave: DownloadedDocument) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Document download is only available in the browser.');
  }

  const objectUrl = window.URL.createObjectURL(documentToSave.blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = documentToSave.filename || 'download';
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 0);
}
