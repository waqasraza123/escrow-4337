# Current Session

## Date
- 2026-04-17

## Current Objective
- Propagate marketplace-origin Phase 8 evidence through every promotion artifact and rollback gate so marketplace support remains explicit from deployed smoke through promotion review, release dossier, stable approved-release pointer publication, production rollback selection, launch-candidate rollback provenance, final release-packet rollback provenance, approved-pointer rollback provenance, promotion-review rollback provenance, promotion-review artifact-selection provenance, final release-packet artifact-selection provenance, approved-pointer artifact-selection provenance, rollback release-pointer selection provenance, strict artifact-search rollback-pointer provenance validation, explicit release-dossier review-selection rendering, strict artifact-search review-selection provenance validation, and mandatory review-selection artifact names.

## Last Completed Step
- Artifact-search review selection provenance is now mandatory across the promotion chain: promotion review blocks incomplete auto-discovered deployed-smoke or launch-candidate selections, the release dossier validator enforces the same contract, and approved release pointers reject artifact-search review selections that omit artifact ids or selected timestamps.

## Current Step
- Task complete. Review-selection artifact names are now mandatory anywhere selection provenance exists: promotion review blocks missing artifact names, the release dossier validator rejects persisted review selections without artifact names, and approved release pointers require review artifact names whenever deployed-smoke or launch-candidate selection sources are present.

## Why This Step Exists
- A review selection without the artifact name is still incomplete provenance, even if the source, id, and timestamp are present. Phase 8 promotion artifacts should preserve and validate the human-meaningful artifact identity, not just machine ids.

## Changed Files
- Mandatory review-selection artifact names:
  `scripts/promotion-review-lib.mjs`
  `scripts/promotion-review-lib.test.mjs`
  `scripts/release-dossier-lib.mjs`
  `scripts/release-pointer-lib.mjs`
  `scripts/release-pointer-lib.test.mjs`
- Docs:
  `docs/_local/current-session.md`

## Key Constraints
- Keep scope inside promotion-artifact hardening; do not add new environment secrets or staging-only code paths.
- Treat marketplace canaries as part of the supported launch surface rather than an optional note attached to generic seeded or exact canaries.
- Preserve backward-compatible artifact schemas where possible while still surfacing the new marketplace-specific fields plainly in JSON and markdown outputs.
- Enforce review-selection artifact names without weakening manual `input` selection support, existing rollback and artifact-search provenance checks, or the persisted artifact schemas.

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
  - launch-candidate workflow run proving artifact-search rollback release-pointer selections fail when artifact id or selected timestamp is missing
  - promotion-review workflow run proving rollback release-pointer selection provenance is preserved in the real approval artifact
  - promotion-review workflow run proving rollback release-pointer selection provenance is preserved in the real release dossier
  - promotion-review workflow run proving rollback release-pointer selection provenance is preserved in the real approved release pointer
  - promotion-review workflow run proving release-dossier markdown renders explicit review-selection artifact ids and timestamps from real staged evidence
  - promotion-review workflow run proving artifact-search deployed-smoke and launch-candidate review selections fail when artifact id or selected timestamp is missing
  - promotion-review workflow run proving deployed-smoke and launch-candidate review selections fail when artifact name is missing
  - full `pnpm launch:candidate` evidence run against staging or production
  - `pnpm verify:authority:deployed`

## Next Likely Step
- Run the exact and seeded deployed marketplace canaries plus the updated deployed-smoke workflow against a real staged environment, then generate launch-candidate, promotion-review, release-dossier, and release-pointer artifacts from real evidence and verify rollback provenance, artifact-selection provenance, rollback release-pointer selection provenance, strict artifact-search rollback and review provenance validation, mandatory review artifact names, and explicit release-dossier selection rendering end to end against an approved pointer-backed production candidate.
