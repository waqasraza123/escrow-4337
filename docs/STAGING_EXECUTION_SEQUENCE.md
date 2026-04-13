# Staging Execution Sequence

This document turns the Phase 7 deployment runbook and Phase 8 launch-readiness gate into one concrete staging sequence for a release candidate.

## Goal

- Prove the current `main` candidate against a real staging environment with live URLs, real secrets, deployed ingress, and a deployed recurring worker when required.
- Produce evidence that staging is green before any production promotion discussion.

## Inputs

Use the exact commit on `main` that CI built and published.

Required environment contract:

- runtime secrets from [services/api/.env.example](/Users/mc/development/blockchain/ethereum/base/Escrow4337/services/api/.env.example)
- deployed smoke inputs from [.env.e2e.deployed.example](/Users/mc/development/blockchain/ethereum/base/Escrow4337/.env.e2e.deployed.example)
- staging expectations from [docs/ENVIRONMENT_MATRIX.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/ENVIRONMENT_MATRIX.md)

## Sequence

1. Confirm the staging secret contract is complete in GitHub Environment `staging`.
   Required minimum groups: core runtime, email relay, smart-account relay, escrow relay, operations, and deployed smoke URLs.
   Block here if any of `DATABASE_URL`, `JWT_SECRET`, `NEST_API_TRUST_PROXY`, `ESCROW_CONTRACT_ADDRESS`, `ESCROW_ARBITRATOR_ADDRESS`, `ESCROW_RELAY_BASE_URL`, `WALLET_SMART_ACCOUNT_BUNDLER_URL`, `WALLET_SMART_ACCOUNT_RELAY_BASE_URL`, `OPERATIONS_ESCROW_RPC_URL`, `PLAYWRIGHT_DEPLOYED_WEB_BASE_URL`, `PLAYWRIGHT_DEPLOYED_ADMIN_BASE_URL`, or `PLAYWRIGHT_DEPLOYED_API_BASE_URL` are missing.

2. Confirm the frontend and API targets all point at the same staging candidate.
   `PLAYWRIGHT_DEPLOYED_WEB_BASE_URL`, `PLAYWRIGHT_DEPLOYED_ADMIN_BASE_URL`, and `PLAYWRIGHT_DEPLOYED_API_BASE_URL` must resolve to the staging deployment you are validating.
   `PLAYWRIGHT_DEPLOYED_EXPECT_PROFILE` should be `deployment-like`.
   `NEXT_PUBLIC_API_BASE_URL` for both frontend deployments must match the staged API base URL.

3. Promote the candidate API image to staging.
   Use the GHCR image produced by CI for the target `main` commit.
   API command: `node dist/main`

4. Run the database migration once against staging.
   Command: `pnpm --filter escrow4334-api db:migrate`
   This is a one-time rollout step for the candidate environment, not part of read-only smoke.

5. Deploy or restart the recurring worker when `OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_REQUIRED=true`.
   Worker command: `pnpm --filter escrow4334-api chain-sync:daemon`
   Do not treat staging as ready until the worker is deployed separately from the API when the daemon is required.

6. Check deployment posture before browser smoke.
   Run: `pnpm --filter escrow4334-api db:migrate:status`
   Run: `pnpm --filter escrow4334-api deployment:validate`
   Both must pass against staging secrets and live provider URLs.

7. Check the deployed API posture directly.
   `GET /operations/runtime-profile` must report `deployment-like`.
   `GET /operations/launch-readiness` must not report blockers.
   If the daemon is required, launch readiness must show healthy worker posture rather than a missing-worker warning.

8. Run the read-only staging smoke gate.
   Canonical GitHub path: let `Deployed Smoke` run automatically for `staging` after CI succeeds on `main`.
   Manual GitHub fallback: run workflow `Deployed Smoke` with input `environment=staging`.
   Local equivalent when you have the staging secret set loaded: `pnpm smoke:deployed`
   The same workflow now runs `pnpm e2e:canary:deployed` immediately after smoke, so staged post-deploy proof includes one seeded mutation canary by default.
   Both GitHub paths now resolve the exact candidate commit and image digest from the CI `api-image-manifest` artifact instead of relying on the current branch head at dispatch time.

