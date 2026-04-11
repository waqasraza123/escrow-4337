# Environment Matrix

This matrix is the Phase 7 source of truth for local, staging, and production expectations.

## Local

| Surface | Expected posture |
| --- | --- |
| API | `services/api/.env.local` with Postgres plus mock email, mock smart-account, and mock escrow execution providers |
| Worker | Optional local shell process using the same API build and local Postgres profile |
| Web | Provider-managed local Next dev server pointed at `NEXT_PUBLIC_API_BASE_URL`, typically derived from `NEXT_PUBLIC_API_PORT=4100` |
| Admin | Provider-managed local Next dev server pointed at `NEXT_PUBLIC_API_BASE_URL`, typically derived from `NEXT_PUBLIC_API_PORT=4100` |

- Local is the default development profile.
- The zero-cost Postgres path in [infra/postgres/README.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/infra/postgres/README.md) remains the expected local database path.
- Local may use mock providers and should not be treated as staging evidence.

## Staging

| Surface | Expected posture |
| --- | --- |
| API | GHCR image from `services/api/Dockerfile`, running relay-backed config against Postgres |
| Worker | Same API image, separate process using `pnpm --filter escrow4334-api chain-sync:daemon` |
| Web | Provider-managed Next deployment with staging `NEXT_PUBLIC_API_BASE_URL` |
| Admin | Provider-managed Next deployment with staging `NEXT_PUBLIC_API_BASE_URL` |

- Staging is the first environment where `pnpm --filter escrow4334-api deployment:validate` and `pnpm smoke:deployed` must pass against live URLs.
- Staging should use GitHub Environment `staging`.
- Staging smoke is read-only and must not mutate remote state beyond deployment-validation probes.

## Production

| Surface | Expected posture |
| --- | --- |
| API | Same GHCR image and command contract as staging, promoted after staging smoke passes |
| Worker | Same GHCR image, separately scaled and deployed with explicit daemon ownership |
| Web | Provider-managed Next production deployment with production `NEXT_PUBLIC_API_BASE_URL` |
| Admin | Provider-managed Next production deployment with production `NEXT_PUBLIC_API_BASE_URL` |

- Production should use GitHub Environment `production`.
- Production promotion is manual.
- Production smoke stays read-only and should use a known-safe public audit job id when export checks are required.

## GitHub Environment Secret Contract

Both `staging` and `production` must provide the relay-backed API runtime variables from [services/api/.env.example](/Users/mc/development/blockchain/ethereum/base/Escrow4337/services/api/.env.example), plus deployed smoke inputs from [`.env.e2e.deployed.example`](/Users/mc/development/blockchain/ethereum/base/Escrow4337/.env.e2e.deployed.example).

Minimum required secret groups:

- Core runtime: `DATABASE_URL`, `DATABASE_SSL`, `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_ACCESS_TTL_SEC`, `JWT_REFRESH_TTL_SEC`, `AUTH_SESSION_TTL_SEC`, `AUTH_OTP_TTL_SEC`, `AUTH_OTP_VERIFY_MAX_ATTEMPTS`, `AUTH_OTP_LOCK_SEC`, `AUTH_OTP_SEND_WINDOW_SEC`, `AUTH_OTP_SEND_MAX_PER_WINDOW`, `AUTH_OTP_IP_SEND_WINDOW_SEC`, `AUTH_OTP_IP_SEND_MAX_PER_WINDOW`, `NEST_API_TRUST_PROXY`
- Email relay: `AUTH_EMAIL_MODE`, `AUTH_EMAIL_FROM_EMAIL`, `AUTH_EMAIL_FROM_NAME`, `AUTH_EMAIL_REPLY_TO`, `AUTH_EMAIL_RELAY_BASE_URL`, `AUTH_EMAIL_RELAY_API_KEY`, `AUTH_EMAIL_OTP_SUBJECT`
- Smart-account relay: `WALLET_SMART_ACCOUNT_MODE`, `WALLET_SMART_ACCOUNT_CHAIN_ID`, `WALLET_SMART_ACCOUNT_ENTRY_POINT_ADDRESS`, `WALLET_SMART_ACCOUNT_FACTORY_ADDRESS`, `WALLET_SMART_ACCOUNT_BUNDLER_URL`, `WALLET_SMART_ACCOUNT_RELAY_BASE_URL`, `WALLET_SMART_ACCOUNT_RELAY_API_KEY`, `WALLET_SMART_ACCOUNT_SPONSORSHIP_MODE`, `WALLET_SMART_ACCOUNT_PAYMASTER_URL`
- Escrow relay: `ESCROW_CONTRACT_MODE`, `ESCROW_CHAIN_ID`, `ESCROW_CONTRACT_ADDRESS`, `ESCROW_ARBITRATOR_ADDRESS`, `ESCROW_RELAY_BASE_URL`, `ESCROW_RELAY_API_KEY`
- Operations: `OPERATIONS_ESCROW_RPC_URL`, `OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_REQUIRED`, `OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_WEBHOOK_URL`
- Deployed smoke: `PLAYWRIGHT_DEPLOYED_WEB_BASE_URL`, `PLAYWRIGHT_DEPLOYED_ADMIN_BASE_URL`, `PLAYWRIGHT_DEPLOYED_API_BASE_URL`, `PLAYWRIGHT_DEPLOYED_EXPECT_PROFILE`, `PLAYWRIGHT_DEPLOYED_AUDIT_JOB_ID`, `PLAYWRIGHT_DEPLOYED_ALLOW_INSECURE_HTTP`, `PLAYWRIGHT_DEPLOYED_ALLOW_LOCALHOST`

## Deployment Contract

- API image: `ghcr.io/<owner>/escrow-4337-api`
- Default command: `node dist/main`
- Migration command: `pnpm --filter escrow4334-api db:migrate`
- Validation command: `pnpm --filter escrow4334-api deployment:validate`
- Worker command: `pnpm --filter escrow4334-api chain-sync:daemon`
