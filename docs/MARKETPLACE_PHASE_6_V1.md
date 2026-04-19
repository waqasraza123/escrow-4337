# Marketplace Phase 6 V1

## Status

- Version: `v1`
- Phase: `6`
- Title: Reputation, Reviews, Trust, and Safety
- Depends on: Phase 5

## Objective

- Make the marketplace self-reinforcing by exposing public credibility signals and expanding private trust/safety controls.

## In Scope

- mutual contract reviews
- public reputation snapshots
- private operator risk signals
- identity confidence indicators
- moderation/risk enrichment
- spam/fraud/dispute-abuse detection
- review moderation/takedown workflows

## Not In Scope

- broad KYC rollout unless legally required
- opaque algorithmic moderation
- token-based reputation

## Existing Repo Assets To Reuse

- current escrow-derived reputation fields
- abuse reporting and moderation queue
- operator/admin review flows
- opportunity/profile visibility controls

## Domain Additions

- `ReputationSnapshot`
- `VerificationBadge`
- `RiskSignal`
- `IdentityRiskReview`
- review entities for both client and talent
- `ModerationCase`
- `SanctionAction`

## Implementation Guidance

## Backend

- Keep public review data separate from private risk data.
- Compute reputation snapshots from durable facts:
  - funded volume
  - completed contracts
  - release latency
  - dispute rate
  - revision rate
  - response rate
  - invite acceptance rate
- Add moderation hooks for:
  - review takedown
  - appeal path
  - identity mismatch investigation
  - repeated dispute-abuse review
- Introduce identity confidence labels incrementally:
  - email verified
  - wallet verified
  - smart-account ready
  - operator-reviewed proof

## Frontend

- Add review capture at contract-close moments for both sides.
- Show public reputation snapshots on talent/client profiles without exposing private operator notes.
- Add private moderation/operator surfaces for review abuse and suspicious identity signals.
- Keep public credibility presentation factual and metric-backed rather than marketing-heavy.

## Risk Rules

- Never expose private sanction/risk details on public profiles.
- Keep operator-only flags reversible and auditable.
- Separate public reputation degradation from private fraud suspicion.

## Design Guide For This Phase

- Use [Marketplace Design Guide V1](./MARKETPLACE_DESIGN_GUIDE_V1.md) as the base.
- Trust surfaces must feel credible, not gamified.
- Reviews should emphasize:
  - scope of work
  - outcome quality
  - timeliness
  - communication
- Reputation cards should distinguish:
  - public reviews
  - verified status
  - escrow-backed metrics
- Do not visually merge private moderation posture with public reputation presentation.

## Exit Criteria

- Closed contracts can produce mutual reviews.
- Profiles surface public credibility signals that help strangers decide whether to engage.
- Operators can investigate and act on review abuse, identity mismatch, and repeated dispute risk.
- Reputation metrics are computed from durable platform behavior rather than hand-entered claims.

## Verification

- API tests for review capture, visibility rules, and reputation snapshot recomputation
- admin tests for moderation/takedown/appeal controls
- web tests for profile reputation rendering and review flows
- browser flow for:
  - complete contract
  - leave review
  - see updated profile reputation

## Handoff To Phase 7

- Once trust is visible and enforceable, the next step is making platform economics and support operations production-real.
