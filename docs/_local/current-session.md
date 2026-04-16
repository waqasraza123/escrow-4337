# Current Session

## Date
- 2026-04-16

## Current Objective
- Add deployed-profile marketplace launch evidence so Phase 8 no longer treats marketplace-origin escrow proof as local-only.

## Last Completed Step
- Extended the seeded local marketplace post-hire lane through refund resolution plus operator-side `job-history` and `dispute-case` export verification.

## Current Step
- Task complete. The launch-candidate suite now includes a deployed seeded marketplace canary that reuses staged actors, seeds public brief plus application state through the API, browser-drives shortlist and hire, proves invite-backed join plus downstream delivery and dispute, resolves with operator refund, and verifies deployed `job-history` and `dispute-case` exports in JSON and CSV.

## Why This Step Exists
- Phase 8 launch readiness still lacked any deployed marketplace-origin escrow proof. The highest-value gap was proving that the launch suite can validate marketplace hire-to-resolution behavior plus operator export evidence against a real deployed target.

## Changed Files
- Shared E2E helpers:
  `tests/e2e/flows/operator-export-flow.ts`
- Browser tests:
  `tests/e2e/specs/journeys/local/marketplace-public-hire-flow.spec.ts`
  `tests/e2e/specs/journeys/deployed/deployed-seeded-marketplace-launch-candidate-flow.spec.ts`
- Docs:
  `docs/project-state.md`
  `docs/_local/current-session.md`

## Key Constraints
- Keep scope inside Playwright and launch-evidence hardening; do not add product UI, API, or new secret contracts.
- Reuse the existing staged deployed actors and `PLAYWRIGHT_DEPLOYED_FLOW_*` inputs instead of expanding the credential surface.
- Preserve marketplace-origin truth by seeding only public brief plus application state, then browser-driving shortlist, hire, join, delivery, dispute, refund, and export verification.
- Share operator export assertions between local and deployed suites so artifact expectations do not drift by environment.
- Keep the new proof on the seeded deployed lane so runtime remains bounded while the exact deployed lane stays focused on the core escrow walkthrough.

## Verification Commands
- `PLAYWRIGHT_PROFILE=deployed PLAYWRIGHT_DEPLOYED_WEB_BASE_URL=https://example.com PLAYWRIGHT_DEPLOYED_ADMIN_BASE_URL=https://admin.example.com PLAYWRIGHT_DEPLOYED_API_BASE_URL=https://api.example.com pnpm exec playwright test --list --project=deployed-seeded`
- `PLAYWRIGHT_PROFILE=deployed pnpm exec playwright test tests/e2e/specs/journeys/deployed/deployed-seeded-marketplace-launch-candidate-flow.spec.ts --project=deployed-seeded`
- `PLAYWRIGHT_PROFILE=local pnpm exec playwright test tests/e2e/specs/journeys/local/marketplace-public-hire-flow.spec.ts --project=local-journeys`
- `git diff --check`

## Verification Status
- Passed:
  - `PLAYWRIGHT_PROFILE=deployed PLAYWRIGHT_DEPLOYED_WEB_BASE_URL=https://example.com PLAYWRIGHT_DEPLOYED_ADMIN_BASE_URL=https://admin.example.com PLAYWRIGHT_DEPLOYED_API_BASE_URL=https://api.example.com pnpm exec playwright test --list --project=deployed-seeded`
- Not run:
  - deployed seeded marketplace canary against a real staged target
  - local marketplace Playwright rerun after helper extraction

## Expected Result
- Marketplace launch evidence now spans:
  - exact lane: browser-publish, browser-apply, browser-hire, invite-backed join, delivery, dispute, and operator release resolution
  - seeded lane: API-seeded publication/application, browser-hire, join, delivery, dispute, operator refund resolution, and operator-side `job-history` plus `dispute-case` export verification in JSON and CSV
  - deployed seeded lane: staged API-seeded publication/application, browser-hire, join, delivery, dispute, operator refund resolution, and deployed export verification in JSON and CSV

## Next Likely Step
- Run the new deployed marketplace canary against staging or production launch candidates and capture evidence, or widen marketplace-origin export proof to the deployed exact lane only if the extra runtime is justified.
