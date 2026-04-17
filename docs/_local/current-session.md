# Current Session

## Date
- 2026-04-17

## Current Objective
- Propagate marketplace-origin Phase 8 evidence through every promotion artifact and rollback gate so marketplace support remains explicit from deployed smoke through promotion review, release dossier, stable approved-release pointer publication, production rollback selection, launch-candidate rollback provenance, and final release-packet rollback provenance.

## Last Completed Step
- Launch-candidate evidence now preserves explicit rollback provenance, including whether the designated rollback image came from manual input or an approved release pointer.

## Current Step
- Task complete. Release dossiers now preserve rollback provenance explicitly: the final audit packet records rollback image SHA, rollback source, and rollback pointer run or artifact identity from the launch promotion record, and it validates those rollback fields remain internally consistent between launch metadata and rollback sections.

## Why This Step Exists
- Phase 8 rollback posture should still be auditable from the final release packet, not only from intermediate launch artifacts. If a production candidate uses an approved pointer as rollback source, the release dossier should preserve that provenance instead of collapsing back to a bare rollback image SHA.

## Changed Files
- Release dossier rollback provenance tooling:
  `scripts/release-dossier-lib.mjs`
  `scripts/release-dossier-lib.test.mjs`
- Docs:
  `docs/_local/current-session.md`

## Key Constraints
- Keep scope inside promotion-artifact hardening; do not add new environment secrets or staging-only code paths.
- Treat marketplace canaries as part of the supported launch surface rather than an optional note attached to generic seeded or exact canaries.
- Preserve backward-compatible artifact schemas where possible while still surfacing the new marketplace-specific fields plainly in JSON and markdown outputs.
- Ensure rollback provenance survives into the final release dossier without weakening the existing rollback-pointer validation path or promotion-review checks.

## Verification Commands
- `node --test scripts/release-dossier-lib.test.mjs scripts/launch-candidate-lib.test.mjs scripts/release-pointer-lib.test.mjs scripts/promotion-review-lib.test.mjs`
- `git diff --check`

## Verification Status
- Passed:
  - `node --test scripts/release-dossier-lib.test.mjs scripts/launch-candidate-lib.test.mjs scripts/release-pointer-lib.test.mjs scripts/promotion-review-lib.test.mjs`
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
  - full `pnpm launch:candidate` evidence run against staging or production
  - `pnpm verify:authority:deployed`

## Next Likely Step
- Run the exact and seeded deployed marketplace canaries plus the updated deployed-smoke workflow against a real staged environment, then generate launch-candidate, promotion-review, release-dossier, and release-pointer artifacts from real evidence and verify rollback provenance end to end against an approved pointer-backed production candidate.
