import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { clearBrowserStorage } from '@escrow4334/frontend-core/testing';

afterEach(() => {
  cleanup();
  clearBrowserStorage();
});
