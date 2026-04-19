# Marketplace Phase 0 V1

## Status

- Version: `v1`
- Phase: `0`
- Title: Foundation Hardening and Canonical Workflow
- Depends on: current repo state only
- Blocks: all later phases
- Immediate backlog: [Marketplace Phase 0 Backlog V1](./MARKETPLACE_PHASE_0_BACKLOG_V1.md)

## Objective

- Make the current escrow and marketplace stack production-reliable before expanding the marketplace surface area.

## Why This Phase Comes First

- The repo already has meaningful escrow, onboarding, marketplace, moderation, and operator flows.
- The biggest current risk is not missing primitive features; it is operational uncertainty around real staging proof, relay/provider validation, chain ingestion confidence, and release gating.
- If this phase is skipped, later marketplace work sits on unreliable settlement and unclear production readiness.

## In Scope

- real staging environment proof
- live email relay validation
- live bundler/paymaster/smart-account relay validation
- live escrow execution relay validation
- canonical end-to-end staged flow proof:
  - post opportunity
  - apply
  - hire
  - fund
  - deliver
  - release or dispute
- stronger RBAC baseline for existing privileged/operator actions
- canonical chain-event mirror and reconciliation hardening
- audit-safe tracing, structured logs, and release-evidence reliability

## Not In Scope

- new marketplace entities beyond what is required for hardening
- redesign of `WorkstreamEscrow`
- broad UI redesign
- full organization/agency model

## Existing Repo Assets To Reuse

- deployment validation and runtime-profile flows in `services/api`
- chain sync batch/daemon/health tooling
- launch-candidate, promotion-review, and release-pointer artifact pipeline
- existing marketplace opportunity/application/hire bridge
- operator case and operations-health surfaces in `apps/admin`
- local browser journeys and deployed smoke/journey harnesses

## Implementation Guidance

## Backend

- Add or formalize a canonical `chain_event_mirror` persistence shape if the existing finalized-log projection tables are not yet explicit enough for marketplace-scale event ownership.
- Require idempotency keys for externally triggered execution attempts where retries are possible.
- Thread a correlation id through:
  - HTTP request
  - queued/background work
  - execution attempt persistence
  - chain event ingestion
  - operator-visible diagnostics
- Tighten privileged capability checks around:
  - moderation actions
  - operator chain-sync actions
  - dispute resolution
  - export/import preview actions
- Add explicit release-readiness assertions for marketplace-origin flows so `pnpm launch:candidate` proves marketplace support, not only generic escrow support.

## Data and Persistence

- Stabilize canonical ownership of:
  - API-owned workflow state
  - chain-derived settlement state
  - operator-owned remediation metadata
- Add explicit migration-backed tables or columns for:
  - execution correlation ids
  - event source provenance
  - replay status
  - staged proof artifacts if stored locally for audit
- Ensure replay/reconciliation runs are resumable and bounded.

## Frontend

- Keep runtime-profile and deployment posture visible in web/admin without making users parse raw config jargon.
- Add clearer staging-readiness and provider-readiness surfaces where users or operators would otherwise misread a mock-like environment as production.
- Make chain provenance visible wherever the UI mixes API-owned and chain-derived facts.

## Ops and Verification

- Make real staging execution evidence a required artifact for this phase.
- Ensure the following are real gates, not aspirational docs:
  - `pnpm launch:candidate`
  - deployed smoke
  - deployed authority proof
  - daemon health proof
  - alert dry-run proof
- Capture failure artifacts as first-class outputs, not only success-path evidence.

## Design Guide For This Phase

- Use the shared principles in [Marketplace Design Guide V1](./MARKETPLACE_DESIGN_GUIDE_V1.md).
- Optimize Phase 0 screens for certainty, not novelty.
- Wherever the user can misread readiness, chain state, or authority, add explicit labels:
  - `local mock`
  - `deployment-like`
  - `chain-derived`
  - `operator reviewed`
- Keep operational dashboards dense and scan-first.
- For release/staging proof screens, prioritize status, last run, evidence link, and blocking reason over decorative summaries.

## Exit Criteria

- A real staged marketplace-origin flow has been executed end to end with artifacts.
- Relay/email/provider paths are validated against real staging config.
- Chain-derived and API-owned state boundaries are explicit and operator-trustworthy.
- Release tooling can reject incomplete or stale marketplace evidence automatically.
- Existing privileged paths have a clear capability baseline instead of implicit trust on authentication alone.

## Verification

- `pnpm verify:ci`
- `pnpm launch:candidate`
- `pnpm verify:authority:deployed`
- deployed smoke workflow against real staging
- release artifact validation on the resulting evidence bundle

## Handoff To Phase 1

- Once the money/execution layer is trusted, Phase 1 can safely normalize organizations, roles, and workspaces without building on unstable operational assumptions.
