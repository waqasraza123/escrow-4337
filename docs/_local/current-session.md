# Current Session

## Date
- 2026-04-17

## Current Objective
- Propagate marketplace-origin Phase 8 evidence through every promotion artifact and rollback gate so marketplace support remains explicit from deployed smoke through promotion review, release dossier, stable approved-release pointer publication, production rollback selection, and launch-candidate rollback provenance.

## Last Completed Step
- Approved release pointers are now validated at publication time too, not only when later reused for rollback selection.

## Current Step
- Task complete. Launch-candidate evidence now preserves rollback provenance explicitly: launch metadata and promotion records record whether the designated rollback image came from manual input or an approved release pointer, and when it came from a pointer they also record the source pointer run id and artifact name.

## Why This Step Exists
- Phase 8 rollback posture should be auditable from the launch-candidate artifact bundle itself. If a production launch candidate uses an approved pointer as rollback source, the resulting promotion record should say so explicitly instead of only preserving the resolved image digest.

## Changed Files
- Launch candidate rollback provenance tooling:
  `.github/workflows/launch-candidate.yml`
  `scripts/launch-candidate-lib.mjs`
  `scripts/launch-candidate-lib.test.mjs`
- Docs:
  `docs/_local/current-session.md`

## Key Constraints
- Keep scope inside promotion-artifact hardening; do not add new environment secrets or staging-only code paths.
- Treat marketplace canaries as part of the supported launch surface rather than an optional note attached to generic seeded or exact canaries.
- Preserve backward-compatible artifact schemas where possible while still surfacing the new marketplace-specific fields plainly in JSON and markdown outputs.
- Ensure launch-candidate artifacts preserve rollback provenance explicitly without weakening the existing rollback-pointer validation path.

## Verification Commands
- `node --test scripts/launch-candidate-lib.test.mjs scripts/release-pointer-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/promotion-review-lib.test.mjs`
- `git diff --check`

## Verification Status
- Passed:
  - `node --test scripts/launch-candidate-lib.test.mjs scripts/release-pointer-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/promotion-review-lib.test.mjs`
  - `git diff --check`
- Blocked or not run:
  - exact deployed marketplace canary against a real staged target
  - seeded deployed marketplace canary against a real staged target
  - deployed smoke workflow end-to-end run exercising a failed marketplace seeded lane and confirming the artifact still uploads
  - release dossier generation from real staged smoke plus launch evidence
  - release pointer generation and validation from a real staged approved dossier
  - production launch-candidate workflow run proving rollback auto-resolution rejects stale or incomplete approved pointers
  - promotion-review workflow run proving invalid generated pointers fail before upload
  - launch-candidate workflow run proving rollback source and pointer provenance land in the real promotion record
  - full `pnpm launch:candidate` evidence run against staging or production
  - `pnpm verify:authority:deployed`

## Next Likely Step
- Run the exact and seeded deployed marketplace canaries plus the updated deployed-smoke workflow against a real staged environment, then generate launch-candidate, promotion-review, release-dossier, and release-pointer artifacts from real evidence and verify rollback provenance end to end against an approved pointer-backed production candidate.
