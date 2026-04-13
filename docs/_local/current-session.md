# Current Session

## Date
- 2026-04-13

## Current Objective
- Ship the next production-grade release-governance phase after manifest pinning: make deployed smoke emit a machine-readable review record and add a promotion-review gate that reconciles CI, smoke, and launch evidence before production discussion.

## Last Completed Step
- Added stable deployed-smoke and launch-candidate review artifacts plus a promotion-review script and workflow that verify all release evidence points at the same candidate run, commit, environment, and image digest.

## Current Step
- Task complete. Targeted launch-script verification passed; root `pnpm verify:ci` is still blocked by a pre-existing `services/api` lint backlog unrelated to this change.

## Why This Step Exists
- The repo already had candidate evidence and CI image manifests, but the final production review still depended on humans manually reconciling separate workflow runs. This phase closes that release-governance gap by making smoke and launch evidence machine-comparable against the exact CI candidate.

## Changed Files
- `.github/workflows/deployed-smoke.yml`
- `.github/workflows/launch-candidate.yml`
- `.github/workflows/promotion-review.yml`
- `docs/DEPLOYMENT_RUNBOOK.md`
- `docs/LAUNCH_READINESS.md`
- `docs/STAGING_EXECUTION_SEQUENCE.md`
- `docs/project-state.md`
- `docs/_local/current-session.md`
- `scripts/promotion-review-lib.mjs`
- `scripts/promotion-review-lib.test.mjs`
- `scripts/promotion-review.mjs`

## Key Constraints
- Keep the phase grounded in the existing GitHub Actions deployment flow; do not invent a second promotion process outside CI, Deployed Smoke, Launch Candidate, and the new review gate.
- Preserve the current staged smoke and launch flows, but make production review machine-check the exact candidate metadata instead of relying on manual reconciliation.
- Treat unrelated `services/api` lint failures as existing repo debt unless this phase directly caused them.

## Verification Commands
- `node --check scripts/promotion-review.mjs`
- `node --check scripts/promotion-review-lib.mjs`
- `pnpm test:scripts`
- `node ./scripts/promotion-review.mjs --help`
- `node ./scripts/promotion-review.mjs smoke-record --output-dir artifacts/test-promotion-review/smoke`
- `node ./scripts/promotion-review.mjs review --image-manifest artifacts/test-api-image-manifest/manifest.json --deployed-smoke-record artifacts/test-promotion-review/smoke/deployed-smoke-record.json --launch-promotion-record artifacts/test-promotion-review/launch/promotion-record.json --launch-evidence-manifest artifacts/test-promotion-review/launch/evidence-manifest.json --output-dir artifacts/test-promotion-review/review --expected-environment staging --expected-repository mc/escrow4337 --expected-candidate-run-id 101 --expected-smoke-run-id 201 --expected-launch-run-id 301`
- `git diff --check`
- `pnpm verify:ci`

## Verification Status
- Passed:
  - `node --check scripts/promotion-review.mjs`
  - `node --check scripts/promotion-review-lib.mjs`
  - `pnpm test:scripts`
  - `node ./scripts/promotion-review.mjs --help`
  - local `smoke-record` fixture run writing `artifacts/test-promotion-review/smoke/deployed-smoke-record.json`
  - local `review` fixture run writing `artifacts/test-promotion-review/review/promotion-review.json`
  - `git diff --check`
- Failed due to unrelated existing repo state:
  - `pnpm verify:ci`
  - blocker: `services/api` lint reports a large pre-existing Prettier and lint backlog in files outside this change

## Expected Result
- `Deployed Smoke` now publishes a stable `deployed-smoke-review` artifact, `Launch Candidate` publishes a stable `launch-candidate-review` artifact, and the new `Promotion Review` workflow reconciles those artifacts plus the CI `api-image-manifest` into a machine-readable promotion decision.

## Next Likely Step
- Run the updated `Deployed Smoke`, `Launch Candidate`, and `Promotion Review` workflows against staging for one real candidate, then use the resulting `promotion-review.json` evidence set as the required release dossier before any production promotion discussion.
