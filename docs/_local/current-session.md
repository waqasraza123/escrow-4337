# Current Session

## Date
- 2026-04-12

## Current Objective
- Ship the next production-grade phase after local authority proof: a deployed authority-evidence runner that makes `pnpm launch:candidate` prove `chain_projection` audit and export reads against a staged environment.

## Last Completed Step
- Added a staged authority-evidence runner, wired it into `pnpm launch:candidate`, and updated launch docs so promotion evidence now includes chain-projected audit/export proof for a live staged job.

## Current Step
- Task complete. Local syntax/help/build verification passed for the new launch-candidate authority phase.

## Why This Step Exists
- The local verifier proved authority logic in isolation, but launch readiness still lacked a deploy-side artifact showing that a real staged environment can reconcile a live job and expose `chain_projection` through the public audit/export contract.

## Changed Files
- `package.json`
- `docs/project-state.md`
- `docs/_local/current-session.md`
- `.env.e2e.deployed.example`
- `scripts/deployed-authority-evidence.mjs`
- `scripts/launch-candidate.mjs`
- `docs/LAUNCH_READINESS.md`
- `docs/INCIDENT_PLAYBOOK.md`
- `docs/STAGING_EXECUTION_SEQUENCE.md`

## Key Constraints
- Keep the phase grounded in the existing launch-candidate secret contract and deployed API/browser URLs; do not invent a separate staging platform or new secret class unless required.
- Do not touch unrelated dirty files in `apps/web`, `apps/admin`, `services/api/README.md`, or `services/api/package.json`.
- The new runner must verify deployed authority through the public audit/export contract plus protected operator reconciliation endpoints without persisting secrets to artifacts.

## Verification Commands
- `node --check scripts/deployed-authority-evidence.mjs`
- `node ./scripts/deployed-authority-evidence.mjs --help`
- `pnpm launch:candidate --help`
- `pnpm build`

## Verification Status
- Passed:
  - `node --check scripts/deployed-authority-evidence.mjs`
  - `node ./scripts/deployed-authority-evidence.mjs --help`
  - `pnpm launch:candidate --help`
  - `pnpm build`

## Expected Result
- `pnpm launch:candidate` now generates deploy-side authority artifacts that create a real staged escrow job, run protected reconciliation, and prove public audit/export reads converged to `chain_projection` before promotion.

## Next Likely Step
- Run the new deployed authority-evidence step against staging through the GitHub `Launch Candidate` workflow, then review the uploaded authority artifacts before enabling authority reads in production.
