# Project State

## Product
- Intended product: milestone escrow on Base with ERC-4337-style gasless onboarding, USDC funding, milestone release/refund/dispute flows, and optional Shariah mode.
- Current reality: prototype-stage monorepo. The contract is the strongest completed slice; the API and frontends are not production-ready.

## Current Architecture
- `services/api`: NestJS API with auth, email-delivery, wallet, escrow, policy, persistence, escrow-contract gateway, smart-account provisioning, deployment-validation, runtime-profile, read-only export boundaries, and an authenticated escrow-operations health report. Auth, OTP, session, user, wallet, and escrow lifecycle state flow through repository-backed persistence adapters; OTP delivery now runs through a provider-backed email boundary with rollback-safe issuance semantics; auth runtime policy is now environment-driven and validated for JWT, session, and OTP behavior; OTP start abuse protection now persists request-throttle state by source IP; wallet records now persist EOA verification metadata plus smart-account execution metadata; escrow mutations resolve actor identity from the authenticated user's linked wallets before submitting through the contract gateway; escrow job persistence now also carries operator-owned `operations.staleWorkflow` and `operations.executionFailureWorkflow` metadata so stale-job claims, failure acknowledgements, remediation notes, and structured remediation status survive across file-backed tests and Postgres-backed environments; API startup now fails fast on invalid non-test deployment config, can enable environment-driven browser CORS allowlists for separate frontend origins, exposes a public runtime-profile endpoint that classifies backend posture as `local-mock`, `mixed`, or `deployment-like`, now reports whether export support is available, exposes public job export artifacts for `job-history` and `dispute-case` in JSON or CSV, and exposes protected escrow-health endpoints that support validated `reason` and `limit` filters plus stale-job and execution-failure claim or release mutations for arbitrator-wallet operators, with each failed job now returning bounded execution diagnostics including recent failures, grouped action counts, grouped failure-code counts, acknowledgement posture against the latest known failure, provider-aware remediation guidance, and bounded `reconciliation_drift` findings from a separate persisted-timeline reconciliation pass over aggregate, audit, and confirmed execution history. Tests use file-backed persistence plus mock contract, email, and smart-account providers; the production path targets Postgres and configured relay-backed providers, and the repo now includes a pinned local Postgres Docker Compose stack plus a dedicated `.env.local` profile for zero-cost development against direct Postgres without managed vendors.
- `packages/contracts`: Foundry workspace with `WorkstreamEscrow.sol` and contract tests.
- `packages/compliance`: workspace package exporting Shariah prohibited-category policy data.
- `apps/web`: Next.js client console with OTP auth, browser-wallet-native plus manual SIWE wallet-link challenge handling, smart-account provisioning, guided client job authoring, role-aware job workspaces, lifecycle mutation forms, audit visibility, and backend runtime-profile validation posture wired to the API.
- `apps/admin`: Next.js operator console with public job-audit lookup, milestone posture review, execution receipt inspection, backend runtime-profile validation, authenticated operator session restore or refresh, manual arbitrator-wallet linking, arbitrator-bound dispute resolution, public job-history or dispute-case export downloads, and an authenticated cross-job operations-health view for open disputes, failed execution jobs, stale active jobs, and reconciliation drift that now supports reason filters, direct drill-in from an attention item into case review, assignable stale-job ownership with persisted remediation notes, richer failure diagnostics for repeated operator-visible execution issues, execution-failure claim plus acknowledgement workflows for operator follow-up, provider-aware remediation status or retry posture guidance for repeated execution failures, and bounded drift findings when persisted aggregate state diverges from its supporting audit or execution trail.
- `packages/frontend-core`: shared frontend workspace package for async-state helpers, API request and error normalization, local-storage utilities, formatting helpers, and unstyled status or empty-state primitives consumed by both Next apps.
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
- Harden and validate the new web and admin product-console surfaces against a real deployed backend environment, then expand operator failure coverage, richer export workflows, and live relay-backed workflows.
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
- API built CLIs now honor the same environment-file precedence as Nest runtime startup, so `.env.local` can safely override `.env.<env>` and `.env` during local Postgres and deployment operations without shell-specific workarounds.
- API now exposes `GET /operations/runtime-profile` so web and admin surfaces can validate whether they are pointed at a `local-mock`, `mixed`, or `deployment-like` backend profile before treating operator flows as staging-ready.
- API now exposes public job export artifacts through `GET /jobs/:id/export`, with deterministic `job-history` and `dispute-case` JSON or CSV downloads derived from the public audit bundle, and runtime-profile now truthfully reports `operator.exportSupport: true`.
- API escrow now exposes an authenticated jobs list so product surfaces can render participant-specific job views with derived client or worker roles.
- Repo now includes `infra/postgres` plus root `pnpm db:*` scripts so local development can run against a pinned Postgres 16 container and a dedicated `services/api/.env.local.example` profile instead of a managed database vendor.
- API now has a real test suite under `services/api/test` covering auth validation and the core auth session flow.
- API now has direct unit coverage for policy normalization, OTP lifecycle behavior, and session lifecycle behavior.
- API now has direct service and controller coverage for escrow lifecycle rules and endpoint validation.
- Compliance package contains a concrete Shariah prohibited-category list used by the API policy service.
- Web and admin apps now have real product-console surfaces instead of starter templates, with environment-driven API targets and explicit loading, empty, and error states.
- Web now supports browser-wallet-native SIWE linking through injected EIP-1193 wallets while preserving the manual challenge and signature fallback path.
- Web now replaces the raw create-job JSON posture with a guided client authoring flow that derives terms JSON, shows launch-readiness checks, and hands the user directly into milestone and funding follow-up actions.
- Web now uses participant-role-aware job workspaces so clients, workers, and future operator posture do not all share the same undifferentiated mutation panel.
- Web now hardens milestone lifecycle UX with status-aware milestone selection, explicit ready/pending/confirmed/failed action posture, inline audit and execution receipt context, and focused frontend lifecycle helper tests in `apps/web`.
- Admin now organizes the public audit bundle around operator tasks with case pressure summaries, dispute-focused milestone review, execution failure triage, combined event or receipt streams, explicit blocked privileged actions, recent lookup history, and focused admin helper tests in `apps/admin`.
- Web and admin now surface backend runtime-profile posture directly in the product UI, including provider modes, configured arbitrator wallet visibility, and warnings when the current backend is not deployment-ready.
- Web and admin now surface frontend-to-backend runtime alignment diagnostics directly in the product UI, including current frontend origin, CORS readiness against the backend allowlist, API transport safety, persistence posture, and trusted-proxy visibility through a shared frontend-core helper.
- Admin now supports authenticated operator sessions plus manual SIWE linking of the configured arbitrator wallet and can call the existing protected milestone-resolution endpoint when the session actually controls that wallet.
- Admin now supports production-grade public export downloads for job history and dispute-case artifacts directly from the loaded audit bundle instead of showing placeholder blocked-export posture.
- API now exposes a protected escrow-operations health report that summarizes open disputes, failed execution jobs, and stale active jobs across persisted escrow records for the linked arbitrator-wallet operator path.
- Admin now surfaces that escrow-operations health report as an authenticated operator panel with refresh, blocked-state messaging, and job-level attention summaries.
- Escrow operations health now supports validated `reason` and `limit` query controls, and the admin operations panel can filter those attention items and open a selected job directly into the existing case-review flow.
- Escrow operations health now supports assignable stale-job workflows: operators can claim or release stale jobs, persist remediation notes on the escrow aggregate, and see that ownership in the admin operations panel.
- Escrow operations health now returns bounded failed-execution diagnostics per job, and the admin operations panel surfaces grouped failure codes, grouped failing actions, and a short recent-attempt timeline for operator triage.
- Escrow operations health now supports execution-failure workflows: operators can claim repeated failure remediation, persist notes, acknowledge the latest known failure timestamp, and automatically see when a newer failure invalidates the prior acknowledgement.
- Escrow operations health now derives provider-aware remediation guidance per failed job and lets operators persist a structured failure-workflow status such as investigating, blocked externally, ready to retry, or monitoring.
- Escrow operations health now runs a separate persisted-timeline reconciliation pass and surfaces bounded `reconciliation_drift` findings when aggregate job state no longer matches its audit or confirmed execution history.
- Web and admin now share a dedicated `@escrow4334/frontend-core` workspace package for normalized API requests, async state transitions, formatting, persisted list utilities, and consistent status or empty-state primitives.
- Web and admin now have app-local Vitest `jsdom` plus Testing Library harnesses, shared browser-test helpers via `@escrow4334/frontend-core/testing`, route-level interaction coverage for onboarding, guided job authoring, selected-job posture, and operator lookup states, plus a root Playwright entrypoint with a local-profile cross-surface flow that signs in, links a wallet, provisions a smart account, creates and funds a job, and opens the same audit bundle in admin.
- Root Playwright now also supports a separate deployed-profile validation lane with explicit `PLAYWRIGHT_DEPLOYED_*` target configuration, read-only remote smoke coverage for web, admin, and the public runtime-profile endpoint, and an optional public-audit lookup check when a known remote job id is configured.
- Deployed-profile runtime validation no longer assumes healthy browser access to the backend profile: shared frontend diagnostics now surface `Runtime profile unavailable` plus unknown backend posture when the browser cannot load the runtime-profile endpoint, route tests cover that fallback in both apps, and the deployed Playwright lane derives expected runtime-alignment assertions from what the browser can actually read in the target environment.
- Repo foundation docs and governance files now exist for durable context, contributor workflow, and execution sequencing.
- Root `pnpm test` now executes a real API test path instead of failing on an empty Jest contract.

