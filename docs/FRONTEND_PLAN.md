# Frontend Plan

This document turns Phase 5 of the execution guide into a concrete frontend delivery sequence for `apps/web` and `apps/admin`.

## Current Reality

- `apps/web` is a functional console, not a polished product surface.
- `apps/admin` is an operator console, not a complete privileged workflow product.
- The frontend is still form-heavy and API-shaped.
- Browser-wallet-native SIWE linking now exists in `apps/web`.
- Frontend-specific automated coverage does not exist yet.

## Product Goals

- Make user onboarding and escrow operations feel product-native instead of API-demo-driven.
- Keep the UI honest to the current backend contract and avoid fake or placeholder flows.
- Ship role-aware client, worker, and operator paths with explicit loading, empty, error, and retry states.
- Add frontend testing as each product path is hardened.

## Non-Negotiable Rules

- Do not invent frontend flows that the backend cannot actually support.
- Prefer incremental productization over large visual rewrites.
- Keep all API state handling explicit and inspectable.
- Preserve manual fallback paths when wallet or relay capabilities are not guaranteed.
- Add tests for every meaningful new product path before claiming the surface is hardened.

## Surface Ownership

### `apps/web`

- email OTP session start, verify, refresh, logout
- policy preference and wallet state visibility
- browser-wallet-native and manual SIWE wallet linking
- smart-account provisioning and default execution wallet selection
- client and worker job views
- job creation, funding, milestone setup, delivery, release, dispute, and audit review

### `apps/admin`

- public audit-bundle lookup
- dispute and milestone posture review
- execution receipt inspection
- future privileged operator actions once backend auth and role boundaries exist

## Delivery Sequence

## Step 1: Harden Onboarding

### Scope

- keep OTP login simple and obvious
- improve session lifecycle messaging
- make browser-wallet connect, sign, and link the primary path
- keep manual SIWE challenge flow as a fallback
- make wallet and smart-account state easier to understand at a glance

### Exit Criteria

- a new user can authenticate, link a wallet, and provision a smart account without copying raw backend data unless fallback is needed
- wallet state clearly shows EOA versus smart-account posture
- onboarding failures tell the user what to fix next

### Status

- partially complete
- browser-wallet-native SIWE linking is now implemented
- smart-account provisioning still needs product polish and better success-state guidance

## Step 2: Productize Client Job Authoring

### Scope

- replace raw form-heavy job creation with a guided client composer
- add better defaults and field help for title, category, terms, worker address, and token address
- reduce direct JSON editing where structured inputs are possible
- improve success routing from create job into funding and milestone setup

### Exit Criteria

- a client can create a job without reading backend field names
- the flow guides the client into the next required step after creation
- validation errors map to the relevant form section

### Dependencies

- current API is already sufficient for the first pass

## Step 3: Build Role-Aware Job Workspaces

### Scope

- split job detail views by participant role instead of showing every action at once
- show clients funding, milestone authoring, and release actions prominently
- show workers delivery and dispute actions prominently
- show operator or arbitrator posture read-only where privileges are not yet available

### Exit Criteria

- client and worker users see different primary calls to action
- unavailable actions are explained instead of silently hidden
- job status, milestone status, and audit context stay visible while actions are taken

### Dependencies

- relies on the existing participant role data from `GET /jobs`

## Step 4: Harden Milestone Lifecycle UX

### Scope

- improve milestone editors and timeline presentation
- add strong confirmation states for funding, delivery, release, dispute, and resolution events
- separate optimistic UI from confirmed onchain or mocked execution outcomes
- present audit and execution history inline where the user needs it

### Exit Criteria

- milestone actions are understandable without reading raw JSON
- the user can tell whether an action is pending, confirmed, failed, or blocked
- audit visibility supports dispute and delivery evidence review

### Dependencies

- current API supports the first hardening pass

## Step 5: Turn `apps/admin` Into A Real Operator Surface

### Scope

- keep public audit lookup, but organize it around real operator tasks
- add dispute-centric case review and milestone posture summaries
- prepare export and evidence bundles once backend export support exists
- define privileged operator actions only when backend roles and authorization are implemented

### Exit Criteria

- an operator can inspect a dispute or execution problem without raw endpoint spelunking
- admin screens communicate what is public, what is privileged, and what is still blocked by backend work

### Dependencies

- privileged actions are blocked until the backend defines operator roles and authorization boundaries
- export actions are blocked until audit export support exists

## Step 6: Add Shared Frontend Infrastructure

### Scope

- extract repeated loading, empty, error, and status patterns
- normalize API error presentation
- standardize wallet, session, and job state refresh behavior
- define a minimal shared product language between `apps/web` and `apps/admin`

### Exit Criteria

- both frontend apps behave consistently under failure and retry conditions
- repeated UI logic is not copy-pasted across screens

## Step 7: Add Frontend Test Coverage

### Scope

- add component and route-level tests for onboarding, wallet linking, job creation, and milestone actions
- add end-to-end coverage for the main client path
- add focused operator-surface tests for audit lookup and execution inspection

### Exit Criteria

- frontend changes are not validated only by manual clicking
- tests assert UI behavior against real API contracts and known failure states

### Preferred Test Order

1. component and state-transition tests for onboarding and wallet flows
2. route-level tests for job and milestone screens
3. end-to-end tests against the local Postgres-backed API profile

## Backend Dependencies And Blockers

- privileged admin actions need real operator or arbitrator auth and authorization
- export surfaces need backend audit export support
- live relay-backed UX polish needs truthful staging infrastructure for wallet and escrow execution
- any production-grade dispute tooling depends on future indexing and operations slices

## Immediate Next Frontend Step

- productize client job authoring in `apps/web`
- replace raw form posture with a guided create-job flow that leads directly into funding and milestone setup

## Frontend Definition Of Done

- the path is understandable without backend knowledge
- loading, empty, error, and retry states are explicit
- the UI reflects real backend behavior instead of guessed future behavior
- the path has targeted frontend tests
- docs are updated when the plan or surface meaningfully changes
