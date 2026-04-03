# API Service

NestJS application layer for Milestone Escrow.

## Purpose

The API is intended to own:

- authentication and session management
- policy and compliance-aware behavior
- future wallet orchestration
- future escrow orchestration and admin actions
- future persistence, audit metadata, and operator tooling support

## Current State

- auth prototype exists with OTP, JWT, refresh, logout, `me`, and Shariah preference toggling
- users, OTPs, and sessions are still stored in memory
- wallet module is not production-ready
- escrow module now has validated in-memory lifecycle orchestration for job creation, funding, milestones, delivery, release, dispute, resolution, and audit retrieval
- API tests currently cover auth flow, policy behavior, OTP lifecycle behavior, session lifecycle behavior, and escrow lifecycle behavior

## Local Development

From the repo root:

```bash
pnpm --filter escrow4334-api start:dev
```

Targeted quality checks:

```bash
pnpm --filter escrow4334-api typecheck
pnpm --filter escrow4334-api lint
pnpm --filter escrow4334-api test -- --runInBand
```

## Current Module Layout

- `src/modules/auth`: auth, OTP, JWT, guards, sessions
- `src/modules/policy`: Shariah mode and category policy checks
- `src/modules/wallet`: placeholder wallet surface
- `src/modules/escrow`: placeholder escrow surface
- `src/common`: shared request and validation helpers

## Production Direction

Before this service can be treated as production-grade, it still needs:

- persistent storage and migrations
- real email delivery
- real escrow orchestration against the contract layer instead of in-memory state
- real wallet and ERC-4337 strategy
- admin and audit workflows
- stronger integration coverage around escrow and wallet behavior

## Related Docs

- [Root README](/Users/mc/development/blockchain/ethereum/base/Escrow4337/readme.md)
- [Architecture](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/ARCHITECTURE.md)
- [Execution Guide](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/EXECUTION_GUIDE.md)
