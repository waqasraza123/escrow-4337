# Execution Guide

This guide describes the practical sequence for completing this repo from its current prototype state to a serious product foundation.

## Phase 1: Stabilize Repo Truth And Quality Gates

### Goal

Make the repo honest, predictable, and safe to continue.

### Work

- keep README and durable docs aligned with the actual tree
- keep root typecheck and lint meaningful
- make root test behavior truthful and not misleading
- remove accidental generated artifacts from normal workflows

### Exit Criteria

- root docs reflect current reality
- root `pnpm typecheck` and `pnpm lint` are trusted
- root `pnpm test` is either meaningful or intentionally scoped

### Required Test Gate

- targeted checks for each changed workspace pass before broader repo checks
- root `pnpm typecheck`, `pnpm lint`, and `pnpm test` must execute real work, not no-op
- documentation and workflow changes should still be validated with the smallest relevant command plus `git status --short`

## Phase 2: Make The API A Real Application Layer

### Goal

Replace prototype auth and placeholder backend behavior with real application infrastructure.

### Work

- introduce persistent user, session, and OTP storage
- define database schema and migrations
- replace console-based OTP delivery with a real provider integration
- define admin and operator roles
- add proper error handling and audit logging

### Exit Criteria

- API can survive restarts without losing core state
- auth and session behavior is not in-memory only
- backend actions are observable and testable

### Required Test Gate

- add or expand unit tests for every service that owns core state transitions
- add integration tests for auth, persistence, and provider boundaries
- test invalid input, expiration, revocation, replay, and rate-limit paths
- do not merge backend infrastructure changes without both targeted package tests and root `pnpm test`

## Phase 3: Complete Escrow Orchestration

### Goal

Connect the API to the contract in a product-usable way.

### Work

- define escrow DTOs and validation contracts
- implement real create, fund, milestone, deliver, release, dispute, and resolve flows
- define offchain term hashing and future EIP-712 boundaries
- model client, worker, and arbitrator permissions

### Exit Criteria

- API endpoints represent real escrow behavior
- contract interactions are reproducible and verified
- business rules are not hidden in controllers

### Required Test Gate

- add service-level tests for escrow orchestration rules before exposing controller flows
- add integration tests covering create, fund, deliver, release, dispute, resolve, and refund paths
- add negative-path tests for permission failures, invalid state transitions, and duplicate actions
- re-run contract tests whenever escrow API behavior depends on onchain assumptions

## Phase 4: Implement Wallet And ERC-4337 Flow

### Goal

Add a concrete smart-account strategy instead of placeholder wallet behavior.

### Work

- choose the account abstraction provider model
- define account creation and recovery posture
- define paymaster sponsorship rules
- wire bundler, paymaster, and chain configuration

### Exit Criteria

- wallet flow is real
- chain configuration is environment-driven
- gas sponsorship behavior is explicit and testable

### Required Test Gate

- add tests for account creation, sponsorship eligibility, and failure recovery paths
- cover environment-driven chain configuration and invalid configuration handling
- include integration tests for bundler and paymaster adapters with mocked provider boundaries
- do not rely on manual wallet testing as the primary verification path

## Phase 5: Build Real Product Surfaces

### Goal

Replace starter frontends with usable product flows.

### Work

- web app: onboarding, jobs, milestones, funding, delivery, dispute flow
- admin app: case review, dispute resolution, compliance visibility, export actions
- shared product language and states
- error and empty-state handling

### Exit Criteria

- core product paths are usable end to end
- frontend state maps cleanly to API contracts
- admin workflows are not hidden behind raw endpoints only

### Required Test Gate

- add component and route-level tests for each product path added in this phase
- add end-to-end coverage for onboarding, milestone actions, and dispute workflows
- verify loading, empty, error, and retry states instead of only happy paths
- ensure frontend tests assert contract and API expectations rather than duplicating backend logic

## Phase 6: Add Indexing, Audit, And Operations

### Goal

Support operational confidence and auditability.

### Work

- add event ingestion or indexing
- persist audit bundle inputs and outputs
- add export surfaces for disputes and job histories
- add operational visibility for failures and stuck jobs

### Exit Criteria

- operators can inspect history without raw chain spelunking
- audit and dispute workflows are reproducible

### Required Test Gate

- add ingestion tests for duplicate, delayed, and out-of-order event handling
- add export and audit-bundle tests that verify reproducible outputs
- cover operational failure paths such as partial ingestion, retry behavior, and stale state detection

## Phase 7: Harden CI, Deployment, And Security

### Goal

Make the repo shippable, not just locally runnable.

### Work

- define CI stages for typecheck, lint, tests, and contract verification
- separate local, staging, and production environment expectations
- maintain a reproducible zero-cost local Postgres path so local development does not depend on managed database vendors
- add secret handling and deployment runbooks
- perform focused security review on contract, auth, wallet, and admin paths

### Exit Criteria

- repo quality gates are automated
- deployment expectations are documented
- high-risk flows have explicit security review coverage

### Required Test Gate

- CI must execute the same typecheck, lint, test, and contract checks used locally
- add smoke tests for staging deployment paths and configuration validation
- add focused security regression tests for auth, admin, wallet, and contract integration boundaries

## Phase 8: Prepare For Launch

### Goal

Move from engineering readiness to controlled product readiness.

### Work

- define launch scope and exclusions
- define operator workflows and incident ownership
- define monitoring, alerting, and rollback posture
- validate legal, compliance, and chain-environment assumptions

### Exit Criteria

- launch scope is explicit
- operational ownership is clear
- repo docs match the actual launch surface

### Required Test Gate

- run a launch-candidate suite that covers the full supported product surface
- verify observability, alerting, and rollback drills with explicit evidence
- treat unresolved high-severity test failures or unowned incidents as launch blockers

## Standard Sequencing Rule

Do not skip ahead when a lower-level dependency is still placeholder-grade. In practice:

- do not build real product UI on top of placeholder escrow endpoints
- do not rely on in-memory auth for production workflows
- do not claim production readiness before indexing, operations, and security posture exist

## Standard Testing Rule

- every meaningful implementation step must either add tests or explicitly justify why no new test is the correct choice
- prefer targeted service or component tests first, then broader integration or end-to-end checks
- each new phase should raise coverage around its own failure modes, not only its happy paths
- if a step changes a contract between packages, test both the changed package and at least one consumer boundary

## Standard Verification

Use targeted checks first, then broader checks:

```bash
pnpm --filter escrow4334-api test -- --runInBand
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @escrow4334/compliance build
pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit
cd packages/contracts && forge test
```
