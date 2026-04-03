# Contributing

## Goal

Contributions should move this repository toward a production-grade product foundation, not add isolated demos or disconnected code.

## Before You Start

- Read `readme.md`.
- Read `AGENTS.md`.
- Read `docs/project-state.md`.
- Read `docs/ARCHITECTURE.md`.
- Read `docs/EXECUTION_GUIDE.md`.

If you are resuming active work in a local checkout, also read `docs/_local/current-session.md` if it exists.

## Setup

```bash
pnpm install
pnpm typecheck
pnpm lint
```

For contract work:

```bash
cd packages/contracts
forge test
```

## How To Work In This Repo

- Make one meaningful step at a time.
- Keep changes cohesive and easy to review.
- Prefer improving the existing architecture over bypassing it.
- Do not commit secrets, local plans, or AI scratch files.
- Do not revert unrelated work in a dirty tree.
- Keep names descriptive and modules focused.

## Validation

Run the smallest relevant checks first.

Typical checks:

```bash
pnpm typecheck
pnpm lint
pnpm --filter @escrow4334/compliance build
pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit
cd packages/contracts && forge test
```

Do not claim repo health beyond the commands you actually ran.

## Documentation Expectations

Update docs when the change affects:

- architecture direction
- roadmap sequencing
- repo conventions
- durable operational constraints

Durable repo state belongs in `docs/project-state.md`.

Active local handoff state belongs in `docs/_local/current-session.md` and should not be committed.

## Pull Request Standard

A change is ready for review when:

- the scope is clear
- the change is cohesive
- the relevant verification commands were run
- the docs are updated if behavior or direction changed
- the change does not introduce obvious placeholder logic without calling it out

## Commit Messages

- Keep commit messages under 140 characters.
- Use short, direct descriptions.

Examples:

- `fix api compliance resolution`
- `make root typecheck real`
- `rewrite repo foundation docs`