## Important Decisions
- This repo should be treated as a contract-first prototype, not a production-ready product.
- `docs/project-state.md` is the committed memory file for durable repo facts and decisions.
- `docs/FRONTEND_PLAN.md` owns the detailed sequencing for `apps/web` and `apps/admin`; `docs/EXECUTION_GUIDE.md` remains the higher-level repo roadmap.
- `docs/_local/current-session.md` is the ignored restart/handoff file for the current working slice.
- The current active backend direction is to consume compliance rules through the workspace package instead of importing repo-relative source paths.
- The API TypeScript config resolves `@escrow4334/compliance` through the built declaration surface in `packages/compliance/dist`.
- Workspace packages now own their own `typecheck` scripts, and the root Turbo `typecheck` task depends on upstream package builds.
- Next app `typecheck` scripts should generate route types with `next typegen` before running `tsc`, so root typecheck does not depend on pre-existing `.next/types` artifacts.
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
- Local development should remain zero-license-cost by default: direct Postgres, self-hosted locally through Docker Compose or an equivalent native Postgres install, with mock email, smart-account, and escrow providers allowed in development but not in production.
- Shared frontend test support should stay minimal: generic browser render or storage helpers can live in `@escrow4334/frontend-core/testing`, while app-specific API and wallet mocks stay package-local to `apps/web` or `apps/admin`.
- Browser-hosted frontend profiles should set `NEST_API_CORS_ORIGINS` explicitly instead of assuming same-origin hosting; local profiles should allow the web and admin app origins they actually run on.
- Frontend product surfaces should use the public runtime-profile contract to distinguish local-mock versus deployment-like backend posture instead of inferring readiness from environment names or manual operator knowledge.
- Operator export downloads should stay read-only and derive strictly from the public audit bundle until richer privileged export or RBAC-backed workflows exist.
- Stale-job remediation ownership should remain job-scoped operational metadata on the persisted escrow aggregate until a separate ingestion or reconciliation system exists.
- Reconciliation findings should stay truthfully scoped to persisted API-side audit and execution history; they improve drift detection but are not a chain indexer or source of onchain truth.
- Deployed frontend validation should run through the explicit `PLAYWRIGHT_PROFILE=deployed` lane with declared web, admin, and API targets; remote smoke checks should stay read-only unless a known-safe public audit job id is supplied.
- Long-running route-level frontend tests and the API wallet integration test now use explicit timeout budgets instead of framework defaults so root `pnpm test` remains stable under concurrent Turbo execution.

