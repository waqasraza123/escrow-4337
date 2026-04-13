# Current Session

## Date
- 2026-04-13

## Current Objective
- Ship the next production-grade launch-hardening phase after deployed authority proof: make the launch-candidate artifact bundle enforce a machine-readable evidence contract and preserve promotion metadata for staging review.

## Last Completed Step
- Added launch evidence-contract validation, GitHub promotion metadata capture, and script-level tests for the launch-candidate runner and workflow.

## Current Step
- Task complete. Targeted launch-script verification passed; root `pnpm verify:ci` is still blocked by a pre-existing `services/api` lint backlog unrelated to this change.

## Why This Step Exists
- The repo already had incident ownership and deploy-side authority proof, but promotion evidence was still too loose: the workflow did not require deployed image metadata and the artifact bundle did not machine-check that every required incident artifact was actually present.

## Changed Files
- `.github/workflows/launch-candidate.yml`
- `docs/LAUNCH_READINESS.md`
- `docs/STAGING_EXECUTION_SEQUENCE.md`
- `docs/incident-playbook.json`
- `docs/project-state.md`
- `docs/_local/current-session.md`
- `package.json`
- `scripts/launch-candidate.mjs`
- `scripts/launch-candidate-lib.mjs`
- `scripts/launch-candidate-lib.test.mjs`
- `scripts/verify-ci.sh`

## Key Constraints
- Keep the phase grounded in the existing launch-candidate flow and artifact directory; do not invent a second release process.
- Preserve local usability for `pnpm launch:candidate`, but fail fast in GitHub when promotion metadata is incomplete.
- Treat unrelated `services/api` lint failures as existing repo debt unless this phase directly caused them.

## Verification Commands
- `node --check scripts/launch-candidate.mjs`
- `node --check scripts/launch-candidate-lib.mjs`
- `pnpm test:scripts`
- `pnpm launch:candidate --help`
- `git diff --check`
- `pnpm verify:ci`

## Verification Status
- Passed:
  - `node --check scripts/launch-candidate.mjs`
  - `node --check scripts/launch-candidate-lib.mjs`
  - `pnpm test:scripts`
  - `pnpm launch:candidate --help`
  - `git diff --check`
- Failed due to unrelated existing repo state:
  - `pnpm verify:ci`
  - blocker: `services/api` lint reports a large pre-existing Prettier and lint backlog in files outside this change

## Expected Result
- `pnpm launch:candidate` now emits `evidence-manifest.json`, validates required incident artifacts before promotion, writes a richer summary, and the GitHub `Launch Candidate` workflow records environment, run URL, commit SHA, deployed image SHA, and optional rollback image SHA inside the artifact bundle.

## Next Likely Step
- Run the updated `Launch Candidate` workflow against staging with the real deployed image SHA, then review the uploaded `evidence-manifest.json`, summary, and authority artifacts before any production promotion discussion.
