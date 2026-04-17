# Current Session

## Date
- 2026-04-17

## Current Objective
- Propagate marketplace-origin Phase 8 evidence through every promotion artifact and rollback gate so marketplace support remains explicit from deployed smoke through promotion review, release dossier, stable approved-release pointer publication, production rollback selection, launch-candidate rollback provenance, final release-packet rollback provenance, approved-pointer rollback provenance, promotion-review rollback provenance, promotion-review artifact-selection provenance, final release-packet artifact-selection provenance, approved-pointer artifact-selection provenance, rollback release-pointer selection provenance, strict artifact-search rollback-pointer provenance validation, explicit release-dossier review-selection rendering, strict artifact-search review-selection provenance validation, mandatory review-selection artifact names, and mandatory review run provenance in approved pointers.

## Last Completed Step
- Review-selection artifact names are now mandatory anywhere selection provenance exists: promotion review blocks missing artifact names, the release dossier validator rejects persisted review selections without artifact names, and approved release pointers require review artifact names whenever deployed-smoke or launch-candidate selection sources are present.

## Current Step
- Task complete. Approved release pointers now preserve review run provenance explicitly: deployed-smoke and launch-candidate run ids and URLs are carried into the stable pointer, exported through env and markdown output, and required whenever review selection provenance is present.

## Why This Step Exists
- The stable approved pointer should be self-contained for audit and rollback review. If it records deployed-smoke or launch-candidate selection provenance but drops the underlying review run ids and URLs, operators still have to reconstruct key evidence links from older artifacts.

## Changed Files
- Approved pointer review run provenance:
  `scripts/release-pointer-lib.mjs`
  `scripts/release-pointer.mjs`
  `scripts/release-pointer-lib.test.mjs`
- Docs:
  `docs/_local/current-session.md`

## Key Constraints
- Keep scope inside promotion-artifact hardening; do not add new environment secrets or staging-only code paths.
- Treat marketplace canaries as part of the supported launch surface rather than an optional note attached to generic seeded or exact canaries.
- Preserve backward-compatible artifact schemas where possible while still surfacing the new marketplace-specific fields plainly in JSON and markdown outputs.
- Keep the approved pointer self-contained without weakening the existing rollback and review provenance checks or forcing new workflow inputs beyond the review metadata already present in the release dossier.

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
  - promotion-review workflow run proving approved release pointers preserve deployed-smoke and launch-candidate review run ids and URLs from real staged evidence
  - full `pnpm launch:candidate` evidence run against staging or production
  - `pnpm verify:authority:deployed`

## Next Likely Step
- Run the exact and seeded deployed marketplace canaries plus the updated deployed-smoke workflow against a real staged environment, then generate launch-candidate, promotion-review, release-dossier, and release-pointer artifacts from real evidence and verify rollback provenance, artifact-selection provenance, rollback release-pointer selection provenance, strict artifact-search rollback and review provenance validation, mandatory review artifact names, explicit release-dossier selection rendering, and approved-pointer review run provenance end to end against an approved pointer-backed production candidate.

## Update (2026-04-17)
- Added README badges at the top (English + العربية + key stack badges).
- Changed files:
  - `readme.md`
