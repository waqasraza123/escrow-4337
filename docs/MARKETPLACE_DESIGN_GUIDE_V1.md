# Marketplace Design Guide V1

## Status

- Version: `v1`
- Date adopted: `2026-04-19`
- Applies to:
  - `apps/web`
  - `apps/admin`
  - shared primitives in `packages/frontend-core`

## Product Design Principles

- Make the product feel like a hiring marketplace with escrow, not a contract demo with extra pages.
- Keep the money workflow legible at every step: who can act, what funds move, what is pending, and what becomes immutable.
- Separate discovery UX from execution UX:
  - public and pre-hire surfaces should feel browseable and credibility-focused
  - post-hire surfaces should feel operational, precise, and low-ambiguity
- Preserve the current crypto-native differentiators without forcing crypto jargon into every screen.
- Prefer clear system truth over decorative complexity. Marketplace trust depends on legibility.

## Information Architecture

- Public surfaces:
  - landing
  - talent directory
  - opportunity directory
  - talent profile
  - agency profile
  - opportunity page
  - trust/escrow explainer
  - pricing/fees
- Authenticated client surfaces:
  - dashboard
  - opportunities
  - applicants
  - interviews/messages
  - offers
  - contracts
  - disputes
  - billing/funding
- Authenticated talent surfaces:
  - dashboard
  - profile and portfolio
  - job discovery
  - applications
  - invites/interviews
  - offers
  - contracts
  - reviews
- Admin/operator surfaces:
  - moderation
  - disputes
  - chain/execution health
  - support
  - treasury/fees
  - ranking QA

## Visual Language

- Reuse `packages/frontend-core` primitives before adding app-local one-off systems.
- Keep public pages expressive and high-trust, but keep console screens denser and calmer.
- Preserve the repo's current spatial/glass language where it improves hierarchy, but reduce decorative motion in transactional views.
- Use color semantically:
  - success for confirmed release/funding states
  - warning for pending review or blocked readiness
  - danger for disputes, failures, sanctions, and irreversible risk states
  - neutral/secondary for derived analytics and passive metadata
- Surface chain-derived facts with visual provenance labels when they differ from API-owned workflow state.

## Interaction Rules

- Every major action must answer:
  - who is acting
  - what changes now
  - what still needs confirmation
  - what can no longer be edited afterward
- Use wizards only where the user must complete ordered prerequisites. Do not force step-by-step flows for simple edits.
- Prefer inline explainers over modal overload.
- Use timelines and status chips to explain multi-step workflows such as proposals, offers, submissions, disputes, and operator review.
- Keep permission failures explicit. Never hide controls without also explaining why the user lacks access.

## Trust and Money UX

- Always show settlement asset, network, actor authority, and dispute posture in contract/funding surfaces.
- Make fee treatment explicit before the user funds anything.
- Distinguish clearly between:
  - draft terms
  - accepted terms
  - funded escrow state
  - submitted work
  - released/disputed outcomes
- In dispute and moderation flows, keep evidence, operator actions, and final outcomes visually separate.

## Content Style

- Use plain language first; introduce crypto-specific terms only when needed.
- Explain the consequence of wallet actions and signatures in product language, not only protocol language.
- Keep audit and chain terminology consistent:
  - `pending`
  - `confirmed`
  - `chain-derived`
  - `API-owned`
  - `operator-reviewed`
- Avoid fake certainty. If a status depends on chain confirmation or background ingestion, say so.

## Accessibility and Internationalization

- Treat keyboard navigation, focus states, and screen-reader naming as mandatory on all critical workflows.
- Preserve RTL support and document direction handling already present in the repo.
- Keep metric-heavy cards readable in both LTR and RTL layouts.
- Motion must respect `prefers-reduced-motion`.

## Data-Dense Surface Patterns

- Search results should be scannable in under five seconds:
  - title
  - core metadata
  - trust signal
  - action
- Comparison views should keep repeated fields aligned across candidates or offers.
- Project rooms should default to timeline-plus-task posture rather than generic chat layouts.
- Operator surfaces should prioritize age, severity, ownership, and next action over cosmetic completeness.

## Component Guidance

- Shared candidates for `frontend-core`:
  - search filter bars
  - result cards
  - comparison tables
  - workflow timelines
  - reputation metric grids
  - fee breakdown panels
  - contract summary cards
  - evidence/attachment cards
  - operator queue rows
- Keep business copy and app-specific behavior in the apps; keep structure, semantics, and recurring shells in shared primitives.

## Definition Of Good Marketplace UX

- A client can discover, compare, hire, fund, and manage a fixed-price engagement without external docs.
- A freelancer can understand why they are shown a job, how they rank, what terms are being offered, and what to do next.
- An operator can identify risk, dispute posture, or execution failure quickly without reconstructing state from raw logs.
- No critical flow depends on hidden system knowledge.
