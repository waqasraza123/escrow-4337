# Current Session

## Date
- 2026-04-17

## Current Objective
- Propagate marketplace-origin Phase 8 evidence through every promotion artifact and rollback gate so marketplace support remains explicit from deployed smoke through promotion review, release dossier, stable approved-release pointer publication, production rollback selection, launch-candidate rollback provenance, final release-packet rollback provenance, approved-pointer rollback provenance, promotion-review rollback provenance, promotion-review artifact-selection provenance, final release-packet artifact-selection provenance, approved-pointer artifact-selection provenance, and rollback release-pointer selection provenance.

## Last Completed Step
- Stable approved release pointers now preserve artifact-selection provenance explicitly: the published pointer carries deployed-smoke and launch-candidate selection source, artifact ids, names, and selection timestamps, and the pointer validator rejects unsupported selection-source values.

## Current Step
- Task complete. Rollback release-pointer selection provenance now survives end to end: release-pointer resolution exports pointer-selection metadata, launch-candidate metadata and promotion records preserve it, promotion review and release dossier keep it visible, and stable approved release pointers carry the same rollback selection trail forward.

## Why This Step Exists
- Phase 8 production rollback no longer just needs to know which approved pointer supplied the rollback image. Audit and drill review also need to know how that approved pointer was selected, so auto-discovery versus manual pinning stays visible through launch, promotion, dossier, and stable pointer artifacts.

## Changed Files
- Rollback release-pointer selection provenance tooling:
  `.github/workflows/launch-candidate.yml`
  `scripts/launch-candidate-lib.mjs`
  `scripts/launch-candidate-lib.test.mjs`
  `scripts/promotion-review-lib.mjs`
  `scripts/promotion-review-lib.test.mjs`
  `scripts/release-dossier-lib.mjs`
  `scripts/release-dossier-lib.test.mjs`
  `scripts/release-pointer-lib.mjs`
  `scripts/release-pointer.mjs`
  `scripts/release-pointer-lib.test.mjs`
- Docs:
  `docs/_local/current-session.md`

## Key Constraints
- Keep scope inside promotion-artifact hardening; do not add new environment secrets or staging-only code paths.
- Treat marketplace canaries as part of the supported launch surface rather than an optional note attached to generic seeded or exact canaries.
- Preserve backward-compatible artifact schemas where possible while still surfacing the new marketplace-specific fields plainly in JSON and markdown outputs.
- Ensure rollback release-pointer selection provenance survives through launch, review, dossier, and stable pointer artifacts without weakening the existing rollback, launch-posture, or auto-discovery checks.

## Verification Commands
- `node --test scripts/launch-candidate-lib.test.mjs scripts/promotion-review-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/release-pointer-lib.test.mjs scripts/release-review-selection-lib.test.mjs`
- `git diff --check`

## Verification Status
- Passed:
  - `node --test scripts/launch-candidate-lib.test.mjs scripts/promotion-review-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/release-pointer-lib.test.mjs scripts/release-review-selection-lib.test.mjs`
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
  - promotion-review workflow run proving artifact auto-discovery versus manual pinning is preserved in the real approved release pointer
  - launch-candidate workflow run proving rollback release-pointer selection provenance is preserved in the real promotion record
  - promotion-review workflow run proving rollback release-pointer selection provenance is preserved in the real approval artifact
  - promotion-review workflow run proving rollback release-pointer selection provenance is preserved in the real release dossier
  - promotion-review workflow run proving rollback release-pointer selection provenance is preserved in the real approved release pointer
  - full `pnpm launch:candidate` evidence run against staging or production
  - `pnpm verify:authority:deployed`

## Next Likely Step
- Run the exact and seeded deployed marketplace canaries plus the updated deployed-smoke workflow against a real staged environment, then generate launch-candidate, promotion-review, release-dossier, and release-pointer artifacts from real evidence and verify rollback provenance, artifact-selection provenance, and rollback release-pointer selection provenance end to end against an approved pointer-backed production candidate.
