# Marketplace Phase 7 V1

## Status

- Version: `v1`
- Phase: `7`
- Title: Fees, Treasury, and Support Operations
- Depends on: Phase 6

## Objective

- Make the business model, reconciliation, and customer-support posture operationally real.

## In Scope

- fee schedule model
- fee ledger
- treasury account tracking
- accounting reconciliation jobs
- support cases
- fee exceptions/refund policies
- stuck-funding and support intervention tooling

## Not In Scope

- many settlement assets
- contractor-side take-rate complexity unless clearly justified
- enterprise procurement workflows

## Existing Repo Assets To Reuse

- current escrow job and execution history persistence
- dispute and operator support tooling
- export/audit infrastructure
- chain projection and reconciliation foundation from Phase 0

## Domain Additions

- `PlatformFeeLedger`
- `PayoutLedger`
- fee schedule / fee policy entities
- treasury account reference model
- `SupportCase`

## Implementation Guidance

## Backend

- Start with the simplest commercial model:
  - one client-side fee at contract creation
  - realized on release/disbursement
- Persist fee policy in the contract snapshot so historical support/accounting does not infer fee logic from current defaults.
- Add reconciliation jobs that compare:
  - expected fee events
  - realized onchain outcomes
  - treasury/accounting records
- Build support case workflows tied to contract, message, and dispute context where possible.

## Contract Guidance

- Prefer off-chain fee accounting first if the current contract structure can support the needed commercial posture without a risky redesign.
- Only move more fee logic onchain when auditability or treasury correctness requires it strongly.

## Frontend

- Add fee transparency in:
  - pricing pages
  - offer/contract summary
  - funding review
  - release/dispute outcome summaries
- Add support entry points from:
  - project room
  - funding failures
  - dispute context
  - contract summary
- Add internal/admin surfaces for fee exception review and stuck-funding intervention.

## Support Operations

- Support cases should allow:
  - internal notes
  - aging/SLA status
  - linked contract and conversation context
  - linked fee/dispute posture
  - escalation ownership

## Design Guide For This Phase

- Use [Marketplace Design Guide V1](./MARKETPLACE_DESIGN_GUIDE_V1.md) as the base.
- Fee UX must be explicit before money moves.
- Do not hide fees in fine print or post-action receipts only.
- Support entry points should feel calm and procedural, not alarming.
- Internal support/admin views should prioritize:
  - age
  - severity
  - financial impact
  - ownership
  - next action

## Exit Criteria

- The platform can charge predictable fees and reconcile them against actual outcomes.
- Users can understand fee posture before funding or release.
- Operators/support can manage stuck-funding and fee exception cases with linked contract context.
- Fee/support data is durable enough for reporting and future treasury review.

## Verification

- API tests for fee calculation, snapshot persistence, and reconciliation jobs
- admin tests for support case handling and fee exception workflows
- web tests for fee disclosure and support entry points
- browser flow for:
  - create fee-bearing contract
  - release funds
  - verify fee summary/support visibility

## Handoff To Phase 8

- Once the marketplace is operationally real, the remaining work becomes scale, design consistency, ranking quality, and conversion optimization.
