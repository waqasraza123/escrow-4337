# Current Session

## Date
- 2026-04-13

## Current Objective
- Ship the next production-grade release-automation phase after release dossiers: let promotion review auto-discover the matching smoke and launch evidence for a candidate, and harden workflow artifact handling so evidence survives commit-pinning checkouts.

## Last Completed Step
- Added candidate-scoped review artifact naming plus a resolver script so promotion review can auto-select the newest matching smoke and launch evidence for a candidate, and moved cross-run artifact downloads onto `$RUNNER_TEMP` so workflow checkouts do not wipe downloaded evidence.

## Current Step
- Task complete. Targeted launch-script verification passed; root `pnpm verify:ci` is still blocked by a pre-existing `services/api` lint backlog unrelated to this change.

## Why This Step Exists
- The repo could already preserve a release packet, but operators still had to manually type smoke and launch run ids into promotion review, and the workflows were vulnerable to deleting downloaded evidence during a second checkout. This phase closes both the run-selection and artifact-lifecycle gaps.

## Changed Files
- `.github/workflows/deployed-smoke.yml`
- `.github/workflows/launch-candidate.yml`
- `.github/workflows/promotion-review.yml`
- `docs/DEPLOYMENT_RUNBOOK.md`
- `docs/LAUNCH_READINESS.md`
- `docs/STAGING_EXECUTION_SEQUENCE.md`
- `docs/project-state.md`
- `docs/_local/current-session.md`
- `scripts/release-review-selection-lib.mjs`
- `scripts/release-review-selection-lib.test.mjs`
- `scripts/release-review-selection.mjs`

## Key Constraints
- Keep the phase grounded in the existing GitHub Actions deployment flow; do not invent a second release-review process outside CI, Deployed Smoke, Launch Candidate, Promotion Review, and the release dossier artifact.
- Preserve the current staged smoke and launch flows, but remove manual promotion-review run-id bookkeeping by making review artifacts candidate-scoped and discoverable.
- Any workflow step that downloads artifacts and then checks out a different commit should keep those downloaded files outside the repo worktree.
- Treat unrelated `services/api` lint failures as existing repo debt unless this phase directly caused them.

## Verification Commands
- `node --check scripts/release-review-selection.mjs`
- `node --check scripts/release-review-selection-lib.mjs`
- `pnpm test:scripts`
- `node ./scripts/release-review-selection.mjs --help`
- local fixture run:
  `GITHUB_REPOSITORY=mc/escrow4337 node ./scripts/release-review-selection.mjs resolve --environment staging --candidate-run-id 101 --deployed-smoke-run-id 201 --launch-candidate-run-id 301 --write-env artifacts/test-review-selection/selection.env`
- `git diff --check`
- `pnpm verify:ci`

## Verification Status
- Passed:
  - `node --check scripts/release-review-selection.mjs`
  - `node --check scripts/release-review-selection-lib.mjs`
  - `pnpm test:scripts`
  - `node ./scripts/release-review-selection.mjs --help`
  - local resolver fixture run writing `artifacts/test-review-selection/selection.env`
  - `git diff --check`
- Failed due to unrelated existing repo state:
  - `pnpm verify:ci`
  - blocker: `services/api` lint reports a large pre-existing Prettier and lint backlog in files outside this change

## Expected Result
- `Promotion Review` can now run from a candidate id alone by auto-discovering the newest matching smoke and launch review artifacts, and the release workflows now keep downloaded cross-run evidence in `$RUNNER_TEMP` so candidate-commit checkouts do not remove it.

## Next Likely Step
- Run the updated `Deployed Smoke`, `Launch Candidate`, and `Promotion Review` workflows against staging for one real candidate without passing manual smoke or launch run ids, then confirm the auto-selected review artifacts and uploaded release dossier line up with the intended candidate before any production promotion discussion.
