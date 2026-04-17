# Current Session

## Date
- 2026-04-17

## Current Objective
- Propagate marketplace-origin Phase 8 evidence all the way through launch review artifacts so promotion decisions treat marketplace support as explicit launch posture.

## Last Completed Step
- Promoted marketplace canaries into the launch-candidate artifact contract, including dedicated seeded and exact marketplace canary artifacts plus blocker logic.

## Current Step
- Task complete. Promotion review and release-dossier layers now carry marketplace launch posture explicitly. Launch promotion records now persist marketplace seeded and exact canary failure counts, promotion review blocks on any marketplace canary failures and surfaces marketplace pass status in the review artifact, and release dossiers now record marketplace seeded and exact failure counts alongside authority audit source and missing launch artifacts.

## Why This Step Exists
- Phase 8 promotion decisions should not require a reviewer to inspect raw launch summary JSON to infer whether marketplace support is covered. Marketplace is part of the supported launch surface, so its canary posture needs to survive into promotion review and the final release dossier.

## Changed Files
- Launch review tooling:
  `scripts/launch-candidate-lib.mjs`
  `scripts/promotion-review-lib.mjs`
  `scripts/release-dossier-lib.mjs`
  `scripts/launch-candidate-lib.test.mjs`
  `scripts/promotion-review-lib.test.mjs`
  `scripts/release-dossier-lib.test.mjs`
- Docs:
  `docs/_local/current-session.md`

## Key Constraints
- Keep scope inside launch-review artifact hardening; do not add new environment secrets or staging-only code paths.
- Treat marketplace canaries as part of the supported launch surface rather than an optional note attached to generic exact or seeded canaries.
- Preserve backward-compatible artifact schemas where possible while still surfacing the new marketplace-specific fields plainly in JSON and markdown outputs.

## Verification Commands
- `node --test scripts/launch-candidate-lib.test.mjs scripts/promotion-review-lib.test.mjs scripts/release-dossier-lib.test.mjs`
- `git diff --check`

## Verification Status
- Passed:
  - `node --test scripts/launch-candidate-lib.test.mjs scripts/promotion-review-lib.test.mjs scripts/release-dossier-lib.test.mjs`
  - `git diff --check`
- Blocked or not run:
  - exact deployed marketplace canary against a real staged target
  - seeded deployed marketplace canary against a real staged target
  - full `pnpm launch:candidate` evidence run against staging or production
  - `pnpm verify:authority:deployed`

## Next Likely Step
- Run the exact and seeded deployed marketplace canaries plus the full launch-candidate suite against a real staged environment, then collect authority evidence and produce promotion-review plus release-dossier artifacts from real evidence instead of local fixtures.
