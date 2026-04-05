# Project State

## Product
- Intended product: milestone escrow on Base with ERC-4337-style gasless onboarding, USDC funding, milestone release/refund/dispute flows, and optional Shariah mode.
- Current reality: prototype-stage monorepo. The contract is the strongest completed slice; the API and frontends are not production-ready.

## Current Architecture
- `services/api`: NestJS API with auth, email-delivery, wallet, escrow, policy, persistence, escrow-contract gateway, smart-account provisioning, and deployment-validation boundaries. Auth, OTP, session, user, wallet, and escrow lifecycle state flow through repository-backed persistence adapters; OTP delivery now runs through a provider-backed email boundary with rollback-safe issuance semantics; auth runtime policy is now environment-driven and validated for JWT, session, and OTP behavior; OTP start abuse protection now persists request-throttle state by source IP; wallet records now persist EOA verification metadata plus smart-account execution metadata; escrow mutations resolve actor identity from the authenticated user's linked wallets before submitting through the contract gateway; API startup now fails fast on invalid non-test deployment config and exposes built deployment-validation and migration-status commands that operate from compiled JS, ship SQL migration assets in `dist`, and return structured validation reports instead of crashing when config is incomplete. Tests use file-backed persistence plus mock contract, email, and smart-account providers; the production path targets Postgres and configured relay-backed providers.
- `packages/contracts`: Foundry workspace with `WorkstreamEscrow.sol` and contract tests.
- `packages/compliance`: workspace package exporting Shariah prohibited-category policy data.
- `apps/web`: Next.js client console with OTP auth, manual SIWE wallet-link challenge handling, smart-account provisioning, authenticated job listing, lifecycle mutation forms, and audit visibility wired to the API.
- `apps/admin`: Next.js operator console with job-audit lookup, milestone posture review, and execution receipt inspection wired to the public audit endpoint.
- `packages/sdk`: source files exist, but it is not a real workspace package.
- `packages/abi`: directory exists but is empty.
- README describes indexer, subgraph, shared UI, and infra layers, but those directories do not currently exist in the repo tree.

## Non-Negotiable Rules
- Treat repo state and code as the source of truth over aspirational docs.
- Do not revert unrelated user changes in the dirty worktree.
- Follow the current monorepo layout and existing NestJS module boundaries unless intentionally improving them.
- Keep durable and local context files concise, exact, and free of secrets.
- Do not claim checks are green unless they were run successfully.

## Current Roadmap
- Execute the new API deployment validation flow against real staging or production-like infrastructure, including deployed Postgres migration checks, live relay or provider reachability, bundler or paymaster chain validation, and deployed ingress or proxy validation.
- Harden and validate the new web and admin product-console surfaces against a real backend environment, then iterate toward browser-wallet-native onboarding and privileged operator workflows.
- Add missing indexing, audit/export, CI, and deployment/ops slices described in the README.
- Make root build and test flows meaningful end to end, not just partially wired, then expand coverage beyond auth.
- Keep each implementation phase explicitly test-heavy, with targeted unit or integration coverage added alongside the code change.

## Completed Major Slices
- `WorkstreamEscrow` contract supports job creation, funding, milestone delivery/release, disputes, resolution, and remainder refunds.
- Contract tests cover happy-path release/dispute and refund behavior.
- API auth prototype supports OTP start/verify, refresh, logout, `me`, and Shariah preference toggling.
- API auth, user, session, OTP, and wallet state now persist behind repository interfaces, with a Postgres driver and SQL migration runner plus a file-backed test adapter.
- API auth email delivery now runs through mock and relay-backed provider boundaries, renders a product-owned OTP template, and clears issued OTP codes if delivery fails.
- API auth refresh tokens now rotate on every refresh, are capped to the persisted session lifetime, and revoke the session if an old refresh token is replayed.
- API auth runtime now validates JWT secret strength in non-test environments and reads JWT, session, and OTP timing and rate-limit controls from environment configuration instead of hardcoded defaults.
- API auth start now persists source-IP OTP request throttle state, enforces IP-scoped send windows across different email addresses, and supports environment-driven trusted-proxy handling for deployments behind ingress.
- API escrow lifecycle state now persists behind the same persistence boundary and records confirmed or failed contract execution attempts for job creation, funding, milestone setup, delivery, release, dispute, resolution, and audit retrieval.
- API wallet endpoints now let authenticated users link wallets, set a default execution wallet, and surface wallet state through auth profile responses.
- API wallet linking now requires a persisted SIWE challenge and signature verification before a wallet can be attached to a user profile.
- API wallet provisioning now derives deterministic smart-account execution identities from SIWE-verified EOAs, persists execution metadata, exposes explicit sponsorship decisions, and supports mock or relay-backed providers through environment-driven chain, bundler, paymaster, and recovery configuration.
- API escrow mutations no longer accept explicit actor addresses; they derive the acting wallet from the authenticated user plus the persisted job role or arbitrator configuration.
- API job creation now requires the authenticated user's default execution wallet to be a provisioned smart account rather than a bare EOA.
- API now has deployment-validation tooling that fails fast on invalid non-test runtime config, reports Postgres connectivity plus migration status, probes configured relays, checks bundler chain identity, warns on non-introspectable paymasters, and surfaces trusted-proxy posture through a dedicated CLI command.
- API deployment-validation and migration CLIs now execute built `dist` entrypoints instead of `ts-node`, copy SQL migrations into build output, and keep deployment validation in a structured-report mode when config gaps block downstream probes.
- API escrow now exposes an authenticated jobs list so product surfaces can render participant-specific job views with derived client or worker roles.
- API now has a real test suite under `services/api/test` covering auth validation and the core auth session flow.
- API now has direct unit coverage for policy normalization, OTP lifecycle behavior, and session lifecycle behavior.
- API now has direct service and controller coverage for escrow lifecycle rules and endpoint validation.
- Compliance package contains a concrete Shariah prohibited-category list used by the API policy service.
- Web and admin apps now have real product-console surfaces instead of starter templates, with environment-driven API targets and explicit loading, empty, and error states.
- Repo foundation docs and governance files now exist for durable context, contributor workflow, and execution sequencing.
- Root `pnpm test` now executes a real API test path instead of failing on an empty Jest contract.

