# Current Session

## Date
- 2026-04-17

## Current Objective
- Propagate marketplace-origin Phase 8 evidence through every promotion artifact so marketplace support remains explicit from deployed smoke through promotion review, release dossier, and the stable approved-release pointer.

## Last Completed Step
- Release dossiers now preserve and validate deployed marketplace smoke posture explicitly so the final promotion packet cannot silently drop seeded marketplace smoke evidence.

## Current Step
- Task complete. Release pointers now preserve marketplace launch posture from the approved dossier: the stable `release-pointer-<environment>` artifact carries deployed smoke, seeded canary, and marketplace seeded canary pass state plus launch marketplace canary failure counts and authority audit source, so future approved-release selection does not discard marketplace evidence at the last artifact boundary.

## Why This Step Exists
- Phase 8 rollback and approved-release selection now depend on the stable release pointer artifact. Since marketplace support is part of the supported launch surface, the pointer should retain the key marketplace readiness signals from the approved dossier instead of collapsing them away and forcing reviewers to reopen the full release packet.

## Changed Files
- Release pointer tooling:
  `scripts/release-pointer-lib.mjs`
  `scripts/release-pointer-lib.test.mjs`
  `scripts/release-pointer.mjs`
- Docs:
  `docs/_local/current-session.md`

## Key Constraints
- Keep scope inside promotion-artifact hardening; do not add new environment secrets or staging-only code paths.
- Treat marketplace canaries as part of the supported launch surface rather than an optional note attached to generic seeded or exact canaries.
- Preserve backward-compatible artifact schemas where possible while still surfacing the new marketplace-specific fields plainly in JSON and markdown outputs.
- Ensure the stable release pointer retains enough smoke and launch detail to prove marketplace posture without requiring a reviewer to reopen the full release dossier.

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
  - full `pnpm launch:candidate` evidence run against staging or production
  - `pnpm verify:authority:deployed`

## Next Likely Step
- Run the exact and seeded deployed marketplace canaries plus the updated deployed-smoke workflow against a real staged environment, then generate promotion-review, release-dossier, and release-pointer artifacts from real evidence instead of local fixtures.
