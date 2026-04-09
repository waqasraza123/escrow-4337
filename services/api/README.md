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
- non-test startup now fails fast on invalid deployment configuration and the API exposes a deployment validation CLI for runtime config, migration status, relay reachability, bundler or paymaster probing, and trust-proxy posture
- API tests currently cover auth flow, policy behavior, OTP lifecycle behavior, session lifecycle behavior, and escrow lifecycle behavior

## Local Development

From the repo root:

```bash
cp infra/postgres/.env.example infra/postgres/.env
pnpm db:up
cp services/api/.env.local.example services/api/.env.local
pnpm --filter escrow4334-api db:migrate
pnpm --filter escrow4334-api start:dev
```

For zero-cost local development, use the checked-in Docker Postgres stack in [infra/postgres/README.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/infra/postgres/README.md) plus [`.env.local.example`](/Users/mc/development/blockchain/ethereum/base/Escrow4337/services/api/.env.local.example). That profile uses local Postgres with mock email, mock smart-account, and mock escrow execution modes so the API can run without paid relay providers. Docker is recommended for reproducibility, but a native Postgres 16+ install is also valid if it matches the same connection string contract.

Copy [`.env.example`](/Users/mc/development/blockchain/ethereum/base/Escrow4337/services/api/.env.example) to `services/api/.env` only when you are configuring a production-like relay-backed environment. The operational CLIs now execute the built `dist` entrypoints, so run `pnpm --filter escrow4334-api build` first when the output is missing or stale.

Phase 7 now also standardizes a reusable API or worker image contract through [services/api/Dockerfile](/Users/mc/development/blockchain/ethereum/base/Escrow4337/services/api/Dockerfile). The same image supports `node dist/main`, `pnpm --filter escrow4334-api db:migrate`, `pnpm --filter escrow4334-api deployment:validate`, and `pnpm --filter escrow4334-api chain-sync:daemon`. See [docs/ENVIRONMENT_MATRIX.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/ENVIRONMENT_MATRIX.md) and [docs/DEPLOYMENT_RUNBOOK.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/DEPLOYMENT_RUNBOOK.md) for staging or production expectations.
Phase 8 launch preparation now also exposes `GET /operations/launch-readiness` as the machine-readable launch posture for a deployed backend. See [docs/LAUNCH_READINESS.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/LAUNCH_READINESS.md) for the release-candidate evidence contract.

Targeted quality checks:

