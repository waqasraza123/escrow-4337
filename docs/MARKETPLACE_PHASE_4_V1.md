# Marketplace Phase 4 V1

## Status

- Version: `v1`
- Phase: `4`
- Title: Proposal-To-Contract Conversion
- Depends on: Phase 3

## Objective

- Turn accepted proposals and offers into precise, reviewable, fundable escrow contracts with minimal duplication.

## In Scope

- offer to contract-draft state machine
- immutable contract metadata snapshot
- milestone negotiation before funding
- explicit fee/dispute posture in the draft
- review-before-funding UX
- escrow job creation from approved draft

## Not In Scope

- large smart-contract redesign
- multi-party or hourly contracts
- generic contract template marketplace

## Existing Repo Assets To Reuse

- current hire-to-escrow bridge
- existing guided client contract authoring flow
- `WorkstreamEscrow`
- current participant invitation/join handshake
- audit/export and chain projection tooling

## Domain Additions

- `ContractMetadataSnapshot`
- explicit contract draft aggregate/state
- `PlatformFeeLedger` groundwork if needed for snapshotting fee posture

## Implementation Guidance

## Backend

- Introduce a clear state machine:
  - accepted offer
  - contract draft
  - draft revisions if needed
  - approved/finalized draft
  - funded escrow job
- Snapshot:
  - scope
  - deliverables
  - milestones
  - acceptance criteria
  - timeline
  - identities
  - fee posture
  - dispute posture
- Store a canonical metadata hash for audit/reference even if the chain contract only uses a pointer or indirect mapping.
- Keep the existing `WorkstreamEscrow` unless the product proves it cannot support the required metadata and settlement semantics.

## Contract Guidance

- Do not redesign the contract just to mirror every off-chain marketplace concept.
- Keep onchain concerns minimal:
  - funding
  - milestone release
  - disputes
  - resolution
  - remainder handling
- Keep negotiation and draft semantics off-chain until final funding.

## Frontend

- Replace abrupt hire-to-contract jumps with a draft-review surface.
- Show both sides the exact contract summary before funding.
- Keep all irreversible steps explicit:
  - accepting offer
  - locking draft
  - funding escrow
- Preserve the current contractor invite/join path, but make it feel like part of a coherent contract lifecycle rather than an isolated recovery flow.

## Data Integrity Rules

- Once a contract draft is finalized for funding, the metadata snapshot must be immutable.
- The eventual escrow job should retain a permanent reference to the originating offer/proposal snapshot.
- Fee and dispute settings must be visible in the snapshot so later support/review does not reconstruct terms from scattered records.

## Design Guide For This Phase

- Use [Marketplace Design Guide V1](./MARKETPLACE_DESIGN_GUIDE_V1.md) as the base.
- This phase needs legal/financial clarity more than visual novelty.
- Contract summary views should separate:
  - editable draft terms
  - accepted final terms
  - funded chain state
- Use strong visual callouts for irreversible transitions and fee/dispute terms.
- Wallet-signature and funding steps should explain consequence in product language, not only chain language.

## Exit Criteria

- An accepted offer becomes a contract draft without hand-copying data.
- Both sides can review the same finalized terms before funding.
- The escrow job carries immutable source-of-truth metadata from the accepted marketplace agreement.
- Funding flow still terminates in the existing escrow contract primitive.

## Verification

- API tests for state-machine transitions and snapshot immutability
- unit tests for metadata hashing and snapshot creation
- web tests for contract summary and review-before-funding flow
- browser flow for:
  - accept offer
  - review draft
  - fund escrow
  - reach active contract state

## Handoff To Phase 5

- Once contract formation is clean, the next gap is execution: users need a project room that keeps the work inside the platform after hire.
