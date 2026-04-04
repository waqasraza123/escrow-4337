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
- auth email delivery now runs through a product-owned template plus mock or relay-backed provider boundary, and OTP issuance is cleared if delivery fails
- refresh tokens now rotate on every refresh and replay of an old refresh token revokes the session
- JWT secret requirements plus JWT, session, and OTP timing and rate-limit controls are now validated through environment-driven auth configuration
- OTP request throttling now persists per source IP, applies across different email addresses, and can respect trusted proxy configuration during bootstrap
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

Auth email environment:

```bash
AUTH_EMAIL_MODE=relay
AUTH_EMAIL_FROM_EMAIL=no-reply@example.com
AUTH_EMAIL_FROM_NAME=Escrow4337
AUTH_EMAIL_REPLY_TO=support@example.com
AUTH_EMAIL_RELAY_BASE_URL=https://...
AUTH_EMAIL_RELAY_API_KEY=optional
AUTH_EMAIL_OTP_SUBJECT=Your Escrow4337 code
AUTH_EMAIL_OTP_TTL_MINUTES=10
```

Auth runtime environment:

```bash
JWT_SECRET=replace_with_a_32_char_minimum_secret
JWT_ISSUER=escrow4337
JWT_AUDIENCE=escrow4337:web
JWT_ACCESS_TTL_SEC=900
JWT_REFRESH_TTL_SEC=1209600
AUTH_SESSION_TTL_SEC=1209600
AUTH_OTP_TTL_SEC=600
AUTH_OTP_VERIFY_MAX_ATTEMPTS=5
AUTH_OTP_LOCK_SEC=600
AUTH_OTP_SEND_WINDOW_SEC=3600
AUTH_OTP_SEND_MAX_PER_WINDOW=5
AUTH_OTP_IP_SEND_WINDOW_SEC=3600
AUTH_OTP_IP_SEND_MAX_PER_WINDOW=20
NEST_API_TRUST_PROXY=loopback
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

- `src/modules/auth`: auth, OTP, JWT, guards, sessions, and provider-backed email delivery
- `src/modules/policy`: Shariah mode and category policy checks
- `src/modules/wallet`: authenticated SIWE challenge verification, smart-account provisioning, and execution-wallet management
- `src/modules/escrow`: persisted escrow lifecycle orchestration plus contract-gateway execution and receipt handling
- `src/persistence`: repository interfaces, file-backed test adapter, Postgres driver, and SQL migrations
- `src/common`: shared request and validation helpers

## Production Direction

Before this service can be treated as production-grade, it still needs:

- live validation of the configured email relay, contract relay, and smart-account relay infrastructure
- live validation of trusted-proxy and IP-throttle behavior in deployed environments
- admin and audit workflows
- stronger integration coverage around escrow and wallet behavior

## Related Docs

- [Root README](/Users/mc/development/blockchain/ethereum/base/Escrow4337/readme.md)
- [Architecture](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/ARCHITECTURE.md)
- [Execution Guide](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/EXECUTION_GUIDE.md)
