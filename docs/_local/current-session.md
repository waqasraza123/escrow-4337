# Current Session

## Date
- 2026-04-14

## Current Objective
- Continue frontend marketplace production hardening with post-hire contract handoff proof on top of the exact marketplace publish/apply/hire browser canary.

## Last Completed Step
- Fixed the post-hire marketplace-to-contract handoff so applicant-side hired application links now carry the escrow invite token, then extended the exact local Playwright marketplace canary through contract join and delivery access while keeping the broader marketplace journey lane green.

## Current Step
- Task complete. Marketplace browser journey coverage now includes locale/RTL persistence, seeded public-detail apply, seeded review/hire, a full exact publish/apply/hire canary, and post-hire contract join follow-through from the hired applicant workspace.

## Why This Step Exists
- The exact marketplace canary previously stopped at `View contract`, which hid a real product defect: hired applicants were sent to a plain contract route without the contractor invite token, so the marketplace handoff did not actually complete the join flow.

## Changed Files
- API:
  `services/api/src/modules/marketplace/marketplace.service.ts`
  `services/api/src/modules/marketplace/marketplace.types.ts`
- API tests:
  `services/api/test/marketplace.service.spec.ts`
  `services/api/test/marketplace.controller.integration.spec.ts`
- Web:
  `apps/web/src/lib/api.ts`
  `apps/web/src/app/marketplace/workspace.tsx`
  `apps/web/src/app/marketplace/marketplace-workspace.spec.tsx`
- Browser tests:
  `tests/e2e/specs/journeys/local/marketplace-exact-publish-apply-hire-flow.spec.ts`
- Docs:
  `docs/project-state.md`
  `docs/_local/current-session.md`

## Key Constraints
- Keep scope within marketplace browser-proof hardening rather than widening into unrelated product areas.
- Preserve the existing escrow invite/join gate and fix the marketplace handoff at the shared application-view layer instead of bypassing the invite token requirement in the contract UI.
- Reuse the existing local session bootstrap model and zero-cost local stack; do not add deployment-only dependencies.
- Keep applicant-only invite tokens out of client-side application review views; only the applicant-facing marketplace application list should receive the invite-backed contract path.
- Keep the exact canary honest: browser-create the brief, browser-publish the brief, browser-apply, browser-hire, and browser-join the resulting contract instead of silently stopping at a generic contract link.

## Verification Commands
- `pnpm --filter escrow4334-api test -- --runInBand marketplace.service.spec.ts marketplace.controller.integration.spec.ts`
- `pnpm --filter web test -- src/app/marketplace/marketplace-workspace.spec.tsx`
- `pnpm --filter web lint`
- `PLAYWRIGHT_PROFILE=local pnpm exec playwright test tests/e2e/specs/journeys/local/marketplace-exact-publish-apply-hire-flow.spec.ts --project=local-journeys`
- `PLAYWRIGHT_PROFILE=local pnpm exec playwright test tests/e2e/specs/journeys/local/marketplace-locale-rtl.spec.ts tests/e2e/specs/journeys/local/marketplace-public-apply-flow.spec.ts tests/e2e/specs/journeys/local/marketplace-public-hire-flow.spec.ts tests/e2e/specs/journeys/local/marketplace-exact-publish-apply-hire-flow.spec.ts --project=local-journeys`
- `git diff --check`

## Verification Status
- Passed:
  - all commands above

## Expected Result
- Marketplace browser hardening now covers the core funnel through the first contract workspace action: seeded coverage for fast stable signal, an exact end-to-end canary proving browser-created brief publication, browser application submission, browser hire-into-escrow, and applicant-side contract join with delivery access on the live marketplace UI.

## Next Likely Step
- Continue marketplace browser hardening with deeper post-hire escrow behavior, such as seeded or exact proof that a marketplace-created contract can deliver the first milestone and surface downstream dispute or operator flows without leaving the marketplace-originated journey.