```bash
pnpm verify:ci
pnpm --filter escrow4334-api typecheck
pnpm --filter escrow4334-api lint
pnpm --filter escrow4334-api test -- --runInBand
pnpm --filter escrow4334-api db:migrate
pnpm --filter escrow4334-api db:migrate:status
pnpm --filter escrow4334-api deployment:validate
pnpm --filter escrow4334-api chain-sync:batch -- --help
pnpm --filter escrow4334-api chain-sync:daemon -- --help
pnpm --filter escrow4334-api chain-sync:daemon:health -- --help
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

Optional deployment-validation overrides:

```bash
DEPLOYMENT_VALIDATION_TIMEOUT_MS=5000
AUTH_EMAIL_RELAY_HEALTHCHECK_URL=https://...
WALLET_SMART_ACCOUNT_RELAY_HEALTHCHECK_URL=https://...
WALLET_SMART_ACCOUNT_BUNDLER_HEALTHCHECK_URL=https://...
WALLET_SMART_ACCOUNT_PAYMASTER_HEALTHCHECK_URL=https://...
ESCROW_RELAY_HEALTHCHECK_URL=https://...
```

Escrow chain-audit batch runner:

```bash
OPERATIONS_ESCROW_RPC_URL=https://base-sepolia.example.com
OPERATIONS_ESCROW_CHAIN_SYNC_BACKLOG_HOURS=6
OPERATIONS_ESCROW_BATCH_SYNC_LIMIT=25
OPERATIONS_ESCROW_BATCH_SYNC_PERSIST=false
pnpm --filter escrow4334-api chain-sync:batch -- --limit 10 --preview
```

Escrow chain-audit batch daemon:

```bash
OPERATIONS_ESCROW_RPC_URL=https://base-sepolia.example.com
OPERATIONS_ESCROW_BATCH_SYNC_LIMIT=25
OPERATIONS_ESCROW_BATCH_SYNC_PERSIST=true
OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_REQUIRED=true
OPERATIONS_ESCROW_BATCH_SYNC_SCHEDULE_INTERVAL_SEC=300
OPERATIONS_ESCROW_BATCH_SYNC_SCHEDULE_RUN_ON_START=true
OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_LOCK_ID=433704337
OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_MAX_HEARTBEAT_AGE_SEC=900
OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_MAX_CURRENT_RUN_AGE_SEC=1800
OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_MAX_CONSECUTIVE_FAILURES=3
OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_MAX_CONSECUTIVE_SKIPS=6
OPERATIONS_ESCROW_BATCH_SYNC_STATUS_FILE=
OPERATIONS_ESCROW_BATCH_SYNC_STATUS_RECENT_RUNS_LIMIT=10
OPERATIONS_ESCROW_BATCH_SYNC_ALERT_STATE_FILE=
OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_WEBHOOK_URL=https://alerts.example.com/escrow-chain-sync
OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_WEBHOOK_BEARER_TOKEN=optional
OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_WEBHOOK_TIMEOUT_MS=5000
OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_MIN_SEVERITY=critical
OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_RESEND_INTERVAL_SEC=3600
OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_SEND_RECOVERY=true
pnpm --filter escrow4334-api chain-sync:daemon -- --wait-first
pnpm --filter escrow4334-api chain-sync:daemon:health -- --notify --fail-on critical
```

When `PERSISTENCE_DRIVER=postgres`, the daemon uses a Postgres advisory lock keyed by `OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_LOCK_ID` so only one worker replica can own a given run at a time. The daemon also publishes a shared status snapshot with recent runs so protected API consumers can inspect recurring-worker state. The compiled `chain-sync:daemon:health` command evaluates that shared status, supports `--fail-on warning|critical|never`, and can send deduped webhook alerts or recovery notifications through `--notify`. Deployment validation now also checks the recurring-worker posture itself: when `OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_REQUIRED=true`, the repo expects an RPC URL, an alert webhook URL, and a heartbeat threshold larger than the schedule interval so healthy workers do not report stale between ticks. File-backed mode keeps the same in-process overlap protection, writes daemon status to `OPERATIONS_ESCROW_BATCH_SYNC_STATUS_FILE`, and persists alert dedupe state to `OPERATIONS_ESCROW_BATCH_SYNC_ALERT_STATE_FILE`, but it does not provide cross-process singleton guarantees.

Operations health now also records per-job chain-sync coverage metadata on each audit sync attempt and exposes `chain_sync_backlog` as an explicit attention reason when the latest sync is stale or failing. Tune that threshold with `OPERATIONS_ESCROW_CHAIN_SYNC_BACKLOG_HOURS`; protected health responses and the admin operator console both surface the resulting backlog count and job-level chain-sync status.

## Current Module Layout

- `src/modules/auth`: auth, OTP, JWT, guards, sessions, and provider-backed email delivery
- `src/modules/policy`: Shariah mode and category policy checks
- `src/modules/wallet`: authenticated SIWE challenge verification, smart-account provisioning, and execution-wallet management
- `src/modules/escrow`: persisted escrow lifecycle orchestration plus contract-gateway execution and receipt handling
- `src/persistence`: repository interfaces, file-backed test adapter, Postgres driver, and SQL migrations
- `src/common`: shared request and validation helpers

## Production Direction

Before this service can be treated as production-grade, it still needs:

- actual staging or production execution of the new deployment validation flow against the configured email relay, contract relay, and smart-account infrastructure
- actual staging or production verification of trusted-proxy and IP-throttle behavior behind ingress
- admin and audit workflows
- stronger integration coverage around escrow and wallet behavior

## Related Docs

- [Root README](/Users/mc/development/blockchain/ethereum/base/Escrow4337/readme.md)
- [Architecture](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/ARCHITECTURE.md)
- [Execution Guide](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/EXECUTION_GUIDE.md)
- [Environment Matrix](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/ENVIRONMENT_MATRIX.md)
- [Deployment Runbook](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/DEPLOYMENT_RUNBOOK.md)
- [Security Review](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/SECURITY_REVIEW.md)
