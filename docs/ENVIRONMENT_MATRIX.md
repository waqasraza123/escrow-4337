# Environment Matrix

This matrix is the Phase 7 source of truth for local, staging, and production expectations.

## Local

| Surface | Expected posture |
| --- | --- |
| API | Not started by root `npm run dev`; use `npm run dev:local` only when deliberately running the local API profile |
| Worker | Optional local shell process using the same API build and local Postgres profile |
| Web | Local Next dev server pointed at cloud `CLOUD_API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL` |
| Admin | Local Next dev server pointed at cloud `CLOUD_API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL` |

- Local is the default development profile.
- The zero-cost Postgres path in [infra/postgres/README.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/infra/postgres/README.md) remains the expected local database path.
- When a single shared cloud backend is needed, use Neon Postgres through the API only; see [Neon Shared Backend](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/NEON_SHARED_BACKEND.md).
- Root `npm run dev` is intentionally cloud-first and refuses localhost API URLs so local frontend work does not silently connect to local backend services.
- `npm run dev:local` preserves the older full local dev behavior and may use mock providers; it should not be treated as staging evidence.

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
- Deployment validation should run with `DEPLOYMENT_TARGET_ENVIRONMENT=staging` so the repo enforces deployed browser target URLs plus backend CORS alignment instead of only checking provider config.
- Relay-backed providers are now validated in two layers:
  - reachability or health probes for relay, bundler, and paymaster posture
  - authenticated-route probes for email relay, smart-account relay, and escrow relay so staging can fail on bad credentials even when `/health` is up

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
- Deployment validation should run with `DEPLOYMENT_TARGET_ENVIRONMENT=production` so the same deployed browser target and CORS contract is enforced before promotion.
- Production should preserve the same authenticated provider-route validation contract used in staging.

## GitHub Environment Secret Contract

Both `staging` and `production` must provide the relay-backed API runtime variables from [services/api/.env.example](/Users/mc/development/blockchain/ethereum/base/Escrow4337/services/api/.env.example), plus deployed smoke inputs from [`.env.e2e.deployed.example`](/Users/mc/development/blockchain/ethereum/base/Escrow4337/.env.e2e.deployed.example).

Minimum required secret groups:

- Core runtime: `DATABASE_URL`, `DATABASE_SSL`, `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_ACCESS_TTL_SEC`, `JWT_REFRESH_TTL_SEC`, `AUTH_SESSION_TTL_SEC`, `AUTH_OTP_TTL_SEC`, `AUTH_OTP_VERIFY_MAX_ATTEMPTS`, `AUTH_OTP_LOCK_SEC`, `AUTH_OTP_SEND_WINDOW_SEC`, `AUTH_OTP_SEND_MAX_PER_WINDOW`, `AUTH_OTP_IP_SEND_WINDOW_SEC`, `AUTH_OTP_IP_SEND_MAX_PER_WINDOW`, `NEST_API_TRUST_PROXY`
- Email relay: `AUTH_EMAIL_MODE`, `AUTH_EMAIL_FROM_EMAIL`, `AUTH_EMAIL_FROM_NAME`, `AUTH_EMAIL_REPLY_TO`, `AUTH_EMAIL_RELAY_BASE_URL`, `AUTH_EMAIL_RELAY_API_KEY`, `AUTH_EMAIL_OTP_SUBJECT`
- Smart-account relay: `WALLET_SMART_ACCOUNT_MODE`, `WALLET_SMART_ACCOUNT_CHAIN_ID`, `WALLET_SMART_ACCOUNT_ENTRY_POINT_ADDRESS`, `WALLET_SMART_ACCOUNT_FACTORY_ADDRESS`, `WALLET_SMART_ACCOUNT_BUNDLER_URL`, `WALLET_SMART_ACCOUNT_RELAY_BASE_URL`, `WALLET_SMART_ACCOUNT_RELAY_API_KEY`, `WALLET_SMART_ACCOUNT_SPONSORSHIP_MODE`, `WALLET_SMART_ACCOUNT_PAYMASTER_URL`
- Escrow relay: `ESCROW_CONTRACT_MODE`, `ESCROW_CHAIN_ID`, `ESCROW_CONTRACT_ADDRESS`, `ESCROW_ARBITRATOR_ADDRESS`, `ESCROW_RELAY_BASE_URL`, `ESCROW_RELAY_API_KEY`
- Operations: `OPERATIONS_ESCROW_RPC_URL`, `OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_REQUIRED`, `OPERATIONS_ESCROW_BATCH_SYNC_DAEMON_ALERT_WEBHOOK_URL`
- Deployed smoke: `PLAYWRIGHT_DEPLOYED_WEB_BASE_URL`, `PLAYWRIGHT_DEPLOYED_ADMIN_BASE_URL`, `PLAYWRIGHT_DEPLOYED_API_BASE_URL`, `PLAYWRIGHT_DEPLOYED_EXPECT_PROFILE`, `PLAYWRIGHT_DEPLOYED_AUDIT_JOB_ID`, `PLAYWRIGHT_DEPLOYED_ALLOW_INSECURE_HTTP`, `PLAYWRIGHT_DEPLOYED_ALLOW_LOCALHOST`
- Optional deployment-validation overrides:
  - reachability: `AUTH_EMAIL_RELAY_HEALTHCHECK_URL`, `WALLET_SMART_ACCOUNT_RELAY_HEALTHCHECK_URL`, `WALLET_SMART_ACCOUNT_BUNDLER_HEALTHCHECK_URL`, `WALLET_SMART_ACCOUNT_PAYMASTER_HEALTHCHECK_URL`, `ESCROW_RELAY_HEALTHCHECK_URL`
  - authenticated route: `AUTH_EMAIL_RELAY_VALIDATION_URL`, `WALLET_SMART_ACCOUNT_RELAY_VALIDATION_URL`, `ESCROW_RELAY_VALIDATION_URL`

Required non-secret runtime contract for deployed validation:

- `DEPLOYMENT_TARGET_ENVIRONMENT=staging` or `production`
- `NEST_API_CORS_ORIGINS` must include the origins from `PLAYWRIGHT_DEPLOYED_WEB_BASE_URL` and `PLAYWRIGHT_DEPLOYED_ADMIN_BASE_URL`
- deployed browser target URLs must use HTTPS unless `PLAYWRIGHT_DEPLOYED_ALLOW_INSECURE_HTTP=true`
- deployed browser target URLs must not point at loopback/localhost unless `PLAYWRIGHT_DEPLOYED_ALLOW_LOCALHOST=true`
- provider validation must be able to reach both the health or reachability URL and the protected validation route for relay-backed email, smart-account, and escrow providers unless those routes are explicitly overridden

## Deployment Contract

- API image: `ghcr.io/<owner>/escrow-4337-api`
- Default command: `node dist/main`
- Migration command: `pnpm --filter escrow4334-api db:migrate`
- Validation command: `pnpm --filter escrow4334-api deployment:validate`
- Worker command: `pnpm --filter escrow4334-api chain-sync:daemon`
