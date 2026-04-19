# Frontend Plan

> Status (2026-04-19): closed as an active plan and superseded by [Marketplace Plan V1](./MARKETPLACE_PLAN_V1.md). This document remains as historical detail for the frontend-specific work completed through Step 7.

This document turns Phase 5 of the execution guide into the current frontend source of truth for `apps/web` and `apps/admin`.

## Current Reality

- `apps/web` is now a productized client and worker console with guided job authoring, role-aware job workspaces, milestone lifecycle posture, audit visibility, backend runtime-profile validation, and explicit frontend-to-backend origin/CORS/transport diagnostics.
- `apps/admin` is now a task-oriented operator console for public audit lookup, dispute posture review, execution receipt inspection, backend runtime-profile validation, authenticated operator session handling, arbitrator-wallet-bound dispute resolution, and explicit frontend-to-backend origin/CORS/transport diagnostics.
- Shared frontend infrastructure now exists in `@escrow4334/frontend-core` for request handling, async-state helpers, formatting, storage, and status or empty-state primitives.
- Frontend-specific automated coverage now exists at the helper, route, local-profile end-to-end, and deployed-profile smoke levels in `apps/web`, `apps/admin`, and `packages/frontend-core`.

## Product Goals

- Make user onboarding and escrow operations feel product-native instead of API-demo-driven.
- Keep the UI honest to the current backend contract and avoid fake or placeholder flows.
- Ship role-aware client, worker, and operator paths with explicit loading, empty, error, retry, pending, and confirmed states.
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
- authenticated operator session refresh or restore
- manual arbitrator-wallet SIWE linking
- privileged dispute resolution when the authenticated session controls the configured arbitrator wallet

## Completed Slices

- Step 1: onboarding hardening is substantially complete for the current API scope, including browser-wallet-native SIWE linking, manual fallback, wallet posture visibility, and smart-account provisioning flows.
- Step 2: client job authoring is complete, with a guided composer, structured inputs, derived readiness checks, and post-create follow-up guidance.
- Step 3: role-aware job workspaces are complete, with client, worker, and limited operator posture presented as separate action contexts.
- Step 4: milestone lifecycle UX is complete, with explicit ready, pending, confirmed, failed, and blocked posture plus inline audit and execution context.
- Step 5: admin operator surface is complete for the current API scope, with case pressure summaries, dispute-centric milestone review, execution failure triage, runtime-profile posture, authenticated operator session handling, and arbitrator-wallet-bound dispute resolution.
- Step 6: shared frontend infrastructure is complete, with `@escrow4334/frontend-core` normalizing repeated request, async-state, formatting, and status-pattern behavior across both apps.

## Delivery Sequence

## Step 1: Harden Onboarding

### Outcome

- substantially complete for the current API surface

## Step 2: Productize Client Job Authoring

### Outcome

- complete

## Step 3: Build Role-Aware Job Workspaces

### Outcome

- complete

## Step 4: Harden Milestone Lifecycle UX

### Outcome

- complete

## Step 5: Turn `apps/admin` Into A Real Operator Surface

### Outcome

- complete

## Step 6: Add Shared Frontend Infrastructure

### Outcome

- complete

## Step 7: Add Frontend Test Coverage

### Goal

- add page-level, route-level, and end-to-end coverage so frontend behavior is not validated only by helper specs and manual clicking

### Phase 7.1: Frontend Test Harness Foundation

#### Scope

- use Vitest with `jsdom` and Testing Library for route and component behavior in both frontend apps
- keep the existing helper specs in place and expand from them rather than replacing them
- add small shared frontend test utilities for rendering console surfaces, mocking `fetch` or API module responses, mocking injected-wallet or EIP-1193 behavior, and seeding browser storage or session state
- keep tests package-local to `apps/web` and `apps/admin`; do not introduce a speculative shared UI test framework
- add one root Playwright entrypoint for browser-level happy-path coverage

#### Exit Criteria

- `apps/web` and `apps/admin` can run page or console behavior tests under their existing `test` scripts
- repeated test setup is centralized only where it removes real duplication
- the repo has one explicit root e2e command for browser-path verification

