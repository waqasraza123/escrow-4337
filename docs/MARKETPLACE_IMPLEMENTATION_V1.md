# Marketplace Implementation V1

## Status

- Version: `v1`
- Date adopted: `2026-04-19`
- Status: active implementation index
- Parent roadmap: [Marketplace Plan V1](./MARKETPLACE_PLAN_V1.md)
- Shared design system guide: [Marketplace Design Guide V1](./MARKETPLACE_DESIGN_GUIDE_V1.md)

## How To Use This Set

- `docs/MARKETPLACE_PLAN_V1.md` stays the product and architecture thesis.
- This document is the execution index for the phase-by-phase implementation plan.
- Each phase file is intended to be implementation-ready: scope, repo-specific guidance, design guidance, data model direction, verification, and exit criteria.
- Work should move in order unless a later phase depends only on documentation or design-system preparation.

## Phase Files

1. [Phase 0 V1](./MARKETPLACE_PHASE_0_V1.md)
   Foundation hardening, staging proof, chain/event reliability, release gating.
   Immediate backlog: [Phase 0 Backlog V1](./MARKETPLACE_PHASE_0_BACKLOG_V1.md)
2. [Phase 1 V1](./MARKETPLACE_PHASE_1_V1.md)
   Organizations, roles, workspaces, delegated account model.
3. [Phase 2 V1](./MARKETPLACE_PHASE_2_V1.md)
   Search, directories, read models, recommendations, saved searches.
4. [Phase 3 V1](./MARKETPLACE_PHASE_3_V1.md)
   Proposal revisions, interview threads, clarifications, offer pipeline.
5. [Phase 4 V1](./MARKETPLACE_PHASE_4_V1.md)
   Proposal-to-contract drafting, metadata snapshots, fundable escrow conversion.
6. [Phase 5 V1](./MARKETPLACE_PHASE_5_V1.md)
   Project room, submissions, revisions, activity, evidence management.
7. [Phase 6 V1](./MARKETPLACE_PHASE_6_V1.md)
   Reviews, reputation, identity confidence, moderation/risk expansion.
8. [Phase 7 V1](./MARKETPLACE_PHASE_7_V1.md)
   Fees, treasury, support operations, reconciliation.
9. [Phase 8 V1](./MARKETPLACE_PHASE_8_V1.md)
   Scale, design-system hardening, SEO, analytics, ranking optimization.

## Repo-Level Guardrails

- Preserve the existing escrow-first architecture; do not restart the product from a greenfield marketplace design.
- Keep `WorkstreamEscrow` as the canonical settlement primitive unless an explicit product constraint forces contract changes.
- Keep wallet authority wallet-bound and marketplace membership off-chain.
- Keep the launch scope narrow: fixed-price, milestone-first, Base/USDC-first, one client organization to one freelancer or agency seat.
- Add tests and verification commands inside every phase rather than deferring them into a later hardening pass.
- Prefer expanding current modules and surfaces over creating speculative parallel systems.

## Immediate Execution Order

1. Finish Phase 0 hardening and staging proof.
2. Start Phase 1 account/workspace normalization.
3. Build Phase 2 read models before deepening proposal/interview UX.
4. Use Phase 3 and Phase 4 together to make hiring flow into escrow without manual duplication.
5. Land Phase 5 before broad public reputation rollout so the post-hire workflow is coherent.
6. Use Phase 6 and Phase 7 to make the marketplace commercially and operationally real.
7. Treat Phase 8 as ongoing optimization, not as a blocker for core marketplace viability.