## Deferred / Not Yet Implemented
- Live end-to-end validation of the configured email relay against real environments.
- Live end-to-end validation of proxy-trust and IP-aware auth throttling behavior in deployed environments.
- Live end-to-end validation of the configured smart-account relay, bundler, and paymaster infrastructure against real environments.
- Live end-to-end validation of the configured escrow execution relay against real environments.
- Full operator RBAC, richer export workflows beyond the public audit-derived artifacts, and non-arbitrator privileged workflows are not yet implemented; the current admin privileged path is limited to authenticated sessions that link the configured arbitrator wallet and call dispute resolution through the existing protected API.
- Stale-job escalation beyond manual operator claims and provider-native retry execution or automated remediation beyond guidance plus status workflow are still pending.
- Operations health now includes a separate persisted-timeline reconciliation pass, but broader chain event ingestion, replay, and reconciliation against indexed onchain truth are still pending.
- Indexer, subgraph, shared UI package, and infra/deployment modules described in the README.

## Risks / Watchouts
- Frontend apps now expose real console workflows, but they still depend on the prototype API surface and manual environment configuration rather than hardened production deployment.
- Admin dispute resolution and public export downloads now exist in the UI, but privileged operator capability still depends on OTP-authenticated sessions manually linking the configured arbitrator wallet; there is not yet a broader operator role model.
- Escrow operations health now surfaces cross-job attention and stale-job ownership from persisted API state, but it is still not backed by a separate indexing or replay pipeline and should not be treated as chain-reconciled truth yet.
- Failed-execution workflows, diagnostics, remediation guidance, and reconciliation findings are intentionally bounded summaries over persisted API audit and execution records; they improve operator triage, acknowledgement, retry posture, and drift detection, but they do not yet execute retries automatically or provide chain reconciliation.
- Browser-wallet-native wallet linking now exists in the web app, but it still depends on injected-wallet support for `eth_requestAccounts`, `eth_chainId`, and `personal_sign`; unsupported wallets still need the manual fallback.
- The API now defaults to the Postgres persistence driver; non-test environments need `DATABASE_URL` set or startup will fail.
- Local zero-cost Postgres startup now assumes either a running Docker daemon for `infra/postgres` or an equivalent native Postgres instance with the same connection settings.
- Operations health now derives both attention signals and reconciliation drift from API-side persistence; it still does not ingest chain events from an external indexer.
- Non-test auth startup now expects a strong `JWT_SECRET`; missing or weak values will fail auth runtime initialization.
- IP-aware OTP throttling depends on `NEST_API_TRUST_PROXY` being set correctly when the API runs behind a reverse proxy or ingress.
- Non-test auth email delivery now expects sender and email relay configuration; missing config will fail the delivery path.
- Non-test escrow execution now expects `ESCROW_CONTRACT_ADDRESS`, `ESCROW_ARBITRATOR_ADDRESS`, and `ESCROW_RELAY_BASE_URL`; missing config will fail the contract gateway path.
- Non-test smart-account provisioning now expects wallet relay, bundler, entry-point, factory, and optionally paymaster configuration; missing config will fail the provisioning path.
- Deployment validation now depends on relay health or reachability behavior and bundler JSON-RPC `eth_chainId`; providers that do not expose those conventions may require the new per-target healthcheck URL overrides.
- API typechecking still depends on the compliance package build output existing and matching source.
- Documentation should remain truth-first; do not reintroduce claims about missing repo layers as if they already exist.
- Root verification still does not validate a real deployed frontend/backend target, live relay infrastructure, deployed ingress, or non-mock smart-account and escrow execution by default, even though the repo now includes frontend route coverage, backend runtime-profile visibility, one local-profile browser e2e path, and an explicit deployed-profile smoke lane.
- Frontend coverage now includes focused helper tests, route-level coverage in `apps/web` and `apps/admin`, a local-profile end-to-end browser flow, runtime-profile validation posture, and one authenticated arbitrator-resolution path, but broader failure-matrix coverage and richer operator workflows are still pending.

## Standard Verification
- `git status --short`
- `pnpm db:up`
- `pnpm --filter escrow4334-api db:migrate:status`
- `pnpm --filter escrow4334-api deployment:validate`
- `pnpm --filter @escrow4334/compliance build`
- `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit`
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm exec playwright test --list`
- `cd packages/contracts && forge test`
