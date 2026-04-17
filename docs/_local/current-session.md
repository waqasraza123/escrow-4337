# Current Session

## Date
- 2026-04-17

## Current Objective
- Propagate marketplace-origin Phase 8 evidence through every promotion artifact so marketplace support remains explicit from deployed smoke through promotion review and the final release dossier.

## Last Completed Step
- Deployed smoke review now treats marketplace seeded coverage as a first-class gate, and the GitHub deployed-smoke workflow emits machine-readable smoke artifacts even when smoke or canary lanes fail.

## Current Step
- Task complete. Release dossiers now preserve and validate deployed marketplace smoke posture explicitly: the dossier records deployed smoke, seeded canary, and marketplace seeded canary pass state, and it cross-checks those booleans against the promotion-review artifact so the final promotion package cannot silently drop marketplace deployed-smoke evidence.

## Why This Step Exists
- Phase 8 promotion evidence should remain internally consistent all the way to the release dossier. Marketplace deployed-smoke posture already gates promotion review, so the final dossier also needs to preserve and reconcile that signal instead of reducing it to a generic workflow status.

## Changed Files
- Release dossier tooling:
  `scripts/release-dossier-lib.mjs`
  `scripts/release-dossier-lib.test.mjs`
- Docs:
  `docs/_local/current-session.md`

## Key Constraints
- Keep scope inside promotion-artifact hardening; do not add new environment secrets or staging-only code paths.
- Treat marketplace canaries as part of the supported launch surface rather than an optional note attached to generic seeded or exact canaries.
- Preserve backward-compatible artifact schemas where possible while still surfacing the new marketplace-specific fields plainly in JSON and markdown outputs.
- Ensure the final release dossier retains enough smoke detail to prove marketplace deployed-smoke posture without requiring a reviewer to open raw smoke JSON separately.

## Verification Commands
- `node --test scripts/release-dossier-lib.test.mjs scripts/promotion-review-lib.test.mjs scripts/launch-candidate-lib.test.mjs`
- `git diff --check`

## Verification Status
- Passed:
  - `node --test scripts/release-dossier-lib.test.mjs scripts/promotion-review-lib.test.mjs scripts/launch-candidate-lib.test.mjs`
  - `git diff --check`
- Blocked or not run:
  - exact deployed marketplace canary against a real staged target
  - seeded deployed marketplace canary against a real staged target
  - deployed smoke workflow end-to-end run exercising a failed marketplace seeded lane and confirming the artifact still uploads
  - release dossier generation from real staged smoke plus launch evidence
  - full `pnpm launch:candidate` evidence run against staging or production
  - `pnpm verify:authority:deployed`

## Next Likely Step
- Run the exact and seeded deployed marketplace canaries plus the updated deployed-smoke workflow against a real staged environment, then generate promotion-review and release-dossier artifacts from real evidence instead of local fixtures.
