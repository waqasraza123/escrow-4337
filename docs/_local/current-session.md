# Current Session

## Date
- 2026-04-17

## Current Objective
- Extend marketplace-origin Phase 8 evidence from the deployed seeded lane into the deployed exact browser-auth lane.

## Last Completed Step
- Hardened repo-owned verification by making `pnpm contracts:check` run `forge test --offline`, which removed a toolchain-network crash from the contract gate.

## Current Step
- Task complete. Launch-candidate evidence now treats marketplace support as a first-class artifact contract: the exact deployed marketplace canary browser-authenticates staged client, contractor, and operator actors, browser-creates the public brief and application, then proves hire, invite-backed join, delivery, dispute, operator release, and export downloads against the resulting marketplace-origin escrow job. The launch gate now emits separate marketplace seeded and exact JSON artifacts, summary slices, and blocker conditions instead of burying marketplace proof inside aggregate exact and seeded Playwright totals.

## Why This Step Exists
- Phase 8 already had a deployed seeded marketplace proof, but the main browser-truth gap was still the exact path: browser auth and setup, browser-created brief, browser-created application, and browser-derived hire all on a deployed target.

## Changed Files
- Shared E2E helpers:
  `tests/e2e/flows/marketplace-exact-flow.ts`
  `tests/e2e/flows/operator-export-flow.ts`
- Browser tests:
  `tests/e2e/specs/journeys/local/marketplace-exact-publish-apply-hire-flow.spec.ts`
  `tests/e2e/specs/journeys/local/marketplace-public-hire-flow.spec.ts`
  `tests/e2e/specs/journeys/deployed/deployed-seeded-marketplace-launch-candidate-flow.spec.ts`
  `tests/e2e/specs/journeys/deployed/deployed-exact-marketplace-launch-candidate-flow.spec.ts`
- Launch tooling:
  `package.json`
  `scripts/launch-candidate.mjs`
  `scripts/launch-candidate-lib.mjs`
  `scripts/launch-candidate-lib.test.mjs`
  `scripts/release-dossier-lib.test.mjs`
- Docs:
  `docs/project-state.md`
  `docs/_local/current-session.md`

## Key Constraints
- Keep scope inside Playwright or launch-evidence hardening; do not add new API surface or secret inputs.
- Reuse the existing staged `PLAYWRIGHT_DEPLOYED_FLOW_*` actors instead of inventing a separate marketplace credential contract.
- Share browser-truth marketplace steps across local and deployed exact lanes so publish/apply/hire behavior does not drift by environment.
- Keep operator export assertions centralized so seeded and exact marketplace canaries validate the same artifact contract.

## Verification Commands
- `pnpm typecheck`
- `node --test scripts/launch-candidate-lib.test.mjs`
- `git diff --check`
- `PLAYWRIGHT_PROFILE=deployed PLAYWRIGHT_DEPLOYED_WEB_BASE_URL=https://example.com PLAYWRIGHT_DEPLOYED_ADMIN_BASE_URL=https://admin.example.com PLAYWRIGHT_DEPLOYED_API_BASE_URL=https://api.example.com pnpm exec playwright test --list tests/e2e/specs/journeys/deployed/deployed-seeded-marketplace-launch-candidate-flow.spec.ts --project=deployed-seeded`
- `PLAYWRIGHT_PROFILE=deployed PLAYWRIGHT_DEPLOYED_WEB_BASE_URL=https://example.com PLAYWRIGHT_DEPLOYED_ADMIN_BASE_URL=https://admin.example.com PLAYWRIGHT_DEPLOYED_API_BASE_URL=https://api.example.com pnpm exec playwright test --list tests/e2e/specs/journeys/deployed/deployed-exact-marketplace-launch-candidate-flow.spec.ts --project=deployed-exact`
- `PLAYWRIGHT_PROFILE=local pnpm exec playwright test tests/e2e/specs/journeys/local/marketplace-exact-publish-apply-hire-flow.spec.ts tests/e2e/specs/journeys/local/marketplace-public-hire-flow.spec.ts --project=local-journeys`

## Verification Status
- Passed:
  - `pnpm typecheck`
  - `node --test scripts/launch-candidate-lib.test.mjs`
  - `git diff --check`
  - deployed marketplace spec discovery for seeded and exact canaries
  - local marketplace exact and seeded Playwright rerun after helper extraction
- Blocked or not run:
  - exact deployed marketplace canary against a real staged target
  - seeded deployed marketplace canary against a real staged target
  - full `pnpm launch:candidate` evidence run against staging or production
  - `pnpm verify:authority:deployed`

## Next Likely Step
- Run the exact and seeded deployed marketplace canaries plus the full launch-candidate suite against a real staged environment, then collect authority evidence and promotion-review artifacts.
