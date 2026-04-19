# Marketplace Phase 0 Backlog V1

## Status

- Version: `v1`
- Parent phase: [Marketplace Phase 0 V1](./MARKETPLACE_PHASE_0_V1.md)
- Parent roadmap: [Marketplace Implementation V1](./MARKETPLACE_IMPLEMENTATION_V1.md)
- Status: active immediate backlog

## Purpose

- Break Phase 0 into concrete repo-native workstreams and execution tasks.
- Give the repo a practical sequence for the highest-risk staging, reliability, and release-gating work before broader marketplace expansion starts.

## Phase 0 Outcome

- A real staged marketplace-origin flow is provable end to end.
- Provider/relay paths are validated against real staging.
- Chain-derived settlement state and API-owned workflow state are easier to trust and debug.
- Release tooling rejects incomplete marketplace evidence automatically.

## Workstream 0.1: Staging Environment Contract

### Goal

- Make staging a real supported environment instead of a partially documented target.

### Tasks

1. Document and verify the exact staging secret/runtime contract for:
   - API
   - worker/chain-sync daemon
   - web
   - admin
   - GitHub Actions environments
2. Reconcile `docs/ENVIRONMENT_MATRIX.md`, `docs/DEPLOYMENT_RUNBOOK.md`, and `docs/STAGING_EXECUTION_SEQUENCE.md` against the actual Phase 0 requirements.
3. Ensure the staging profile can satisfy:
   - Postgres migrations
   - relay reachability
   - bundler/paymaster validation
   - runtime-profile posture
   - launch-readiness posture
4. Add or tighten fast-fail validation where a missing staging requirement should block deployment.

### Likely Files

- `docs/ENVIRONMENT_MATRIX.md`
- `docs/DEPLOYMENT_RUNBOOK.md`
- `docs/STAGING_EXECUTION_SEQUENCE.md`
- `services/api/src/modules/deployment-validation/*`
- GitHub workflow files

### Done When

- staging requirements are explicit, internally consistent, and enforced by repo tooling where possible

## Workstream 0.2: Real Provider Validation

### Goal

- Prove real delivery/execution dependencies work outside mock-mode assumptions.

### Tasks

1. Run and harden real email relay validation.
2. Run and harden smart-account relay validation.
3. Run and harden bundler/paymaster validation.
4. Run and harden escrow execution relay validation.
5. Capture provider-specific failure modes into structured deployment validation output and launch evidence.

### Likely Files

- `services/api/src/modules/deployment-validation/*`
- `services/api/src/modules/runtime-profile/*`
- `scripts/launch-candidate.mjs`
- `docs/LAUNCH_READINESS.md`

### Done When

- the repo can distinguish missing config, unreachable dependency, invalid chain target, and degraded-but-readable provider posture

## Workstream 0.3: Chain Event Mirror and Reconciliation Baseline

### Goal

- Make chain-derived settlement state explicit, replayable, and easier to trust at marketplace scale.

### Tasks

1. Formalize a canonical `chain_event_mirror` persistence contract if the current finalized-log projection tables are not explicit enough.
2. Normalize chain event provenance fields:
   - source
   - block/log identifiers
   - ingestion timestamp
   - replay/persist status
   - correlation id where applicable
3. Tighten replay and reconciliation idempotency rules.
4. Ensure operator-visible diagnostics can explain:
   - latest ingested event
   - drift source
   - failed replay cause
   - retry posture
5. Add migration-backed tests for replay safety and duplicate suppression.

### Likely Files

- `services/api/src/modules/operations/*`
- `services/api/src/persistence/postgres/*`
- `services/api/test/*operations*`
- `docs/ARCHITECTURE.md`

### Done When

- operators can distinguish chain truth, API-owned workflow state, and drift/error conditions without reconstructing state manually

## Workstream 0.4: Execution Correlation and Idempotency

### Goal

- Make every important action traceable through request, persistence, execution, and reconciliation layers.

### Tasks

1. Introduce or normalize correlation ids on:
   - HTTP request handling
   - background work
   - execution attempts
   - chain ingestion/reconciliation
2. Define idempotency strategy for externally retried execution paths.
3. Surface correlation ids in operator diagnostics and evidence artifacts where useful.
4. Add tests that prove duplicate requests/retries do not create ambiguous execution history.

### Likely Files

- `services/api/src/modules/escrow/*`
- `services/api/src/modules/operations/*`
- `services/api/src/common/*`
- artifact-generation scripts

### Done When

- a failed or replayed execution can be traced and reasoned about from one correlation thread

## Workstream 0.5: Privileged Capability Baseline

### Goal

- Stop relying on implicit authentication posture for high-risk actions while broader RBAC is still pending.

### Tasks

