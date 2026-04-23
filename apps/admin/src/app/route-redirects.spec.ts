import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

import LegacyOperatorCaseRedirectPage from './cases/[id]/page';
import LegacyMarketplaceRedirectPage from './marketplace/page';

describe('legacy admin redirects', () => {
  beforeEach(() => {
    mockRedirect.mockReset();
  });

  it('redirects legacy case routes to the operator route family', async () => {
    await LegacyOperatorCaseRedirectPage({
      params: Promise.resolve({ id: 'job-123' }),
    });

    expect(mockRedirect).toHaveBeenCalledWith('/operator/cases/job-123');
  });

  it('redirects the legacy marketplace route to operator marketplace', () => {
    LegacyMarketplaceRedirectPage();

    expect(mockRedirect).toHaveBeenCalledWith('/operator/marketplace');
  });
});
