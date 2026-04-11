# Deployment Runbook

This runbook covers the Phase 7 deployment contract for the API and recurring worker.

## Build And Publish

- CI workflow `CI` is the source of truth for build, test, and image publication.
- On pushes to `main`, GitHub Actions builds `services/api/Dockerfile` and publishes `ghcr.io/<owner>/escrow-4337-api`.
- Published tags:
  - immutable SHA tag for the pushed commit
  - `main` tag for the latest default-branch build

## API Image Commands

Run the same image with different commands:

- API: `node dist/main`
- Database migration: `pnpm --filter escrow4334-api db:migrate`
- Deployment validation: `pnpm --filter escrow4334-api deployment:validate`
- Recurring worker: `pnpm --filter escrow4334-api chain-sync:daemon`

## Rollout Order

1. Promote or deploy the target API image.
2. Run the migration command once against the target database.
3. Run `pnpm --filter escrow4334-api deployment:validate` with the deployed environment config.
4. Deploy the API service with `node dist/main`.
5. Deploy the recurring worker separately if `OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_REQUIRED=true`.
6. Let GitHub Actions run `Deployed Smoke` against `staging`, or trigger it manually for `production`.
7. Before final sign-off, run the manual `Launch Candidate` workflow or `pnpm launch:candidate` against the same environment.
8. Preserve the generated launch-candidate artifact bundle for rollout evidence and any rollback review.

## Frontend Contract

- `apps/web` and `apps/admin` remain provider-managed Next.js builds in Phase 7.
- Each environment must set `NEXT_PUBLIC_API_BASE_URL` explicitly for both apps.
- Frontend promotion is blocked if deployed smoke cannot confirm runtime-profile alignment and page availability.

## Staging Validation

Staging is the first required live-environment checkpoint:

- `pnpm --filter escrow4334-api db:migrate:status`
- `pnpm --filter escrow4334-api deployment:validate`
- `pnpm smoke:deployed`
- `pnpm e2e:canary:deployed`

Required launch-candidate evidence for the narrowed launch flow:

- populate `PLAYWRIGHT_DEPLOYED_FLOW_*` credentials and OTP codes in the target GitHub environment
- run `pnpm launch:candidate`
- let the launch-candidate suite capture both the seeded canary and the exact-flow spec covering create, fund, contractor join, delivery, dispute, and operator resolution on the staged environment

`pnpm smoke:deployed` remains read-only. The seeded canary is the default staged mutation proof, and the exact flow stays confined to explicit launch-candidate evidence runs.

## Production Promotion

- Promotion to `production` is manual through `Deployed Smoke`.
- Use the same image contract that passed staging.
- Run production smoke only after the new API image, migration posture, and worker rollout are complete.

## Rollback

1. Re-point API and worker to the last known-good image SHA.
2. Keep the database at its current schema unless the specific migration has an explicit, tested reverse path.
3. Re-run `pnpm --filter escrow4334-api deployment:validate`.
4. Re-run `pnpm smoke:deployed`.
5. If the worker caused the incident, stop the worker first and restore the API independently.

## Secret Handling

- Store runtime values only in GitHub Environments, deployment platforms, or local ignored env files.
- Never commit secrets to repo docs, `.env.example`, or durable memory files.
- Rotate credentials immediately after accidental exposure.
- Treat `DATABASE_URL`, relay API keys, alert webhook tokens, and JWT secrets as high-sensitivity secrets.

## Related Docs

- [Staging Execution Sequence](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/STAGING_EXECUTION_SEQUENCE.md)
- [Environment Matrix](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/ENVIRONMENT_MATRIX.md)
- [Launch Readiness](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/LAUNCH_READINESS.md)
- [Incident Playbook](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/INCIDENT_PLAYBOOK.md)
- [Security Review](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/SECURITY_REVIEW.md)
- [API README](/Users/mc/development/blockchain/ethereum/base/Escrow4337/services/api/README.md)
