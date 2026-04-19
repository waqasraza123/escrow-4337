# Marketplace Phase 3 V1

## Status

- Version: `v1`
- Phase: `3`
- Title: Proposal, Interview, and Offer Pipeline
- Depends on: Phase 2

## Objective

- Turn the current apply/shortlist/hire path into a real hiring workflow with revisions, clarifications, interviews, and offers.

## In Scope

- application revisions
- proposal status timeline
- clarifying questions
- shortlist workflow refinement
- invite-to-apply follow-through
- interview threads
- proposal comparison
- offer creation
- offer acceptance/countering
- decline/withdraw/no-hire reasons

## Not In Scope

- full post-hire project room
- ratings/reviews
- broad external messaging platform integration

## Existing Repo Assets To Reuse

- structured application schema
- shortlist/reject/withdraw/hire flows
- dossier scoring and applicant review surfaces
- current marketplace workspace and application lists

## Domain Additions

- `ApplicationRevision`
- `InterviewThread`
- `InterviewMessage`
- `Offer`
- `OfferMilestoneDraft`
- `OfferRevision`
- `HireDecision`
- `NoHireReason`

## Implementation Guidance

## Backend

- Keep applications immutable-by-revision rather than endlessly mutating one proposal blob.
- Scope conversations clearly:
  - opportunity-level invite/clarification
  - application/interview-level discussion
  - later contract/project-room discussion
- Introduce explicit offer state separate from final escrow job creation.
- Persist decision reasons for:
  - shortlist
  - reject
  - withdraw
  - no-hire
- Add comparison-ready query shapes so the client can review multiple candidates without the frontend stitching raw records together.

## API Surface

- application revise endpoint
- application messages/interview endpoint
- opportunity invite endpoint
- offer create endpoint
- offer accept/counter/decline endpoints
- decision audit or timeline endpoint

## Frontend

- Client surfaces:
  - applicants inbox
  - compare proposals
  - clarification thread
  - shortlist board
  - offer builder
- Talent surfaces:
  - applied opportunities
  - proposal timeline
  - clarification response
  - offer review and counter flow
- Preserve a clean handoff to contract drafting rather than jumping directly from hire to funded escrow.

## Data Integrity Rules

- Proposal revisions must preserve historical timeline and original client-visible terms.
- Offers must snapshot the proposed milestone structure they are based on.
- Withdrawal/decline reasons should be structured enough for later analytics.

## Design Guide For This Phase

- Use [Marketplace Design Guide V1](./MARKETPLACE_DESIGN_GUIDE_V1.md) as the base.
- Hiring UX should feel like a pipeline, not a chat app with random buttons.
- Show stage progression clearly:
  - applied
  - shortlisted
  - interviewing
  - offer sent
  - countered
  - accepted
  - closed
- Comparison views should align repeated fields across candidates.
- Keep interviews/task messaging scoped and contextual so the user always knows which opportunity or application the thread belongs to.

## Exit Criteria

- An application can be revised without losing history.
- Clients can shortlist, message, compare, and offer before creating an escrow contract.
- Talent can understand proposal status and respond without leaving the platform.
- Decision/no-hire analytics are persisted for future marketplace intelligence.

## Verification

- API tests for revision/version rules, offer transitions, and decision reason persistence
- web tests for comparison views, offer flow, and proposal timeline rendering
- browser flow for:
  - client reviews applicants
  - messages candidate
  - creates offer
  - talent counters or accepts

## Handoff To Phase 4

- Once offer flow exists, the next step is turning accepted terms into a fundable escrow contract without manual contract recreation.
