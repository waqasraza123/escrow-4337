# Current Session

## Date
- 2026-04-17

## Current Objective
- Propagate marketplace-origin Phase 8 evidence through every promotion artifact and rollback gate so marketplace support remains explicit from deployed smoke through promotion review, release dossier, stable approved-release pointer publication, production rollback selection, launch-candidate rollback provenance, final release-packet rollback provenance, approved-pointer rollback provenance, promotion-review rollback provenance, and promotion-review artifact-selection provenance.

## Last Completed Step
- Promotion review now preserves explicit rollback provenance and blocks when rollback fields diverge between launch metadata and rollback sections.

## Current Step
- Task complete. Promotion review now preserves artifact-selection provenance explicitly: the approval artifact records whether deployed smoke and launch review evidence were auto-discovered or manually pinned, along with artifact ids, names, and selection timestamps, so promotion decisions can be audited back to the exact selected review artifacts.

## Why This Step Exists
- Phase 8 approval records should show not just what evidence was reviewed, but how that evidence was chosen. Promotion review is the canonical human approval surface, so artifact auto-discovery versus manual pinning should be visible there instead of being implicit in workflow logs.

## Changed Files
- Promotion review artifact-selection provenance tooling:
  `.github/workflows/promotion-review.yml`
  `scripts/promotion-review-lib.mjs`
  `scripts/promotion-review-lib.test.mjs`
  `scripts/promotion-review.mjs`
  `scripts/release-review-selection.mjs`
- Docs:
  `docs/_local/current-session.md`

## Key Constraints
- Keep scope inside promotion-artifact hardening; do not add new environment secrets or staging-only code paths.
- Treat marketplace canaries as part of the supported launch surface rather than an optional note attached to generic seeded or exact canaries.
- Preserve backward-compatible artifact schemas where possible while still surfacing the new marketplace-specific fields plainly in JSON and markdown outputs.
- Ensure artifact-selection provenance is explicit in the approval artifact without weakening the existing rollback, launch-record, or auto-discovery checks.

## Verification Commands
- `node --test scripts/promotion-review-lib.test.mjs scripts/release-review-selection-lib.test.mjs scripts/release-pointer-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/launch-candidate-lib.test.mjs`
- `git diff --check`

## Verification Status
- Passed:
  - `node --test scripts/promotion-review-lib.test.mjs scripts/release-review-selection-lib.test.mjs scripts/release-pointer-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/launch-candidate-lib.test.mjs`
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
  - promotion-review workflow run proving artifact auto-discovery versus manual pinning is visible in the real approval artifact
  - full `pnpm launch:candidate` evidence run against staging or production
  - `pnpm verify:authority:deployed`

## Next Likely Step
- Run the exact and seeded deployed marketplace canaries plus the updated deployed-smoke workflow against a real staged environment, then generate launch-candidate, promotion-review, release-dossier, and release-pointer artifacts from real evidence and verify rollback provenance end to end against an approved pointer-backed production candidate.
