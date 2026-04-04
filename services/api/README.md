# API Service

NestJS application layer for Milestone Escrow.

## Purpose

The API is intended to own:

- authentication and session management
- policy and compliance-aware behavior
- wallet and smart-account orchestration
- escrow orchestration and admin-action foundations
- persistence, audit metadata, and operator tooling support

## Current State

- auth prototype exists with OTP, JWT, refresh, logout, `me`, and Shariah preference toggling
- auth, user, session, OTP, wallet, and escrow records now flow through repository-backed persistence boundaries
- tests use a file-backed persistence adapter, while the production driver targets Postgres
- wallet module now supports authenticated SIWE challenge issuance, wallet ownership verification, smart-account provisioning, explicit sponsorship policy, and default execution-wallet selection
- escrow module now submits job creation, funding, milestone, dispute, and resolution actions through a contract gateway and persists confirmed execution history alongside local state
- escrow mutation routes now derive actor identity from the authenticated user's linked wallets instead of accepting actor addresses in request payloads
- client job creation now requires a provisioned smart account as the default execution wallet
- test mode uses a mock contract gateway, while non-test environments target a configured relay for contract execution
- test mode uses a mock smart-account provider, while non-test environments target a configured relay plus environment-driven chain, bundler, paymaster, and recovery settings
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
pnpm --filter escrow4334-api db:migrate
```

Contract-execution environment:

```bash
ESCROW_CONTRACT_MODE=relay
ESCROW_CHAIN_ID=84532
ESCROW_CONTRACT_ADDRESS=0x...
ESCROW_ARBITRATOR_ADDRESS=0x...
ESCROW_RELAY_BASE_URL=https://...
ESCROW_RELAY_API_KEY=optional
```

Smart-account environment:

```bash
WALLET_SMART_ACCOUNT_MODE=relay
WALLET_SMART_ACCOUNT_CHAIN_ID=84532
WALLET_SMART_ACCOUNT_ENTRY_POINT_ADDRESS=0x...
WALLET_SMART_ACCOUNT_FACTORY_ADDRESS=0x...
WALLET_SMART_ACCOUNT_BUNDLER_URL=https://...
WALLET_SMART_ACCOUNT_RELAY_BASE_URL=https://...
WALLET_SMART_ACCOUNT_RELAY_API_KEY=optional
WALLET_SMART_ACCOUNT_SPONSORSHIP_MODE=verified_owner
WALLET_SMART_ACCOUNT_PAYMASTER_URL=https://...
```

## Current Module Layout

- `src/modules/auth`: auth, OTP, JWT, guards, sessions
- `src/modules/policy`: Shariah mode and category policy checks
- `src/modules/wallet`: authenticated SIWE challenge verification, smart-account provisioning, and execution-wallet management
- `src/modules/escrow`: persisted escrow lifecycle orchestration plus contract-gateway execution and receipt handling
- `src/persistence`: repository interfaces, file-backed test adapter, Postgres driver, and SQL migrations
- `src/common`: shared request and validation helpers

## Production Direction

Before this service can be treated as production-grade, it still needs:

- real email delivery
- live validation of the configured contract relay and smart-account relay infrastructure
- admin and audit workflows
- stronger integration coverage around escrow and wallet behavior

## Related Docs

- [Root README](/Users/mc/development/blockchain/ethereum/base/Escrow4337/readme.md)
- [Architecture](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/ARCHITECTURE.md)
- [Execution Guide](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/EXECUTION_GUIDE.md)
