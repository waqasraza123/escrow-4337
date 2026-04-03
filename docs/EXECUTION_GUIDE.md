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

## Phase 7: Harden CI, Deployment, And Security

### Goal

Make the repo shippable, not just locally runnable.

### Work

- define CI stages for typecheck, lint, tests, and contract verification
- separate local, staging, and production environment expectations
- add secret handling and deployment runbooks
- perform focused security review on contract, auth, wallet, and admin paths

### Exit Criteria

- repo quality gates are automated
- deployment expectations are documented
- high-risk flows have explicit security review coverage

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

## Standard Sequencing Rule

Do not skip ahead when a lower-level dependency is still placeholder-grade. In practice:

- do not build real product UI on top of placeholder escrow endpoints
- do not rely on in-memory auth for production workflows
- do not claim production readiness before indexing, operations, and security posture exist

## Standard Verification

Use targeted checks first, then broader checks:

```bash
pnpm typecheck
pnpm lint
pnpm --filter @escrow4334/compliance build
pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit
cd packages/contracts && forge test
```
