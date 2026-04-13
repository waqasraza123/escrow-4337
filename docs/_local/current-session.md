# Current Session

## Date
- 2026-04-13

## Current Objective
- Ship the next production-grade deployment-contract phase after launch promotion review: make CI publish a machine-readable API image manifest and make downstream smoke or launch workflows resolve the exact candidate commit and image digest from that manifest.

## Last Completed Step
- Added CI API image manifest publication plus workflow-side manifest resolution so deployed smoke and launch-candidate runs pin to the intended candidate commit and image digest.

## Current Step
- Task complete. Targeted launch-script verification passed; root `pnpm verify:ci` is still blocked by a pre-existing `services/api` lint backlog unrelated to this change.

## Why This Step Exists
- The repo already had promotion review artifacts, but manual deployed validation still depended on humans retyping candidate image metadata and workflows defaulted to the branch head at dispatch time. The new manifest contract closes that release-integrity gap.

## Changed Files
- `.github/workflows/ci.yml`
- `.github/workflows/deployed-smoke.yml`
- `.github/workflows/launch-candidate.yml`
- `docs/DEPLOYMENT_RUNBOOK.md`
- `docs/LAUNCH_READINESS.md`
- `docs/STAGING_EXECUTION_SEQUENCE.md`
- `docs/project-state.md`
- `docs/_local/current-session.md`
- `scripts/api-image-manifest-lib.mjs`
- `scripts/api-image-manifest-lib.test.mjs`
- `scripts/api-image-manifest.mjs`
- `scripts/launch-candidate-lib.mjs`
- `scripts/launch-candidate-lib.test.mjs`

## Key Constraints
- Keep the phase grounded in the existing GitHub Actions deployment flow; do not invent a second release process or separate registry contract.
- Preserve local usability for `pnpm launch:candidate`, but make GitHub workflows resolve candidate metadata from CI artifacts instead of manual copy-paste.
- Treat unrelated `services/api` lint failures as existing repo debt unless this phase directly caused them.

## Verification Commands
- `node --check scripts/api-image-manifest.mjs`
- `node --check scripts/api-image-manifest-lib.mjs`
- `node --check scripts/launch-candidate.mjs`
- `node --check scripts/launch-candidate-lib.mjs`
- `pnpm test:scripts`
- `node ./scripts/api-image-manifest.mjs --help`
- `pnpm launch:candidate --help`
- `git diff --check`
- `pnpm verify:ci`

## Verification Status
- Passed:
  - `node --check scripts/api-image-manifest.mjs`
  - `node --check scripts/api-image-manifest-lib.mjs`
  - `node --check scripts/launch-candidate.mjs`
  - `node --check scripts/launch-candidate-lib.mjs`
  - `pnpm test:scripts`
  - `node ./scripts/api-image-manifest.mjs --help`
  - `pnpm launch:candidate --help`
  - `git diff --check`
- Failed due to unrelated existing repo state:
  - `pnpm verify:ci`
  - blocker: `services/api` lint reports a large pre-existing Prettier and lint backlog in files outside this change

## Expected Result
- CI now uploads an `api-image-manifest` artifact for the published API image, and both `Deployed Smoke` and `Launch Candidate` resolve the exact candidate commit and image digest from that manifest before they run validation.

## Next Likely Step
- Run the updated `Deployed Smoke` and `Launch Candidate` workflows against staging using the CI candidate run id, then review the published image manifest together with the promotion record, evidence manifest, and authority artifacts before any production promotion discussion.
