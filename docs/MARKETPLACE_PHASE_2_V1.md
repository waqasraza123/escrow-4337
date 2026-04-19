# Marketplace Phase 2 V1

## Status

- Version: `v1`
- Phase: `2`
- Title: Discovery, Search, and Read Models
- Depends on: Phase 1

## Objective

- Make the marketplace discoverable through search, filtering, and recommendation rather than manual links and deterministic browse pages alone.

## In Scope

- talent directory
- opportunity directory
- search filters
- search-oriented read models
- ranking feature snapshots
- recommendations
- saved searches and alerts
- invite-to-apply entry point

## Not In Scope

- ML-heavy ranking
- external search engine unless Postgres-backed search proves insufficient
- full interview/messaging pipeline

## Existing Repo Assets To Reuse

- current public talent and opportunity pages
- existing marketplace browse endpoints
- dossier scoring and fit/risk logic
- structured profile/opportunity/application fields already in persistence

## Domain Additions

- `OpportunitySearchDocument`
- talent search document equivalent
- `SavedSearch`
- `OpportunityView`
- `OpportunityRecommendationReason`
- `RankingFeatureSnapshot`
- `RecommendationCandidate`

## Implementation Guidance

## Backend

- Start with Postgres-backed denormalized search documents and ranked queries.
- Build a materialization path from canonical records into search documents rather than querying raw normalized tables for every public browse page.
- Expose search APIs separately from canonical CRUD APIs.
- Reuse current dossier/factor logic where possible to seed ranking features rather than creating two unrelated scoring systems.
- Add recommendation endpoints for:
  - talent for clients
  - jobs for talent

## Ranking V1

- Talent ranking signals:
  - profile completeness
  - skill/category fit
  - portfolio/proof relevance
  - verification posture
  - response rate
  - invite acceptance rate
  - completion rate
  - dispute rate
  - escrow-funded volume
  - recency
  - timezone overlap
- Opportunity ranking signals:
  - recency
  - budget clarity
  - outcomes/acceptance criteria completeness
  - client verification posture
  - fit density
  - prior hire success

## Async Work

- Add worker jobs for:
  - search document recomputation
  - ranking feature refresh
  - recommendation candidate generation
  - saved-search digest delivery
- Keep recomputation incremental where practical, but allow full rebuild commands for recovery and ops.

## Frontend

- Build real directory surfaces with fast filter interactions and clear result cards.
- Show why a result is relevant without exposing proprietary ranking internals.
- Add saved search and alert controls in the appropriate workspace.
- Add invite-to-apply actions on client-side search results.

## Admin/Operator

- Add a basic ranking QA surface later in the phase if it helps debug search quality, but do not block initial launch on elaborate admin visualization.

## Design Guide For This Phase

- Use [Marketplace Design Guide V1](./MARKETPLACE_DESIGN_GUIDE_V1.md) as the base.
- Result pages must be scan-first:
  - title
  - core fit metadata
  - trust signal
  - primary action
- Filters should be persistent, understandable, and easy to clear.
- Recommendation language should be helpful, not mystical. Prefer labels such as:
  - `strong skill match`
  - `timezone overlap`
  - `escrow-backed delivery history`
- Keep public directory pages visually richer than workspace result lists, but keep both information-dense.

## Exit Criteria

- Clients can search and filter talent without direct profile links.
- Talent can search and filter opportunities without manual routing.
- Saved searches and alerts exist for at least one side of the marketplace.
- Ranking is explainable enough to debug and trustworthy enough to ship.

## Verification

- API tests for search document materialization and ranked queries
- worker/job tests for document refresh and ranking snapshot generation
- web route tests for search/filter behavior and saved searches
- browser flows for:
  - client finds talent and invites to apply
  - talent finds opportunity and opens apply flow

## Handoff To Phase 3

- Once discovery is real, the next bottleneck becomes the hiring pipeline between application and final hire.
