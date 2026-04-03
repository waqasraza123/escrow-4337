import { PolicyService } from '../src/modules/policy/policy.service';

describe('PolicyService', () => {
  const policyService = new PolicyService();

  it('reads shariah mode from both camelCase and snake_case user flags', () => {
    expect(policyService.shariahEnabledFor({ shariahMode: true })).toBe(true);
    expect(policyService.shariahEnabledFor({ shariah_mode: true })).toBe(true);
    expect(
      policyService.shariahEnabledFor({
        shariahMode: false,
        shariah_mode: true,
      }),
    ).toBe(false);
    expect(policyService.shariahEnabledFor({})).toBe(false);
    expect(policyService.shariahEnabledFor(undefined)).toBe(false);
  });

  it('allows every category when shariah mode is disabled', () => {
    expect(policyService.isCategoryAllowed('gambling', false)).toBe(true);
    expect(policyService.isCategoryAllowed('custom-service', false)).toBe(true);
  });

  it('blocks prohibited categories after trimming and lowercasing input', () => {
    expect(policyService.isCategoryAllowed('  GAMBLING  ', true)).toBe(false);
    expect(policyService.isCategoryAllowed('Alcohol', true)).toBe(false);
  });

  it('allows categories that are not on the prohibited list', () => {
    expect(policyService.isCategoryAllowed('design', true)).toBe(true);
    expect(policyService.isCategoryAllowed('software-development', true)).toBe(
      true,
    );
  });
});
