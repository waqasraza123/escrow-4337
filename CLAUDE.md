# Claude Guide

## Read First

1. `AGENTS.md`
2. `docs/project-state.md`
3. `docs/_local/current-session.md` if it exists locally
4. `readme.md`
5. `docs/ARCHITECTURE.md`
6. `docs/EXECUTION_GUIDE.md`

## Project Intent

This repo is building a production-grade foundation for a milestone escrow product on Base with:

- milestone escrow contracts
- future smart-account onboarding
- dispute resolution
- compliance-aware workflows
- product surfaces for users and operators

Do not treat it like a finished product or a demo throwaway. Treat it like an in-progress product platform that needs disciplined continuation.

## Current Reality

- Contracts are the strongest implemented slice.
- API auth exists as a prototype and still uses in-memory state.
- Wallet and escrow API flows are placeholders.
- Frontends are starter templates.
- `packages/compliance` is real.
- `packages/sdk` is incomplete.
- Indexer, subgraph, shared UI, and infra layers are not yet present in the tree.

## Architecture Direction

- Keep cross-package integration explicit and workspace-based.
- Contracts own escrow state transitions.
- API owns auth, orchestration, policy, and future persistence.
- Frontends own UX, not business-critical state.
- Durable project memory belongs in committed docs.
- Active handoff memory belongs in `docs/_local/current-session.md`.

## Working Rules

- Make one cohesive, meaningful step at a time.
- Prefer production-grade structure over quick patches.
- Keep functions and modules focused and readable.
- Do not revert unrelated user changes in a dirty worktree.
- Do not invent architecture that is not supported by repo direction.
- Do not store secrets in docs or context files.
- Update `docs/project-state.md` only for durable architecture, roadmap, or decision changes.
- Update `docs/_local/current-session.md` at the end of every meaningful task.
- Keep commit messages short and descriptive.
- Never claim a check is green unless you ran it.

## Repo Conventions

- NestJS modules live under `services/api/src/modules`.
- Shared API request/validation helpers belong under `services/api/src/common`.
- Contracts use Foundry under `packages/contracts`.
- Compliance rules belong in `packages/compliance`.
- Root `pnpm typecheck` and `pnpm lint` are meaningful quality gates.
- Root `pnpm test` is not yet a trustworthy repo-wide gate.

## Safe Continuation

- Start with targeted inspection, not assumptions.
- Prefer exact verification commands over prose.
- Use the execution guide for sequencing, not improvisation.
- If a task changes long-term repo direction, update the durable docs in the same step.
- If a task only changes active implementation state, update `docs/_local/current-session.md`.

## Standard Verification

```bash
git status --short
pnpm typecheck
pnpm lint
pnpm --filter @escrow4334/compliance build
pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit
cd packages/contracts && forge test
```
