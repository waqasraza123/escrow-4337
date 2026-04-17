# Current Session

## Date
- 2026-04-17

## Current Objective
- Propagate marketplace-origin Phase 8 evidence through every promotion artifact and rollback gate so marketplace support remains explicit from deployed smoke through promotion review, release dossier, stable approved-release pointer publication, production rollback selection, launch-candidate rollback provenance, final release-packet rollback provenance, approved-pointer rollback provenance, and promotion-review rollback provenance.

## Last Completed Step
- Release pointers now preserve explicit rollback provenance so the stable approved pointer no longer drops how the designated rollback image was chosen.

## Current Step
- Task complete. Promotion review now preserves and validates rollback provenance explicitly: the approval artifact surfaces rollback image SHA, rollback source, and rollback pointer run or artifact identity from the launch promotion record, and it blocks when rollback provenance diverges between launch metadata and rollback sections.

## Why This Step Exists
- Phase 8 approval records should show not just that a rollback image exists, but how it was designated. Promotion review is the human approval surface, so rollback provenance needs to be explicit there instead of being recoverable only from lower-level launch artifacts.

## Changed Files
- Promotion review rollback provenance tooling:
  `scripts/promotion-review-lib.mjs`
  `scripts/promotion-review-lib.test.mjs`
- Docs:
  `docs/_local/current-session.md`

## Key Constraints
- Keep scope inside promotion-artifact hardening; do not add new environment secrets or staging-only code paths.
- Treat marketplace canaries as part of the supported launch surface rather than an optional note attached to generic seeded or exact canaries.
- Preserve backward-compatible artifact schemas where possible while still surfacing the new marketplace-specific fields plainly in JSON and markdown outputs.
- Ensure rollback provenance is explicit in the approval artifact without weakening the existing rollback-pointer validation path or launch-record checks.

## Verification Commands
- `node --test scripts/promotion-review-lib.test.mjs scripts/release-pointer-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/launch-candidate-lib.test.mjs`
- `git diff --check`

## Verification Status
- Passed:
  - `node --test scripts/promotion-review-lib.test.mjs scripts/release-pointer-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/launch-candidate-lib.test.mjs`
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
  - promotion-review workflow run proving rollback provenance lands in the real release dossier
  - promotion-review workflow run proving rollback provenance lands in the real approved release pointer
  - promotion-review workflow run proving rollback provenance is visible and reconciled in the real approval artifact
  - full `pnpm launch:candidate` evidence run against staging or production
  - `pnpm verify:authority:deployed`

## Next Likely Step
- Run the exact and seeded deployed marketplace canaries plus the updated deployed-smoke workflow against a real staged environment, then generate launch-candidate, promotion-review, release-dossier, and release-pointer artifacts from real evidence and verify rollback provenance end to end against an approved pointer-backed production candidate.