1. Inventory current privileged actions:
   - dispute resolution
   - moderation queue actions
   - chain-sync preview/persist
   - import preview
   - export or special operator reads
2. Define and enforce a minimal capability matrix for existing operator/moderator actions.
3. Surface blocked-state explanations in admin when capability checks fail.
4. Add tests that distinguish authenticated-but-not-authorized from authorized operator paths.

### Likely Files

- `services/api/src/modules/*controller*`
- `services/api/src/modules/auth/*`
- `apps/admin/src/app/*`
- `apps/admin` route tests

### Done When

- current high-risk actions use explicit capability checks and admin UI explains why access is blocked

## Workstream 0.6: Canonical Marketplace-Origin Journey Proof

### Goal

- Make the staged proof cover the actual marketplace path, not only generic contract lifecycle operations.

### Tasks

1. Ensure the deployed canary covers:
   - publish opportunity
   - apply
   - shortlist/hire
   - contract handoff
   - fund
   - deliver
   - release or dispute
2. Ensure launch-candidate artifacts preserve marketplace-origin evidence explicitly.
3. Ensure failed seeded/exact marketplace lanes still upload meaningful artifacts for debugging.
4. Add explicit validation that the reviewed job originated from the marketplace pipeline.

### Likely Files

- `tests/e2e/specs/journeys/deployed/*marketplace*`
- `scripts/launch-candidate*.mjs`
- `scripts/promotion-review*.mjs`
- `scripts/release-*`

### Done When

- the release gate can prove marketplace-origin behavior end to end with useful artifacts on both pass and fail paths

## Workstream 0.7: Observability and Evidence Contract

### Goal

- Make release/staging evidence durable, reviewable, and failure-aware.

### Tasks

1. Standardize evidence fields across:
   - deployed smoke
   - launch candidate
   - authority proof
   - daemon health
   - alert dry-run
2. Ensure failure artifacts are preserved with enough metadata for follow-up.
3. Tighten release-dossier validation so stale/missing marketplace evidence blocks promotion.
4. Reconcile human-readable markdown summaries with machine-readable JSON sources.

### Likely Files

- `scripts/launch-candidate*.mjs`
- `scripts/promotion-review*.mjs`
- `scripts/release-dossier*.mjs`
- `scripts/release-pointer*.mjs`
- `docs/LAUNCH_READINESS.md`
- `docs/INCIDENT_PLAYBOOK.md`

### Done When

- review artifacts tell a coherent story without requiring manual reconstruction from workflow logs

## Workstream 0.8: README and Operator-Facing Repo Direction

### Goal

- Align repo framing with the actual product direction so contributors and operators understand what is being built now.

### Tasks

1. Rewrite README around the escrow-first marketplace thesis.
2. Add roadmap/version/phase badges.
3. Point contributors at the active roadmap, implementation index, design guide, and immediate Phase 0 backlog.
4. Remove stale framing that describes the repo mainly as a contract demo or only as a generic milestone escrow foundation.

### Likely Files

- `readme.md`
- `docs/project-state.md`

### Done When

- a new contributor can understand the current product direction and immediate execution focus in under two minutes

## Suggested Execution Order

1. Workstream 0.8
   Set the repo framing first so the plan and backlog are visible.
2. Workstream 0.1
   Lock the staging contract and fast-fail rules.
3. Workstream 0.2
   Prove real provider readiness.
4. Workstream 0.6
   Make the marketplace-origin canary authoritative.
5. Workstream 0.3
   Strengthen chain event ownership and reconciliation clarity.
6. Workstream 0.4
   Add traceability/idempotency hardening.
7. Workstream 0.5
   Tighten privileged capability baseline.
8. Workstream 0.7
   Finish evidence and release-dossier enforcement.

## Ticket-Sized Breakdown

### P0-01

- Rewrite README and link the new roadmap/phase docs.

### P0-02

- Reconcile staging docs and deployment validation into one enforced staging contract.

### P0-03

- Add explicit provider validation coverage for email, relay, bundler, paymaster, and escrow execution.

### P0-04

- Make marketplace-origin deployed canary and launch-candidate evidence the default release proof.

### P0-05

- Formalize `chain_event_mirror`/projection ownership and replay diagnostics.

### P0-06

- Add end-to-end correlation ids and idempotency handling across execution/reconciliation.

### P0-07

- Enforce minimal privileged capability checks on existing high-risk admin/operator actions.

### P0-08

- Tighten evidence and promotion validation so stale or incomplete marketplace proof blocks release.

## Verification

- `git diff --check`
- `pnpm verify:ci`
- `pnpm launch:candidate`
- `pnpm verify:authority:deployed`
- deployed smoke workflow against real staging

## Exit Gate

- Phase 0 should not be called complete until at least one real staged marketplace-origin run produces a valid evidence set and the release tooling proves it can reject incomplete proof.
