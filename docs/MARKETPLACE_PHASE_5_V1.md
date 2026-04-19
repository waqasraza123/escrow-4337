# Marketplace Phase 5 V1

## Status

- Version: `v1`
- Phase: `5`
- Title: Project Room and Execution Workspace
- Depends on: Phase 4

## Objective

- Make the platform usable after hiring by giving every active contract a shared project room for milestones, submissions, revisions, evidence, and release/dispute actions.

## In Scope

- contract-linked project room
- milestone list and progress view
- submission with artifacts
- revision requests
- release/dispute actions
- contract-scoped messaging
- activity feed
- evidence storage integration

## Not In Scope

- hourly tracking
- generic team collaboration suite
- off-platform comms enforcement

## Existing Repo Assets To Reuse

- current contract detail, delivery, dispute, and operator review routes
- escrow lifecycle mutation flows
- export/audit support
- existing invite/join and worker-side readiness logic

## Domain Additions

- `MilestoneSubmission`
- `SubmissionArtifact`
- `ReleaseDecision`
- revision request entity if kept separate
- contract conversation/thread aggregate
- `FeedEvent` / `ActivityReceipt`

## Implementation Guidance

## Backend

- Separate milestone submission records from final chain state so draft/revision behavior stays off-chain until a real delivery or dispute action is taken.
- Add object-storage-backed artifact handling with:
  - signed uploads
  - size/type validation
  - hash persistence
  - role-aware access control
- Add activity feed events for contract lifecycle actions so users and operators can reconstruct the work history without reading raw audit logs.
- Keep contract conversation distinct from pre-hire interview threads.

## Frontend

- Build a dedicated project room route grouping:
  - contract summary
  - milestones
  - submissions
  - messages
  - activity
  - dispute/release controls
- Client room priorities:
  - what needs review
  - what is blocked
  - pending releases
  - dispute escalation
- Talent room priorities:
  - what to deliver next
  - what revision is requested
  - what evidence has been accepted
  - what release is pending
- Keep audit/export accessible, but do not let audit views dominate the primary execution experience.

## Storage and Evidence

- All deliverable evidence should move to durable artifact storage.
- Persist content hashes for evidence and dispute attachments.
- Add malware scanning/moderation hooks if feasible before broad file support is opened.

## Design Guide For This Phase

- Use [Marketplace Design Guide V1](./MARKETPLACE_DESIGN_GUIDE_V1.md) as the base.
- Project room UX should be task-oriented, not generic-chat-oriented.
- The default mental model should be:
  - milestone
  - submission
  - review
  - release or revision
  - dispute if needed
- Use timeline plus checklist patterns.
- Keep evidence cards visually distinct from chat messages and from chain audit records.

## Exit Criteria

- Users can execute the fixed-price engagement without leaving the platform.
- Milestone submissions and revisions are modeled explicitly.
- Contract-scoped communication is available.
- Evidence is durable, access-controlled, and visible in both normal review and dispute flows.

## Verification

- API tests for submission lifecycle, artifact access control, and activity generation
- web tests for project room tabs/panels and milestone review states
- browser flow for:
  - submit deliverable
  - request revision
  - resubmit
  - release or dispute

## Handoff To Phase 6

- Once execution is coherent, public reviews and trust signals can reflect real project behavior instead of only pre-hire profile data.
