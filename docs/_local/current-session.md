# Current Session

## Date
- 2026-04-17

## Current Objective
- Propagate marketplace-origin Phase 8 evidence through every promotion gate so marketplace support is explicit in both launch-candidate review and deployed-smoke review artifacts.

## Last Completed Step
- Promoted marketplace canaries into the launch-candidate artifact contract, including dedicated seeded and exact marketplace canary artifacts plus blocker logic.

## Current Step
- Task complete. Deployed smoke review now treats marketplace seeded coverage as a first-class gate: the smoke artifact records actual smoke, generic seeded canary, and marketplace seeded canary outcomes; promotion review surfaces deployed marketplace seeded posture explicitly; and the GitHub deployed-smoke workflow runs the marketplace seeded canary and still emits the smoke artifact even when any smoke or canary lane fails.

## Why This Step Exists
- Phase 8 promotion decisions should not require a reviewer to infer marketplace support from partial workflow success or raw Playwright artifacts. Marketplace is part of the supported launch surface, so deployed smoke must emit explicit marketplace seeded posture and promotion review must block when that lane is absent or failed.

## Changed Files
- Deployed smoke and promotion review tooling:
  `.github/workflows/deployed-smoke.yml`
  `scripts/promotion-review-lib.mjs`
  `scripts/promotion-review-lib.test.mjs`
  `scripts/promotion-review.mjs`
- Docs:
  `docs/_local/current-session.md`

## Key Constraints
- Keep scope inside promotion-gate hardening; do not add new environment secrets or staging-only code paths.
- Treat marketplace canaries as part of the supported launch surface rather than an optional note attached to generic seeded or exact canaries.
- Preserve backward-compatible artifact schemas where possible while still surfacing the new marketplace-specific fields plainly in JSON and markdown outputs.
- Ensure failed smoke or canary lanes still produce a machine-readable smoke artifact for promotion review instead of silently skipping evidence generation.

## Verification Commands
- `node --test scripts/promotion-review-lib.test.mjs scripts/launch-candidate-lib.test.mjs scripts/release-dossier-lib.test.mjs`
- `git diff --check`

## Verification Status
- Passed:
  - `node --test scripts/promotion-review-lib.test.mjs scripts/launch-candidate-lib.test.mjs scripts/release-dossier-lib.test.mjs`
  - `git diff --check`
- Blocked or not run:
  - exact deployed marketplace canary against a real staged target
  - seeded deployed marketplace canary against a real staged target
  - deployed smoke workflow end-to-end run exercising a failed marketplace seeded lane and confirming the artifact still uploads
  - full `pnpm launch:candidate` evidence run against staging or production
  - `pnpm verify:authority:deployed`

## Next Likely Step
- Run the exact and seeded deployed marketplace canaries plus the updated deployed-smoke workflow against a real staged environment, then collect full launch-candidate and authority evidence from that staged run instead of local fixtures.
