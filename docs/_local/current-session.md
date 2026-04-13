# Current Session

## Date
- 2026-04-13

## Current Objective
- Ship the next production-grade release-governance phase after release dossiers: publish a stable approved-release pointer and let production launch candidates auto-resolve rollback image SHA from reviewed evidence instead of manual entry.

## Last Completed Step
- Added a ready-only `release-pointer` contract plus workflow wiring so `Promotion Review` publishes `release-pointer-<environment>` artifacts and `Launch Candidate` can auto-resolve `rollback_image_sha` for production from the latest approved release pointer when no explicit override is supplied.

## Current Step
- Task complete. Targeted launch-script verification passed; root `pnpm verify:ci` is still blocked by a pre-existing `services/api` lint backlog unrelated to this change.

## Why This Step Exists
- The repo could already preserve a reviewed release dossier, but production launch candidates still depended on a human manually retyping the rollback image SHA. This phase turns the last approved release into a stable machine-readable pointer so rollback provenance can be auto-resolved from reviewed evidence instead of operator memory.

## Changed Files
- `.github/workflows/launch-candidate.yml`
- `.github/workflows/promotion-review.yml`
- `docs/DEPLOYMENT_RUNBOOK.md`
- `docs/INCIDENT_PLAYBOOK.md`
- `docs/LAUNCH_READINESS.md`
- `docs/STAGING_EXECUTION_SEQUENCE.md`
- `docs/project-state.md`
- `docs/_local/current-session.md`
- `scripts/release-pointer-lib.mjs`
- `scripts/release-pointer-lib.test.mjs`
- `scripts/release-pointer.mjs`

## Key Constraints
- Keep the phase grounded in the existing GitHub Actions deployment flow; do not invent a second rollback review process outside CI, Deployed Smoke, Launch Candidate, Promotion Review, the release dossier artifact, and the new approved-release pointer artifact.
- Preserve the current staged smoke and launch flows, but remove manual production rollback SHA bookkeeping by deriving rollback provenance from the latest reviewed release pointer when no explicit override is supplied.
- The pointer must only be published from a ready promotion-review result and must carry the exact candidate run, commit SHA, and image digest that were reviewed.
- Treat unrelated `services/api` lint failures as existing repo debt unless this phase directly caused them.

## Verification Commands
- `node --check scripts/release-pointer.mjs`
- `node --check scripts/release-pointer-lib.mjs`
- `pnpm test:scripts`
- `node ./scripts/release-pointer.mjs --help`
- local fixture runs:
  `node ./scripts/release-pointer.mjs generate --release-dossier artifacts/test-release-dossier/dossier/release-dossier.json --output-dir artifacts/test-release-pointer`
  `node ./scripts/release-pointer.mjs validate --pointer artifacts/test-release-pointer/release-pointer.json --expected-environment staging --write-env artifacts/test-release-pointer/release-pointer.env`
- `git diff --check`
- `pnpm verify:ci`

## Verification Status
- Passed:
  - `node --check scripts/release-pointer.mjs`
  - `node --check scripts/release-pointer-lib.mjs`
  - `pnpm test:scripts`
  - `node ./scripts/release-pointer.mjs --help`
  - local release-pointer fixture run writing `artifacts/test-release-pointer/release-pointer.json`
  - local release-pointer validation writing `artifacts/test-release-pointer/release-pointer.env`
  - `git diff --check`
- Failed due to unrelated existing repo state:
  - `pnpm verify:ci`
  - blocker: `services/api` lint reports a large pre-existing Prettier and lint backlog in files outside this change

## Expected Result
- `Promotion Review` now publishes a stable ready-only `release-pointer-<environment>` artifact, and `Launch Candidate` can derive production rollback image SHA from the latest approved production pointer when no explicit rollback override is supplied.

## Next Likely Step
- Run a real staging `Promotion Review` to publish `release-pointer-staging`, then run a real production `Launch Candidate` without `rollback_image_sha` once `release-pointer-production` exists and confirm the auto-resolved rollback SHA matches the reviewed prior production release.
