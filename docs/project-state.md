# Project State

## Product
- Intended product: milestone escrow on Base with ERC-4337-style gasless onboarding, USDC funding, milestone release/refund/dispute flows, and optional Shariah mode.
- Current reality: prototype-stage monorepo. The contract is the strongest completed slice; the API and frontends are not production-ready.

## Current Architecture
- `services/api`: NestJS API with auth, wallet, escrow, and policy modules. Auth has OTP/JWT/session flows, but users, OTPs, and sessions are in memory.
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
- Make the root typecheck pipeline real instead of a no-op.
- Replace in-memory auth state with persistent storage and real integrations.
- Turn wallet and escrow API endpoints into real contract orchestration.
- Implement real web and admin product surfaces.
- Add missing indexing, audit/export, CI, and deployment/ops slices described in the README.

## Completed Major Slices
- `WorkstreamEscrow` contract supports job creation, funding, milestone delivery/release, disputes, resolution, and remainder refunds.
- Contract tests cover happy-path release/dispute and refund behavior.
- API auth prototype supports OTP start/verify, refresh, logout, `me`, and Shariah preference toggling.
- Compliance package contains a concrete Shariah prohibited-category list used by the API policy service.

## Important Decisions
- This repo should be treated as a contract-first prototype, not a production-ready product.
- `docs/project-state.md` is the committed memory file for durable repo facts and decisions.
- `docs/_local/current-session.md` is the ignored restart/handoff file for the current working slice.
- The current active backend direction is to consume compliance rules through the workspace package instead of importing repo-relative source paths.
- The API TypeScript config resolves `@escrow4334/compliance` through the built declaration surface in `packages/compliance/dist`.

## Deferred / Not Yet Implemented
- Real database, migrations, and persistence layer.
- Real email provider and production auth hardening.
- Real ERC-4337 smart-account creation and paymaster/bundler integration.
- Real escrow endpoint behavior in the API.
- Real user-facing web and admin flows.
- Indexer, subgraph, shared UI package, and infra/deployment modules described in the README.

## Risks / Watchouts
- Root `pnpm typecheck` currently does not validate packages because no workspace package defines a `typecheck` script.
- Root `pnpm test` currently fails because the API package has no tests under its configured `test/**/*.spec.ts` path.
- Frontend apps are starter templates and should not be treated as implemented product surfaces.
- The worktree is already dirty around auth, policy, compliance, and TS config changes; read before editing nearby files.

## Standard Verification
- `git status --short`
- `pnpm --filter @escrow4334/compliance build`
- `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit`
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `cd packages/contracts && forge test`
