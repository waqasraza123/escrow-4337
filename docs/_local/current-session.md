# Current Session

## Date
- 2026-04-17

## Current Objective
- Propagate marketplace-origin Phase 8 evidence through every promotion artifact and rollback gate so marketplace support remains explicit from deployed smoke through promotion review, release dossier, stable approved-release pointer publication, production rollback selection, launch-candidate rollback provenance, final release-packet rollback provenance, approved-pointer rollback provenance, promotion-review rollback provenance, promotion-review artifact-selection provenance, and final release-packet artifact-selection provenance.

## Last Completed Step
- Promotion review now preserves explicit artifact-selection provenance so the approval artifact shows whether smoke and launch review evidence were auto-discovered or manually pinned.

## Current Step
- Task complete. Release dossiers now preserve artifact-selection provenance explicitly: the final audit packet records selection source, artifact ids, names, and selection timestamps for deployed-smoke and launch-candidate review inputs, and it validates that the promotion-review artifact names still match the expected candidate-scoped review-artifact contract.

## Why This Step Exists
- Phase 8 preserved review packets should keep both the evidence and the selection trail together. If a release dossier is used for audit or rollback review later, it should still show how the smoke and launch review artifacts were chosen instead of forcing a reviewer back into workflow logs.

## Changed Files
- Release dossier artifact-selection provenance tooling:
  `scripts/release-dossier-lib.mjs`
  `scripts/release-dossier-lib.test.mjs`
- Docs:
  `docs/_local/current-session.md`

## Key Constraints
- Keep scope inside promotion-artifact hardening; do not add new environment secrets or staging-only code paths.
- Treat marketplace canaries as part of the supported launch surface rather than an optional note attached to generic seeded or exact canaries.
- Preserve backward-compatible artifact schemas where possible while still surfacing the new marketplace-specific fields plainly in JSON and markdown outputs.
- Ensure artifact-selection provenance survives into the final release dossier without weakening the existing rollback, launch-record, or auto-discovery checks.

## Verification Commands
- `node --test scripts/release-dossier-lib.test.mjs scripts/promotion-review-lib.test.mjs scripts/release-review-selection-lib.test.mjs scripts/release-pointer-lib.test.mjs scripts/launch-candidate-lib.test.mjs`
- `git diff --check`

## Verification Status
- Passed:
  - `node --test scripts/release-dossier-lib.test.mjs scripts/promotion-review-lib.test.mjs scripts/release-review-selection-lib.test.mjs scripts/release-pointer-lib.test.mjs scripts/launch-candidate-lib.test.mjs`
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
  - promotion-review workflow run proving artifact auto-discovery versus manual pinning is preserved in the real release dossier
  - full `pnpm launch:candidate` evidence run against staging or production
  - `pnpm verify:authority:deployed`

## Next Likely Step
- Run the exact and seeded deployed marketplace canaries plus the updated deployed-smoke workflow against a real staged environment, then generate launch-candidate, promotion-review, release-dossier, and release-pointer artifacts from real evidence and verify rollback provenance end to end against an approved pointer-backed production candidate.