#### Tooling Expectations

- `apps/web`: helper tests plus route or UI behavior tests under the existing `test` path
- `apps/admin`: helper tests plus route or UI behavior tests under the existing `test` path
- root: one explicit Playwright-based e2e script

### Outcome

- complete

## Phase 7.2: `apps/web` Route And Interaction Coverage

### Outcome

- complete

### Scope

- onboarding and session:
  - OTP start success
  - OTP validation failure and retry messaging
  - OTP verify success and bad-code failure
  - session restore, refresh, and logout state transitions
- wallet linking and provisioning:
  - injected wallet available path
  - manual SIWE fallback path
  - wallet-link failure messaging
  - smart-account provisioning success or failure and default-wallet posture updates
- guided client job authoring:
  - step progression
  - derived readiness checks
  - validation mapped to the relevant section
  - post-create transition into milestone or funding follow-up
- role-aware job workspace and milestone lifecycle:
  - client versus worker primary actions
  - blocked or unavailable action explanations
  - pending, confirmed, and failed mutation states
  - audit or receipt visibility for milestone actions

### Exit Criteria

- `apps/web` tests exercise real UI behavior with mocked API boundaries, not only pure helper functions
- the main client path is covered from sign-in through selected-job workspace posture
- failure and retry states are asserted alongside success states

## Phase 7.3: `apps/admin` Route And Interaction Coverage

### Outcome

- complete

### Scope

- audit lookup success, empty, invalid-id, and request-failure states
- case pressure and milestone posture rendering from realistic audit bundles
- execution-failure triage rendering
- operator timeline visibility
- explicit blocked privileged-action messaging

### Exit Criteria

- `apps/admin` tests exercise the page and console surface, not only `operator-case.ts`
- the main operator lookup path is covered at UI level
- public-versus-blocked posture remains explicit and truthful under failure as well as success

## Phase 7.4: End-To-End Coverage Against The Local Development Profile

### Outcome

- complete

### Required First-Pass Scenarios

1. client signs in, links a wallet, provisions a smart account, creates a job, and reaches the selected-job workspace
2. client funds or stages the next lifecycle action and sees confirmed UI state after refresh
3. admin opens the same job's audit surface and sees the public audit bundle render correctly

### Environment Assumptions

- run against the existing local Postgres-backed API profile
- use truthful mock-provider mode where the repo already supports it
- do not require live relay infrastructure for the first e2e pass
- keep e2e focused on stable happy paths before expanding into a broader failure matrix

### Exit Criteria

- at least one cross-surface e2e flow runs against the local API profile
- e2e verifies browser behavior that cannot be trusted from isolated component tests alone

## Important Interface And Tooling Changes

- add app-local UI testing dependencies for `apps/web` and `apps/admin`
- add a small shared test utility layer only for repeated mocks and render helpers
- add one root Playwright-based e2e entrypoint with separate local and deployed-profile lanes
- keep runtime validation actionable inside the product UI by surfacing the frontend origin, backend CORS allowlist posture, and API transport safety
- do not add new backend API surface as part of Step 7
- do not add privileged admin flows as part of Step 7

## Backend Dependencies And Blockers

- broader operator RBAC and export surfaces still need future backend authz and operations work
- export surfaces need backend audit export support
- live relay-backed UX polish needs truthful staging infrastructure for wallet and escrow execution
- any production-grade dispute tooling depends on future indexing and operations slices

## Immediate Next Frontend Step

- Step 7 is complete
- run the new deployed-profile lane against an actual configured backend target, then expand operator failure coverage, export posture, and richer cross-surface live-environment flows

## Frontend Definition Of Done

- both frontend apps have page-level or console-level behavioral tests, not only helper tests
- the main user path in `apps/web` is covered from sign-in through job workspace state
- the main operator lookup path in `apps/admin` is covered at UI level
- at least one cross-surface e2e flow runs against the local API profile
- `pnpm test` remains meaningful and includes the expanded frontend coverage
- loading, empty, error, retry, pending, and confirmed states are asserted, not just happy paths
