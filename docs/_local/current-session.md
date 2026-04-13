# Current Session

## Date
- 2026-04-13

## Current Objective
- Ship the next production-grade release-dossier phase after promotion review: assemble one canonical audit packet with copied evidence and checksums so release sign-off and rollback review do not depend on scattered workflow downloads.

## Last Completed Step
- Added a release-dossier script and workflow wiring so promotion review now preserves one canonical evidence bundle with copied source artifacts, workflow metadata, and SHA-256 checksums.

## Current Step
- Task complete. Targeted launch-script verification passed; root `pnpm verify:ci` is still blocked by a pre-existing `services/api` lint backlog unrelated to this change.

## Why This Step Exists
- The repo could already reconcile release evidence, but the reviewed artifacts still lived in separate workflow outputs. This phase closes the evidence-preservation gap by turning promotion review into a single durable release packet for audit, rollback, and sign-off.

## Changed Files
- `.github/workflows/promotion-review.yml`
- `docs/DEPLOYMENT_RUNBOOK.md`
- `docs/INCIDENT_PLAYBOOK.md`
- `docs/LAUNCH_READINESS.md`
- `docs/STAGING_EXECUTION_SEQUENCE.md`
- `docs/project-state.md`
- `docs/_local/current-session.md`
- `scripts/release-dossier-lib.mjs`
- `scripts/release-dossier-lib.test.mjs`
- `scripts/release-dossier.mjs`

## Key Constraints
- Keep the phase grounded in the existing GitHub Actions deployment flow; do not invent a second release-review process outside CI, Deployed Smoke, Launch Candidate, Promotion Review, and the new dossier artifact.
- Preserve the current staged smoke and launch flows, but make the final preserved review packet self-contained and checksum-backed.
- Treat unrelated `services/api` lint failures as existing repo debt unless this phase directly caused them.

## Verification Commands
- `node --check scripts/release-dossier.mjs`
- `node --check scripts/release-dossier-lib.mjs`
- `pnpm test:scripts`
- `node ./scripts/release-dossier.mjs --help`
- local fixture run:
  `node ./scripts/promotion-review.mjs smoke-record --output-dir artifacts/test-release-dossier/deployed-smoke`
  `node ./scripts/promotion-review.mjs review --image-manifest artifacts/test-api-image-manifest/manifest.json --deployed-smoke-record artifacts/test-release-dossier/deployed-smoke/deployed-smoke-record.json --launch-promotion-record artifacts/test-release-dossier/launch/promotion-record.json --launch-evidence-manifest artifacts/test-release-dossier/launch/evidence-manifest.json --output-dir artifacts/test-release-dossier/promotion-review --expected-environment staging --expected-repository mc/escrow4337 --expected-candidate-run-id 101 --expected-smoke-run-id 201 --expected-launch-run-id 301`
  `node ./scripts/release-dossier.mjs --image-manifest-dir artifacts/test-api-image-manifest --deployed-smoke-dir artifacts/test-release-dossier/deployed-smoke --launch-review-dir artifacts/test-release-dossier/launch --promotion-review-dir artifacts/test-release-dossier/promotion-review --output-dir artifacts/test-release-dossier/dossier`
- `git diff --check`
- `pnpm verify:ci`

## Verification Status
- Passed:
  - `node --check scripts/release-dossier.mjs`
  - `node --check scripts/release-dossier-lib.mjs`
  - `pnpm test:scripts`
  - `node ./scripts/release-dossier.mjs --help`
  - local `smoke-record` fixture run writing `artifacts/test-release-dossier/deployed-smoke/deployed-smoke-record.json`
  - local `review` fixture run writing `artifacts/test-release-dossier/promotion-review/promotion-review.json`
  - local `release-dossier` fixture run writing `artifacts/test-release-dossier/dossier/release-dossier.json`
  - `git diff --check`
- Failed due to unrelated existing repo state:
  - `pnpm verify:ci`
  - blocker: `services/api` lint reports a large pre-existing Prettier and lint backlog in files outside this change

## Expected Result
- `Promotion Review` now uploads a canonical `release-dossier` artifact that copies the reviewed evidence into one folder, records workflow metadata, and includes a SHA-256 checksum manifest for the preserved release packet.

## Next Likely Step
- Run the updated `Deployed Smoke`, `Launch Candidate`, and `Promotion Review` workflows against staging for one real candidate, then use the uploaded `release-dossier` artifact as the required sign-off and rollback packet before any production promotion discussion.