9. Run the launch-candidate gate against the same staging target.
   Canonical GitHub path: run workflow `Launch Candidate` with input `environment=staging`.
   Local equivalent when you have the staging secret set loaded: `pnpm launch:candidate`
   This must keep `PLAYWRIGHT_DEPLOYED_EXPECT_LAUNCH_READY=true`.
   The same gate now also runs `pnpm verify:authority:deployed`, which creates a staged escrow job through the deployed API, runs protected reconciliation, and captures public audit/export proof that the staged environment reads from `chain_projection`.
   When using the manual GitHub workflow, pass the CI candidate run id for the staged candidate and the rollback image SHA if one is already designated so the workflow resolves the exact candidate commit and digest from the published image manifest.

10. Run promotion review against the staged evidence set.
    Canonical GitHub path: run workflow `Promotion Review` with inputs `environment=staging`, the CI candidate run id, the successful `Deployed Smoke` run id, and the successful `Launch Candidate` run id.
    Treat a blocked `promotion-review.json` result as a promotion blocker, even if the individual smoke and launch runs were green.

11. Preserve the evidence bundle and workflow links.
    Keep the `Launch Candidate` artifact bundle produced under `artifacts/launch-candidate/...` or uploaded by GitHub Actions.
    Record the successful `Deployed Smoke` run URL, `Launch Candidate` run URL, `Promotion Review` run URL, target commit SHA, deployed image SHA, and any rollback image SHA.
    The release review set now includes `deployed-smoke-record.json`, `evidence-manifest.json`, `promotion-record.json`, and `promotion-review.json`. `evidence-manifest.json` should show zero missing artifacts and `promotion-review.json` should report `ready` before promotion discussion.

12. Decide whether deeper staged proof is required.
    The `Launch Candidate` workflow and `pnpm launch:candidate` now require the staged `PLAYWRIGHT_DEPLOYED_FLOW_*` contract and capture both seeded and exact canary evidence.
    If you need to run the exact browser-auth and browser-setup flow directly outside the launch-candidate wrapper, use `pnpm e2e:canary:deployed:exact`.

## Exit Criteria

Treat staging as proven only when all of the following are true:

- the staged API image, frontend deployments, and worker all target the same release candidate
- `pnpm --filter escrow4334-api db:migrate:status` passes
- `pnpm --filter escrow4334-api deployment:validate` passes
- `pnpm smoke:deployed` passes against live staging URLs
- `pnpm launch:candidate` passes with launch readiness enforced
- `promotion-review.json` reports `ready` for staged promotion review and reconciles the intended candidate run, commit SHA, and image digest across smoke and launch evidence
- `promotion-record.json` reports `ready` for staging review and has no unresolved blockers
- the artifact bundle and workflow evidence are preserved for review

## Stop Conditions

Do not continue to production discussion when any of the following are true:

- `deployment:validate` fails
- runtime profile is not `deployment-like`
- launch readiness reports blockers
- the worker is required but not deployed or unhealthy
- staging smoke fails
- the launch-candidate artifact bundle is missing
- incident ownership for a staging failure is unclear

## Rollback Trigger

If staging becomes unhealthy during or after rollout:

1. Re-point API and worker to the last known-good image SHA.
2. Keep the database at its current schema unless the migration has a tested reverse path.
3. Re-run `pnpm --filter escrow4334-api deployment:validate`.
4. Re-run `pnpm smoke:deployed`.
5. Preserve the failed and recovery evidence with the same candidate notes.

## Related Docs

- [docs/DEPLOYMENT_RUNBOOK.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/DEPLOYMENT_RUNBOOK.md)
- [docs/LAUNCH_READINESS.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/LAUNCH_READINESS.md)
- [docs/ENVIRONMENT_MATRIX.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/ENVIRONMENT_MATRIX.md)
- [docs/INCIDENT_PLAYBOOK.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/INCIDENT_PLAYBOOK.md)
