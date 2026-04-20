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
- `pnpm e2e:canary:deployed` with staged `PLAYWRIGHT_DEPLOYED_FLOW_*` credentials
- `pnpm e2e:canary:deployed:exact` with the same staged `PLAYWRIGHT_DEPLOYED_FLOW_*` credentials
- `pnpm verify:authority:deployed` with the same staged `PLAYWRIGHT_DEPLOYED_FLOW_*` credentials to prove public audit and export reads converge to `chain_projection`

The GitHub-native equivalent is the manual `Launch Candidate` workflow against `staging` or `production`.

`deployment:validate` now distinguishes between:

- provider reachability or health posture
- authenticated provider-route posture for relay-backed email, smart-account, and escrow execution

Treat a green health endpoint with a failed authenticated-route probe as a release blocker; that means the staged credentials or route contract are wrong even though the provider host is alive.

The launch-candidate runner now writes an explicit evidence bundle under `artifacts/launch-candidate/...` containing deployment validation output, a derived `provider-validation-summary.json` artifact, the canonical `launch-evidence-posture.json` summary, daemon health output, a daemon alert dry-run artifact, runtime-profile output, launch-readiness output, deployed smoke results, separate seeded and exact canary reports, deployed authority-evidence artifacts, a generated summary, an `evidence-manifest.json` file that machine-checks the required artifact contract against `docs/incident-playbook.json`, and a machine-generated promotion record for review.

The `Launch Candidate` workflow now consumes the CI-published `api-image-manifest` artifact for a specific candidate run, checks out the exact candidate commit from that manifest, and records promotion metadata inside the bundle, including the target environment, launch workflow run URL, candidate CI run URL, commit SHA, deployed image digest, and rollback image SHA when designated. For `production`, the workflow now resolves that rollback image SHA from the newest non-expired `release-pointer-production` artifact unless an explicit override is supplied. GitHub-triggered launch candidates fail fast if that metadata is missing or mismatched, and production promotion review remains blocked when a rollback image SHA is absent. The workflow summary for rollback resolution now also surfaces the resolved release-pointer posture, including exact marketplace lane proof and whether the client/freelancer exact lanes required workspace switching.

`Deployed Smoke` now also publishes a stable machine-readable review artifact with the target environment, smoke workflow run URL, candidate CI run metadata, commit SHA, and deployed image digest for the validated candidate. The manual `Promotion Review` workflow consumes that deployed-smoke review artifact together with the CI `api-image-manifest` and the launch-candidate review artifact, including `launch-evidence-posture.json` as the canonical launch posture source, then blocks promotion if candidate run ids, commit SHAs, image digests, environment labels, posture counters, or required launch evidence diverge. Promotion review can now auto-discover the newest matching smoke and launch review artifacts for a candidate and environment, with optional explicit run-id overrides when manual selection is necessary. The launch-candidate review artifact now carries the full release-facing evidence subset needed for later dossier assembly: `evidence-manifest.json`, `launch-evidence-posture.json`, marketplace-origin summary plus seeded/exact marketplace evidence, `promotion-record.json`, `provider-validation-summary.json`, and `summary.md`. The same workflow also emits a canonical `release-dossier` artifact that copies the source evidence into one folder, computes SHA-256 checksums, and preserves the reconciled promotion decision for audit or rollback review, plus a stable `release-pointer-<environment>` artifact that records the latest ready release for future rollback resolution. The workflow summary now surfaces the generated release-pointer posture, including exact marketplace lane proof and the client/freelancer workspace-switch facts captured from the exact canary.

The Playwright harness now also includes two focused deployed canary lanes behind explicit `PLAYWRIGHT_DEPLOYED_FLOW_*` credentials:

- seeded deployed canary: API-authenticated actors plus API-seeded join-ready job state, then browser coverage for contractor join, delivery, dispute, and operator resolution
- exact deployed canary: full browser auth and browser setup flow through create, fund, join, deliver, dispute, and resolution

Use the seeded deployed canary as the default staged mutation proof because it is faster and less brittle. The `Deployed Smoke` workflow now runs that seeded lane after read-only smoke. The exact deployed flow stays reserved for `pnpm launch:candidate` and the manual `Launch Candidate` workflow, where it serves as explicit release-candidate evidence rather than the default post-deploy gate.

The exact browser contract now also includes a dedicated walkthrough canary that validates the first-time guided path and the real copied contractor invite-link handoff through staged client, contractor, and operator actors. `pnpm launch:candidate` now captures that walkthrough report separately, and the repo also includes a standalone `Walkthrough Acceptance` workflow for local built-app regression against Docker-backed Postgres.

For the exact staging rollout order that combines deployment, smoke, launch readiness, evidence capture, and rollback checkpoints, use [docs/STAGING_EXECUTION_SEQUENCE.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/STAGING_EXECUTION_SEQUENCE.md).

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
