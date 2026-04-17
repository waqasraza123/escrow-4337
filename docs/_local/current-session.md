# Current Session

## Date
- 2026-04-17

## Current Objective
- Propagate marketplace-origin Phase 8 evidence through every promotion artifact and rollback gate so marketplace support remains explicit from deployed smoke through promotion review, release dossier, stable approved-release pointer publication, and production rollback selection.

## Last Completed Step
- Production rollback auto-resolution now requires a green approved release pointer before trusting an auto-resolved rollback image SHA.

## Current Step
- Task complete. Approved release pointers are now validated at publication time too: `scripts/release-pointer.mjs generate` requires ready marketplace launch posture from the source dossier, and the GitHub `Promotion Review` workflow round-trips the generated pointer through explicit validation before uploading the stable `release-pointer-<environment>` artifact.

## Why This Step Exists
- Phase 8 should not rely on later consumers alone to catch incomplete approved pointers. If the stable release pointer is meant to be the canonical approved-release reference, it should be proven valid at publication time as well as at later rollback-selection time.

## Changed Files
- Release pointer publication tooling:
  `.github/workflows/promotion-review.yml`
  `scripts/release-pointer.mjs`
- Docs:
  `docs/_local/current-session.md`

## Key Constraints
- Keep scope inside promotion-artifact hardening; do not add new environment secrets or staging-only code paths.
- Treat marketplace canaries as part of the supported launch surface rather than an optional note attached to generic seeded or exact canaries.
- Preserve backward-compatible artifact schemas where possible while still surfacing the new marketplace-specific fields plainly in JSON and markdown outputs.
- Ensure the stable approved pointer is validated before publication as well as before later rollback selection.

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
  - promotion-review workflow run proving invalid generated pointers fail before upload
  - full `pnpm launch:candidate` evidence run against staging or production
  - `pnpm verify:authority:deployed`

## Next Likely Step
- Run the exact and seeded deployed marketplace canaries plus the updated deployed-smoke workflow against a real staged environment, then generate promotion-review, release-dossier, and release-pointer artifacts from real evidence and exercise both pointer publication and production rollback auto-resolution against that approved pointer.
