# Architecture

## Current System

The repository currently has four active system areas:

- `packages/contracts`: escrow contract logic and contract tests
- `services/api`: NestJS application for auth, wallet, escrow, and policy modules
- `packages/compliance`: reusable compliance policy package
- `apps/web` and `apps/admin`: frontend shells that still need real product implementation

## Current Boundaries

- Contracts own onchain escrow state transitions.
- The API owns authentication, email delivery, escrow orchestration, policy checks, persistence, and the provider boundaries for contract and wallet execution.
- The compliance package owns reusable policy definitions rather than API-local rule duplication.
- Frontends should consume product APIs and signing flows, not embed business logic that belongs in the backend or contracts.

## Target Production Architecture

### User Flow

1. User authenticates through the API.
2. User wallet or smart-account flow is provisioned.
3. Job and milestone terms are prepared offchain and anchored onchain as needed.
4. Funds move through the escrow contract.
5. API records business state, audit metadata, and admin actions.
6. Admin or arbitrator workflows resolve disputes.
7. Indexed events and exports support operational auditability.

### Planned Missing Layers

- indexer or event ingestion layer
- audit export and reporting layer
- deployment and environment management layer

## Architectural Direction

- Keep package boundaries explicit.
- Prefer workspace packages over deep relative imports for reusable logic.
- Keep domain rules centralized.
- Keep the contract as the source of truth for escrow state transitions.
- Keep the API as the source of truth for application orchestration and operator workflows.

## Current Gaps

- API auth and escrow state now persist through repository adapters, but the production path still needs a deployed Postgres environment and live provider validation.
- The auth module now uses a provider-backed OTP email boundary with rollback-safe issuance, but still needs live relay validation and further auth hardening.
- The escrow module now uses a contract gateway with receipt handling and authenticated proof-backed wallet actor resolution, and client job creation now requires a provisioned smart-account execution wallet.
- The wallet module now owns linked wallet state, SIWE-based ownership proof, smart-account provisioning, sponsorship policy, and default execution-wallet selection through mock and relay-backed provider boundaries.
- Frontend apps do not yet represent real product flows.
- The repo structure described in the original README is broader than the current tree.

## Working Conventions

- Update `docs/project-state.md` when durable architecture or roadmap decisions change.
- Update `docs/_local/current-session.md` when handing off active work locally.
- Prefer truthful documentation over aspirational repo claims.
