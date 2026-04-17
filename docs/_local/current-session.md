# Current Session

## Date
- 2026-04-17

## Current Objective
- Propagate marketplace-origin Phase 8 evidence through every promotion artifact and rollback gate so marketplace support remains explicit from deployed smoke through promotion review, release dossier, stable approved-release pointer, and production rollback selection.

## Last Completed Step
- Release pointers now preserve marketplace smoke and launch posture so the stable approved-release artifact no longer drops those signals at the final artifact boundary.

## Current Step
- Task complete. Production rollback auto-resolution now requires a green approved release pointer: the launch-candidate workflow validates that auto-selected `release-pointer-production` artifacts confirm deployed smoke, seeded canary, and marketplace seeded canary success plus zero launch marketplace canary failures and `chain_projection` authority audit source before trusting the rollback image SHA.

## Why This Step Exists
- Phase 8 production rollback posture should not trust the latest approved image digest blindly. Since the release pointer now carries marketplace and authority posture, the production launch-candidate workflow should enforce those fields before using the pointer as rollback source.

## Changed Files
- Release pointer and rollback selection tooling:
  `.github/workflows/launch-candidate.yml`
  `scripts/release-pointer-lib.mjs`
  `scripts/release-pointer-lib.test.mjs`
  `scripts/release-pointer.mjs`
- Docs:
  `docs/_local/current-session.md`

## Key Constraints
- Keep scope inside promotion-artifact hardening; do not add new environment secrets or staging-only code paths.
- Treat marketplace canaries as part of the supported launch surface rather than an optional note attached to generic seeded or exact canaries.
- Preserve backward-compatible artifact schemas where possible while still surfacing the new marketplace-specific fields plainly in JSON and markdown outputs.
- Ensure production auto-resolved rollback selection enforces the preserved marketplace and authority posture instead of using the pointer only as an image-digest lookup.

## Verification Commands
- `node --test scripts/release-pointer-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/promotion-review-lib.test.mjs`
- `git diff --check`

## Verification Status
- Passed:
  - `node --test scripts/release-pointer-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/promotion-review-lib.test.mjs`
  - `git diff --check`
- Blocked or not run:
  - exact deployed marketplace canary against a real staged target
  - seeded deployed marketplace canary against a real staged target
  - deployed smoke workflow end-to-end run exercising a failed marketplace seeded lane and confirming the artifact still uploads
  - release dossier generation from real staged smoke plus launch evidence
  - release pointer generation and validation from a real staged approved dossier
  - production launch-candidate workflow run proving rollback auto-resolution rejects stale or incomplete approved pointers
  - full `pnpm launch:candidate` evidence run against staging or production
  - `pnpm verify:authority:deployed`

## Next Likely Step
- Run the exact and seeded deployed marketplace canaries plus the updated deployed-smoke workflow against a real staged environment, then generate promotion-review, release-dossier, and release-pointer artifacts from real evidence and exercise production rollback auto-resolution against that approved pointer.
