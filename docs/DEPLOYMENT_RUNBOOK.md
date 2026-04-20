# Deployment Runbook

This runbook covers the Phase 7 deployment contract for the API and recurring worker.

## Build And Publish

- CI workflow `CI` is the source of truth for build, test, and image publication.
- On pushes to `main`, GitHub Actions builds `services/api/Dockerfile`, publishes `ghcr.io/<owner>/escrow-4337-api`, and uploads an `api-image-manifest` artifact that records the exact candidate commit, tags, digest, and workflow run URL.
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
   In staging/production, set `DEPLOYMENT_TARGET_ENVIRONMENT` so validation also enforces deployed browser target URLs and backend CORS alignment.
   Validation now checks provider posture in two layers:
   - reachability or health probes for the configured relay/bundler/paymaster URLs
   - authenticated route probes for email relay, smart-account relay, and escrow relay so bad API keys fail even when health endpoints are green
4. Deploy the API service with `node dist/main`.
5. Deploy the recurring worker separately if `OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_REQUIRED=true`.
6. Let GitHub Actions run `Deployed Smoke` against `staging`, or trigger it manually for `production`.
7. Before final sign-off, run the manual `Launch Candidate` workflow or `pnpm launch:candidate` against the same environment.
8. Preserve the generated launch-candidate artifact bundle for rollout evidence and any rollback review.
9. Run the manual `Promotion Review` workflow against the same environment using the candidate CI run id.
   By default it now auto-discovers the newest matching `Deployed Smoke` and `Launch Candidate` review artifacts for that environment and candidate.
   Supply explicit smoke or launch run ids only when you need to override that auto-selection.
   The launch review artifact now includes `launch-evidence-posture.json`, marketplace-origin summary plus seeded/exact marketplace evidence, and `provider-validation-summary.json`, and promotion review treats that set as the canonical launch posture/evidence contract instead of reconstructing posture from mixed nested fields.
10. Review the uploaded `release-dossier` artifact before any production promotion decision.
11. Treat `release-dossier.json` or `release-dossier.md` as the canonical release packet; it includes the copied source evidence, a checksum inventory, and the reconciled promotion decision from `promotion-review.json`.
12. Treat the uploaded `release-pointer-<environment>` artifact as the latest approved release pointer for that environment.
    The next `production` launch-candidate run can now auto-resolve its rollback image SHA from the newest non-expired `release-pointer-production` artifact when no explicit rollback SHA is supplied.
    The workflow summary for both `Launch Candidate` and `Promotion Review` now also surfaces the release-pointer exact marketplace lane proof so reviewers can confirm the approved rollback candidate still proved the client/freelancer lane split.

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

The deployment validation gate is now expected to fail when:

- `PLAYWRIGHT_DEPLOYED_WEB_BASE_URL`, `PLAYWRIGHT_DEPLOYED_ADMIN_BASE_URL`, or `PLAYWRIGHT_DEPLOYED_API_BASE_URL` are missing or invalid
- deployed browser targets point at non-HTTPS URLs without explicit override
- deployed browser targets point at loopback/localhost without explicit override
- `NEST_API_CORS_ORIGINS` does not include the deployed web/admin origins
- relay health or reachability checks cannot reach the configured provider URLs
- authenticated relay validation routes reject the configured credentials with `401` or `403`
- authenticated relay validation routes are missing or misrouted

Optional provider probe overrides:

- reachability: `AUTH_EMAIL_RELAY_HEALTHCHECK_URL`, `WALLET_SMART_ACCOUNT_RELAY_HEALTHCHECK_URL`, `WALLET_SMART_ACCOUNT_BUNDLER_HEALTHCHECK_URL`, `WALLET_SMART_ACCOUNT_PAYMASTER_HEALTHCHECK_URL`, `ESCROW_RELAY_HEALTHCHECK_URL`
- authenticated route: `AUTH_EMAIL_RELAY_VALIDATION_URL`, `WALLET_SMART_ACCOUNT_RELAY_VALIDATION_URL`, `ESCROW_RELAY_VALIDATION_URL`

Use the validation-route overrides when the production provider does not expose the repo's default route assumptions:

- email relay default: `${AUTH_EMAIL_RELAY_BASE_URL}/email/send`
- smart-account relay default: `${WALLET_SMART_ACCOUNT_RELAY_BASE_URL}/wallets/smart-accounts/provision`
- escrow relay default: `${ESCROW_RELAY_BASE_URL}/escrow/execute`

Required launch-candidate evidence for the narrowed launch flow:

- populate `PLAYWRIGHT_DEPLOYED_FLOW_*` credentials and OTP codes in the target GitHub environment
- use the CI-published `api-image-manifest` artifact for the exact candidate run instead of manually retyping the image SHA
- run `pnpm launch:candidate`
- let the launch-candidate suite capture both the seeded canary and the exact-flow spec covering create, fund, contractor join, delivery, dispute, and operator resolution on the staged environment
- run `Promotion Review` for the staged candidate; let it auto-discover the newest matching smoke and launch review artifacts unless you need explicit override run ids
- review `launch-evidence-posture.json` inside the launch review artifact when triaging blockers or warnings; it is the compact canonical launch posture consumed by promotion review
- confirm the launch review artifact also contains `marketplace-origin-summary.json`, `marketplace-seeded-evidence.json`, `marketplace-exact-evidence.json`, and `provider-validation-summary.json` before relying on later release-dossier assembly
- preserve the uploaded `release-dossier` artifact, which now includes copied evidence under `evidence/` plus `release-dossier-checksums.txt`
- preserve the uploaded `release-pointer-staging` artifact so the reviewed candidate can be referenced without reopening the full dossier
- review the workflow summary lines for exact marketplace lane proof and client/freelancer workspace-switch posture when confirming the rollback pointer or newly generated staging pointer
- review the generated release dossier plus daemon alert dry-run artifact alongside the underlying evidence manifest before promotion

`pnpm smoke:deployed` remains read-only. The seeded canary is the default staged mutation proof, and the exact flow stays confined to explicit launch-candidate evidence runs.

## Production Promotion

- Promotion to `production` is manual and should conclude with a green `Promotion Review` run.
- Use the same image contract that passed staging.
- If the previous production release already has a green `Promotion Review`, let the next `Launch Candidate` run auto-resolve `rollback_image_sha` from the latest `release-pointer-production` artifact instead of retyping it.
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
