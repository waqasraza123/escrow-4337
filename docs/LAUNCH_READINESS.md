# Launch Readiness

This document defines the current launch surface, explicit exclusions, operator ownership, and the evidence contract for a launch candidate.

## Supported Launch Surface

- Relay-backed API on Postgres with OTP auth, wallet linking, smart-account provisioning, and escrow lifecycle execution.
- Provider-managed `apps/web` and `apps/admin` deployments pointed at the same API origin contract documented in `docs/ENVIRONMENT_MATRIX.md`.
- Arbitrator-wallet-linked operator workflows for dispute resolution, exports, operations health, and chain-sync daemon visibility.
- Recurring chain-sync daemon deployment with health evaluation and webhook-capable alerting.

## Explicit Exclusions

- No external indexer, subgraph, or independent chain reconciliation service yet.
- No broader privileged operator role model beyond the configured arbitrator wallet.
- No automated retry or self-healing execution remediation.
- No claim that live relay, alert destination, or ingress posture is proven unless staging evidence exists for the current release candidate.

## Launch Candidate Gate

Use `pnpm launch:candidate` as the canonical launch-candidate suite. It runs:

- `pnpm verify:ci`
- `pnpm --filter escrow4334-api build`
- `pnpm --filter escrow4334-api db:migrate:status`
- `pnpm --filter escrow4334-api deployment:validate`
- `pnpm smoke:deployed` with `PLAYWRIGHT_DEPLOYED_EXPECT_LAUNCH_READY=true`

The GitHub-native equivalent is the manual `Launch Candidate` workflow against `staging` or `production`.

The launch-candidate runner now writes an explicit evidence bundle under `artifacts/launch-candidate/...` containing deployment validation output, daemon health output, runtime-profile output, launch-readiness output, deployed smoke results, and a generated summary. The GitHub workflow uploads that directory as a workflow artifact.

## Launch Readiness Endpoint

`GET /operations/launch-readiness` is the machine-readable launch posture for the currently deployed backend. It summarizes:

- deployment-like versus mixed or local-mock runtime posture
- Postgres and relay-provider readiness
- browser-origin and trusted-proxy posture
- arbitrator-wallet operator prerequisites
- chain-sync daemon configuration and live health posture

Treat any failed check or non-empty `blockers` array as a launch blocker.

## Ownership And Incident Routing

- Deployment owner: GitHub Actions, environment secrets, image promotion, ingress, and rollback order.
- API owner: auth, persistence, runtime-profile posture, deployment validation, and escrow execution paths.
- Worker owner: recurring chain-sync daemon scheduling, daemon health, alert delivery, and persisted status snapshots.
- Operator owner: arbitrator-wallet linkage, dispute resolution, export handling, and job-level remediation workflows.
- Frontend owner: web or admin runtime alignment, API base URL correctness, and public-console availability.

Unowned incidents are launch blockers.

See `docs/INCIDENT_PLAYBOOK.md` and `docs/incident-playbook.json` for the launch-scoped incident classes, owners, rollback guidance, and required evidence artifacts.

## Monitoring, Alerting, And Rollback Posture

- `deployment:validate` must stay green for the candidate environment.
- `smoke:deployed` must stay green with runtime-profile alignment and launch-readiness checks.
- If recurring chain sync is required, daemon health must not report failed posture.
- Roll back the API image first when the deploy is unhealthy.
- Stop the worker independently if the incident is isolated to recurring chain sync.
- Re-run deployed smoke after rollback before declaring recovery.
- Preserve the launch-candidate artifact bundle for the candidate environment so rollback and recovery evidence stay tied to the same release decision.

## Legal, Compliance, And Chain Assumptions

- The current launch surface assumes Base chain configuration and the configured escrow contract addresses are final for the candidate environment.
- Shariah mode remains a product policy layer backed by the existing compliance package, not an external legal certification artifact.
- Settlement token, arbitrator authority, and relay providers must be environment-specific and documented outside the repo secret values themselves.
- If any legal, compliance, or chain-environment assumption changes for a release, update this document and treat the release as a new launch candidate.
