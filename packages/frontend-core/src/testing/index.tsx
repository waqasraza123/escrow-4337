import type { ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react';

export function renderApp(ui: ReactElement): RenderResult {
  return render(ui);
}

export function seedJsonStorage(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function clearBrowserStorage() {
  window.localStorage.clear();
  window.sessionStorage.clear();
}

export function createJsonResponse(
  body: unknown,
  init: ResponseInit = {},
) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  });
}
