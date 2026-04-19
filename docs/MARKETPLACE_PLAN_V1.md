# Marketplace Plan V1

## Status

- Version: `v1`
- Date adopted: `2026-04-19`
- Status: active plan
- Detailed implementation index: [Marketplace Implementation V1](./MARKETPLACE_IMPLEMENTATION_V1.md)
- Shared design guide: [Marketplace Design Guide V1](./MARKETPLACE_DESIGN_GUIDE_V1.md)
- Supersedes as the active planning source:
  - `docs/FRONTEND_PLAN.md`
  - `docs/_local/tailwind-production-plan.md`
  - the prior promotion-artifact-focused objective recorded in `docs/_local/current-session.md`

## Thesis

- Build Escrow4337 into a fixed-price, milestone-first, crypto-native hiring marketplace on Base.
- Preserve the existing escrow-first foundation instead of rewriting the product around a new marketplace stack.
- Keep the core differentiation: email-first onboarding, wallet authority, smart-account execution, and onchain milestone escrow with auditable dispute handling.

## What Must Be Preserved

- `WorkstreamEscrow` remains the canonical settlement primitive.
- OTP auth, SIWE wallet proof, smart-account provisioning, and default execution wallet flows remain core onboarding primitives.
- The current API orchestration and persisted escrow workflow state remain the bridge between off-chain hiring and onchain settlement.
- Existing marketplace entities and flows remain foundational:
  - `TalentProfile`
  - `Opportunity`
  - `Application`
  - shortlist/reject/hire
  - dossier scoring
  - hire-to-escrow conversion
- Existing moderation, abuse-report, operator, export, and operations-health surfaces remain required infrastructure, not optional extras.

## Target Scope

- Initial market:
  - blockchain developers
  - AI/web/mobile builders comfortable with crypto
  - agencies
  - security auditors
  - crypto-native designers and product specialists
  - cross-border contractor engagements
- Initial contract model:
  - one client organization
  - one hired freelancer or one agency seat acting as worker
  - milestone-based fixed-price contracts
  - USDC on Base first
  - operator-resolved disputes
- Explicitly not early scope:
  - hourly contracts
  - multi-chain support
  - onchain profiles
  - platform token mechanics
  - DAO moderation/governance
  - complex connects-style marketplace economy

## Architectural Direction

### Onchain Owns

- escrow funding state
- milestone release state
- dispute state
- resolution state
- immutable financial-event emission

### Off-chain Owns

- profiles
- opportunities
- applications
- messaging
- offer/proposal revisions
- search and ranking
- moderation
- reviews and reputation
- support
- analytics
- notifications
- permissions and workspace membership
- contract drafts before funding

## End-State Domain Expansion

### Identity and Workspace

- `User`
- `Wallet`
- `SmartAccount`
- `UserVerification`
- `Organization`
- `OrganizationMember`
- `OrganizationRole`
- `Agency`
- `AgencySeat`
- `ClientWorkspace`
- `SessionDevice`

### Marketplace Supply

- `TalentProfile`
- `AgencyProfile`
- `PortfolioItem`
- `VerificationBadge`
- `SkillTag`
- `Category`
- `AvailabilityWindow`
- `RateCard`
- `ProofArtifact`
- `ReputationSnapshot`

### Marketplace Demand

- `Opportunity`
- `OpportunityAttachment`
- `OpportunityQuestion`
- `OpportunityInvite`
- `OpportunitySearchDocument`
- `SavedSearch`
- `OpportunityView`
- `OpportunityRecommendationReason`

### Hiring Pipeline

- `Application`
- `ApplicationRevision`
- `ApplicationAnswer`
- `ShortlistEntry`
- `InterviewThread`
- `InterviewMessage`
- `Offer`
- `OfferMilestoneDraft`
- `OfferRevision`
- `HireDecision`
- `NoHireReason`

### Contract and Escrow

- `EscrowJob`
- `EscrowJobParticipant`
- `Milestone`
- `MilestoneSubmission`
- `SubmissionArtifact`
- `ReleaseDecision`
- `DisputeCase`
- `DisputeEvidence`
- `ResolutionRecord`
- `PlatformFeeLedger`
- `PayoutLedger`
- `OnchainExecutionAttempt`
- `ChainEventMirror`
- `ContractMetadataSnapshot`

### Trust, Comms, Analytics

- `AbuseReport`
- `ModerationCase`
- `RiskSignal`
- `IdentityRiskReview`
- `SupportCase`
- `SanctionAction`
- `ProfileVisibilityDecision`
- `Conversation`
- `Message`
- `MessageAttachment`
- `Notification`
- `Digest`
- `FeedEvent`
- `ActivityReceipt`
- `SearchImpression`
- `SearchClick`
- `ProposalConversionEvent`
- `HiringFunnelEvent`
- `RankingFeatureSnapshot`
- `RecommendationCandidate`

## Phase Plan

## Phase 0: Foundation Hardening and Canonical Workflow

