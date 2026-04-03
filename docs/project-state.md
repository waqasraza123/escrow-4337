# Project State

## Product
- Intended product: milestone escrow on Base with ERC-4337-style gasless onboarding, USDC funding, milestone release/refund/dispute flows, and optional Shariah mode.
- Current reality: prototype-stage monorepo. The contract is the strongest completed slice; the API and frontends are not production-ready.

## Current Architecture
- `services/api`: NestJS API with auth, wallet, escrow, and policy modules. Auth and escrow behavior exist as validated in-memory prototypes; users, OTPs, sessions, and escrow state are not yet persistent.
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
- Replace in-memory auth state with persistent storage and real integrations.
- Turn wallet and escrow API endpoints from validated in-memory orchestration into real contract-backed flows.
- Implement real web and admin product surfaces.
- Add missing indexing, audit/export, CI, and deployment/ops slices described in the README.
- Make root build and test flows meaningful end to end, not just partially wired, then expand coverage beyond auth.
- Keep each implementation phase explicitly test-heavy, with targeted unit or integration coverage added alongside the code change.

## Completed Major Slices
- `WorkstreamEscrow` contract supports job creation, funding, milestone delivery/release, disputes, resolution, and remainder refunds.
- Contract tests cover happy-path release/dispute and refund behavior.
- API auth prototype supports OTP start/verify, refresh, logout, `me`, and Shariah preference toggling.
- API escrow prototype now supports validated in-memory job creation, funding, milestone setup, delivery, release, dispute, resolution, and audit retrieval.
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

## Deferred / Not Yet Implemented
- Real database, migrations, and persistence layer.
- Real email provider and production auth hardening.
- Real ERC-4337 smart-account creation and paymaster/bundler integration.
- Contract-backed escrow orchestration and persistence in the API.
- Real user-facing web and admin flows.
- Indexer, subgraph, shared UI package, and infra/deployment modules described in the README.

## Risks / Watchouts
- Frontend apps are starter templates and should not be treated as implemented product surfaces.
- The worktree is already dirty around auth, policy, compliance, and TS config changes; read before editing nearby files.
- API typechecking still depends on the compliance package build output existing and matching source.
- Documentation should remain truth-first; do not reintroduce claims about missing repo layers as if they already exist.
- Root test coverage is still backend-heavy and does not yet validate contract-backed escrow integration, wallet flows, or product UIs end to end.

## Standard Verification
- `git status --short`
- `pnpm --filter @escrow4334/compliance build`
- `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit`
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `cd packages/contracts && forge test`
