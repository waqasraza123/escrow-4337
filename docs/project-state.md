# Project State

## Product
- Intended product: milestone escrow on Base with ERC-4337-style gasless onboarding, USDC funding, milestone release/refund/dispute flows, and optional Shariah mode.
- Current reality: prototype-stage monorepo. The contract is the strongest completed slice; the API and frontends are not production-ready.

## Current Architecture
- `services/api`: NestJS API with auth, wallet, escrow, policy, persistence, escrow-contract gateway, and smart-account provisioning boundaries. Auth, OTP, session, user, wallet, and escrow lifecycle state flow through repository-backed persistence adapters; wallet records now persist EOA verification metadata plus smart-account execution metadata; escrow mutations resolve actor identity from the authenticated user's linked wallets before submitting through the contract gateway. Tests use file-backed persistence plus mock contract and smart-account providers; the production path targets Postgres and configured relay-backed providers.
- `packages/contracts`: Foundry workspace with `WorkstreamEscrow.sol` and contract tests.
- `packages/compliance`: workspace package exporting Shariah prohibited-category policy data.
- `apps/web` and `apps/admin`: Next.js apps still on starter-template pages.
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
- Finish production-facing backend integrations on top of the new persistence layer and smart-account flow, including real email delivery, deployed Postgres migration flow, and live relay/provider validation.
- Implement real web and admin product surfaces.
- Add missing indexing, audit/export, CI, and deployment/ops slices described in the README.
- Make root build and test flows meaningful end to end, not just partially wired, then expand coverage beyond auth.
- Keep each implementation phase explicitly test-heavy, with targeted unit or integration coverage added alongside the code change.

## Completed Major Slices
- `WorkstreamEscrow` contract supports job creation, funding, milestone delivery/release, disputes, resolution, and remainder refunds.
- Contract tests cover happy-path release/dispute and refund behavior.
- API auth prototype supports OTP start/verify, refresh, logout, `me`, and Shariah preference toggling.
- API auth, user, session, OTP, and wallet state now persist behind repository interfaces, with a Postgres driver and SQL migration runner plus a file-backed test adapter.
- API escrow lifecycle state now persists behind the same persistence boundary and records confirmed or failed contract execution attempts for job creation, funding, milestone setup, delivery, release, dispute, resolution, and audit retrieval.
- API wallet endpoints now let authenticated users link wallets, set a default execution wallet, and surface wallet state through auth profile responses.
- API wallet linking now requires a persisted SIWE challenge and signature verification before a wallet can be attached to a user profile.
- API wallet provisioning now derives deterministic smart-account execution identities from SIWE-verified EOAs, persists execution metadata, exposes explicit sponsorship decisions, and supports mock or relay-backed providers through environment-driven chain, bundler, paymaster, and recovery configuration.
- API escrow mutations no longer accept explicit actor addresses; they derive the acting wallet from the authenticated user plus the persisted job role or arbitrator configuration.
- API job creation now requires the authenticated user's default execution wallet to be a provisioned smart account rather than a bare EOA.
- API now has a real test suite under `services/api/test` covering auth validation and the core auth session flow.
- API now has direct unit coverage for policy normalization, OTP lifecycle behavior, and session lifecycle behavior.
- API now has direct service and controller coverage for escrow lifecycle rules and endpoint validation.
- Compliance package contains a concrete Shariah prohibited-category list used by the API policy service.
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
- The wallet module now uses a relay-backed smart-account provider model in non-test environments, defaults recovery to the verified owner EOA, and only enables sponsored execution for SIWE-verified owners.
- The escrow module now depends on proof-backed wallet actor resolution plus a provisioned smart-account default for client job creation; in non-test environments it expects relay configuration for both escrow execution and smart-account provisioning.

## Deferred / Not Yet Implemented
- Real email provider and production auth hardening.
- Live end-to-end validation of the configured smart-account relay, bundler, and paymaster infrastructure against real environments.
- Live end-to-end validation of the configured escrow execution relay against real environments.
- Real user-facing web and admin flows.
- Indexer, subgraph, shared UI package, and infra/deployment modules described in the README.

## Risks / Watchouts
- Frontend apps are starter templates and should not be treated as implemented product surfaces.
- The API now defaults to the Postgres persistence driver; non-test environments need `DATABASE_URL` set or startup will fail.
- Non-test escrow execution now expects `ESCROW_CONTRACT_ADDRESS`, `ESCROW_ARBITRATOR_ADDRESS`, and `ESCROW_RELAY_BASE_URL`; missing config will fail the contract gateway path.
- Non-test smart-account provisioning now expects wallet relay, bundler, entry-point, factory, and optionally paymaster configuration; missing config will fail the provisioning path.
- API typechecking still depends on the compliance package build output existing and matching source.
- Documentation should remain truth-first; do not reintroduce claims about missing repo layers as if they already exist.
- Root test coverage is still backend-heavy and does not yet validate live Postgres wiring, live smart-account provisioning, live relay integration, or product UIs end to end.

## Standard Verification
- `git status --short`
- `pnpm --filter @escrow4334/compliance build`
- `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit`
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `cd packages/contracts && forge test`