- Goal: make the current escrow and marketplace stack production-reliable.
- Includes:
  - real staging evidence
  - live email/relay/bundler/paymaster/execution validation
  - canonical end-to-end flow proof: post opportunity -> apply -> hire -> fund -> deliver -> release/dispute
  - stronger RBAC baseline
  - chain event ingestion/indexing baseline
  - reconciliation jobs
  - audit-safe production logging/tracing
- Key implementation direction:
  - persist canonical `chain_event_mirror`
  - keep execution attempts idempotent
  - formalize correlation IDs across API, async work, and chain execution
  - make `pnpm launch:candidate` a real release gate

## Phase 1: Marketplace Identity, Workspaces, and Roles

- Goal: replace the current single-user bias with real marketplace accounts and delegated workspaces.
- Deliver:
  - organizations
  - freelancer vs agency identity
  - workspace membership
  - capability-based RBAC
  - role-aware onboarding and dashboards
- Initial roles:
  - `client_owner`
  - `client_recruiter`
  - `agency_owner`
  - `agency_member`
  - `freelancer`
  - `operator`
  - `moderator`

## Phase 2: Discovery, Search, and Read Models

- Goal: make talent and opportunities discoverable without manual deep links.
- Deliver:
  - talent directory
  - opportunity directory
  - search filters
  - recommendations
  - saved searches and alerts
  - invite-to-apply
- Start with Postgres-backed denormalized search documents, then add a dedicated search engine only if scale/relevance requires it.
- Ranking v1 should combine completeness, fit, verification, response/reliability, escrow history, recency, and timezone overlap.

## Phase 3: Proposal, Interview, and Offer Pipeline

- Goal: make hiring a real multi-step marketplace workflow.
- Deliver:
  - application revisions
  - client clarifications
  - shortlist workflow
  - invite-to-apply
  - interview threads
  - proposal comparison
  - offers and counter-offers
  - decline/withdraw/no-hire analytics

## Phase 4: Proposal-to-Contract Conversion

- Goal: make accepted proposals turn into precise escrow-backed contracts.
- Deliver:
  - `offer -> contract_draft -> escrow_job` state machine
  - immutable contract metadata snapshots
  - milestone negotiation before funding
  - explicit fee and dispute posture
- Keep `WorkstreamEscrow` unless product requirements force a contract redesign.

## Phase 5: Project Room and Execution Workspace

- Goal: keep work execution inside the platform after hire.
- Deliver:
  - contract-linked project room
  - milestone timeline
  - submissions and artifacts
  - revision requests
  - release/dispute actions
  - project messaging
  - activity feed
  - evidence storage

## Phase 6: Reputation, Reviews, Trust, and Safety

- Goal: make the marketplace self-reinforcing and safer to use with strangers.
- Deliver:
  - mutual reviews
  - public reputation snapshots
  - private operator risk signals
  - verification posture
  - spam/fraud/dispute-abuse detection
  - moderation queue expansion
  - review takedown/appeal workflows

## Phase 7: Fees, Treasury, and Support

- Goal: make platform economics and support operationally real.
- Deliver:
  - simple fee model first
  - canonical fee ledger
  - treasury/reconciliation tooling
  - support case workflows
  - stuck-funding and fee-exception operations
- Settlement recommendation: USDC on Base first; do not broaden asset support early.

## Phase 8: Scale, Polish, and Marketplace Intelligence

- Goal: improve conversion, liquidity, ranking, and operational insight without architecture churn.
- Deliver:
  - recommendation improvements
  - funnel analytics
  - SEO-friendly public pages
  - no-hire diagnostics
  - supply-demand analytics
  - design-system hardening
  - localization/RTL continuation where it supports the target market

## Platform Architecture Evolution

- API modules should expand around:
  - `auth`
  - `wallet`
  - `organizations`
  - `profiles`
  - `opportunities`
  - `applications`
  - `conversations`
  - `offers`
  - `contracts`
  - `escrow`
  - `chain-indexing`
  - `reviews`
  - `reputation`
  - `moderation`
  - `notifications`
  - `analytics`
  - `support`
  - `operations`
- Postgres remains the off-chain source of truth.
- Add two explicit pipelines:
  - chain indexer
  - marketplace search indexer
- Background jobs should cover notifications, indexing, ranking, reconciliation, reputation snapshots, moderation enrichment, analytics materialization, digests, and stale-state cleanup.
- Portfolio proofs, proposal files, deliverables, moderation evidence, and dispute artifacts should live in durable blob storage with signed access, validation, hashing, and role-aware controls.

## Execution Order

1. Production hardening and event/indexing foundation
2. Workspace and RBAC normalization
3. Search/read-model layer for talent and opportunities
4. Proposal comparison, messaging, and offer pipeline
5. Proposal-to-contract draft conversion
6. Project room and execution workspace
7. Reviews, reputation, and identity confidence
8. Platform fee ledger and treasury operations
9. Marketplace intelligence, ranking, and conversion optimization

## Immediate Next Step

- Convert Phase 0 and Phase 1 into a repo-specific implementation backlog with milestones, API/UI/schema slices, and verification commands.