## Important Decisions
- This repo should be treated as a contract-first prototype, not a production-ready product.
- `docs/project-state.md` is the committed memory file for durable repo facts and decisions.
- `docs/_local/current-session.md` is the ignored restart/handoff file for the current working slice.
- The current active backend direction is to consume compliance rules through the workspace package instead of importing repo-relative source paths.
- The API TypeScript config resolves `@escrow4334/compliance` through the built declaration surface in `packages/compliance/dist`.
- Workspace packages now own their own `typecheck` scripts, and the root Turbo `typecheck` task depends on upstream package builds.
- Typecheck scripts must not leave new repo artifacts behind; `*.tsbuildinfo` is ignored and package typecheck commands disable incremental writes.
- Repo framing and governance now live in `readme.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `COLLABORATION.md`, `SECURITY.md`, `docs/ARCHITECTURE.md`, and `docs/EXECUTION_GUIDE.md`.
- API Jest tests map `jose` to a local test mock so the current test environment can exercise auth flows without blocking on ESM package loading.
- `PolicyService` accepts both `shariahMode` and `shariah_mode` inputs so tests and future integrations can bridge existing naming drift safely.
- The execution guide now treats tests as a required deliverable for each phase rather than a later hardening pass.
- API persistence is now owned through repository tokens so tests can use a file-backed adapter while production wiring targets Postgres.
- The auth module now uses a relay-backed email provider model in non-test environments and invalidates issued OTP codes when delivery fails.
- The auth module now validates JWT secret strength outside tests and centralizes JWT, session, and OTP runtime controls behind environment-driven configuration.
- The auth module now persists OTP request throttles by source IP, and API bootstrap can honor `NEST_API_TRUST_PROXY` so IP-aware auth controls work correctly behind trusted proxies.
- The wallet module now uses a relay-backed smart-account provider model in non-test environments, defaults recovery to the verified owner EOA, and only enables sponsored execution for SIWE-verified owners.
- The escrow module now depends on proof-backed wallet actor resolution plus a provisioned smart-account default for client job creation; in non-test environments it expects relay configuration for both escrow execution and smart-account provisioning.
- Non-test API startup should fail immediately on invalid deployment configuration, and backend deployment readiness should be evaluated through `pnpm --filter escrow4334-api deployment:validate` plus `pnpm --filter escrow4334-api db:migrate:status` rather than ad hoc manual checks.
- API operational CLIs should run from compiled artifacts, and build output must include SQL migrations so deploy-time database operations do not depend on source files or `ts-node`.

## Deferred / Not Yet Implemented
- Live end-to-end validation of the configured email relay against real environments.
- Live end-to-end validation of proxy-trust and IP-aware auth throttling behavior in deployed environments.
- Live end-to-end validation of the configured smart-account relay, bundler, and paymaster infrastructure against real environments.
- Live end-to-end validation of the configured escrow execution relay against real environments.
- Browser-wallet-native wallet onboarding and privileged admin action workflows are not yet implemented; current web and admin surfaces are read/write console prototypes on top of the existing API.
- Indexer, subgraph, shared UI package, and infra/deployment modules described in the README.

## Risks / Watchouts
- Frontend apps now expose real console workflows, but they still depend on the prototype API surface and manual environment configuration rather than hardened production deployment.
- The API now defaults to the Postgres persistence driver; non-test environments need `DATABASE_URL` set or startup will fail.
- Non-test auth startup now expects a strong `JWT_SECRET`; missing or weak values will fail auth runtime initialization.
- IP-aware OTP throttling depends on `NEST_API_TRUST_PROXY` being set correctly when the API runs behind a reverse proxy or ingress.
- Non-test auth email delivery now expects sender and email relay configuration; missing config will fail the delivery path.
- Non-test escrow execution now expects `ESCROW_CONTRACT_ADDRESS`, `ESCROW_ARBITRATOR_ADDRESS`, and `ESCROW_RELAY_BASE_URL`; missing config will fail the contract gateway path.
- Non-test smart-account provisioning now expects wallet relay, bundler, entry-point, factory, and optionally paymaster configuration; missing config will fail the provisioning path.
- Deployment validation now depends on relay health or reachability behavior and bundler JSON-RPC `eth_chainId`; providers that do not expose those conventions may require the new per-target healthcheck URL overrides.
- API typechecking still depends on the compliance package build output existing and matching source.
- Documentation should remain truth-first; do not reintroduce claims about missing repo layers as if they already exist.
- Root test coverage is still backend-heavy and does not yet validate live Postgres wiring, live smart-account provisioning, live relay integration, or product UIs end to end.

## Standard Verification
- `git status --short`
- `pnpm --filter escrow4334-api db:migrate:status`
- `pnpm --filter escrow4334-api deployment:validate`
- `pnpm --filter @escrow4334/compliance build`
- `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit`
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `cd packages/contracts && forge test`
