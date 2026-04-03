# Milestone Escrow

Production-oriented foundation for a Base-native milestone escrow product with smart-account onboarding, programmable milestone release, dispute handling, and compliance-aware workflows.

This repository is being hardened as a serious engineering repo, not presented as a finished product. The contract layer is the most mature slice today. The API, frontends, indexing, and operations layers are still in progress.

## What This Product Is

Milestone Escrow is designed for client-and-contractor work that needs:

- milestone-based funding and release
- transparent dispute resolution
- crypto-native settlement on Base
- gasless or low-friction onboarding
- auditability and compliance-aware workflows

The target experience is closer to a crypto-native Upwork escrow than a generic wallet demo.

## Who It Is For

- clients funding milestone-based work and wanting funds locked until delivery
- contractors who need transparent release and dispute mechanics
- operators or arbitrators resolving disputes with an auditable record
- teams that need a programmable escrow foundation with future compliance controls

## Problem It Solves

Traditional freelance and milestone payment flows are hard to audit, expensive to operate, and difficult to adapt for onchain settlement. Pure wallet-to-wallet payments also do not provide structured milestone release, formal dispute handling, or product-grade operational controls.

This project aims to close that gap with:

- an onchain escrow contract for milestone state transitions
- an API layer for auth, policy, orchestration, and future admin operations
- product surfaces for users and operators
- a repo structure that can evolve into a production system rather than a one-off demo

## Core Capabilities

Target capabilities:

- email-first onboarding with future ERC-4337 smart-account support
- milestone creation, funding, delivery, release, refund, and dispute flows
- compliance-aware category controls, including optional Shariah mode
- admin or arbitrator resolution workflows
- auditable event history and exportable records

Current implemented slices:

- `WorkstreamEscrow` Solidity contract with milestone release, dispute, resolution, and remainder refund behavior
- contract tests for the main happy-path and refund scenarios
- NestJS auth prototype with OTP/JWT/session flow and Shariah preference toggle
- compliance package with a concrete prohibited-category policy list

Current missing or incomplete slices:

- persistent database layer and migrations
- real email delivery
- real wallet and ERC-4337 orchestration
- real escrow API behavior
- real product UI in `apps/web` and `apps/admin`
- indexer, subgraph, shared UI package, and deployment infrastructure described in the original repo vision

## High-Level Architecture

Current repo architecture:

- `packages/contracts`: Foundry contract workspace and contract tests
- `services/api`: NestJS API for auth, wallet, escrow, and policy modules
- `packages/compliance`: reusable compliance policy package consumed by the API
- `apps/web`: user-facing Next.js app
- `apps/admin`: admin and operations Next.js app

Target production architecture:

- contracts own escrow state transitions and dispute resolution primitives
- API owns auth, orchestration, policy enforcement, admin workflows, and future persistence
- frontend apps own onboarding, job flow, and operator workflow UX
- future indexing and export layers own audit history, reporting, and operations visibility

See [docs/ARCHITECTURE.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/ARCHITECTURE.md) for the current-versus-target architecture view.

## Repo Structure

```text
apps/
  admin/                 Next.js admin surface
  web/                   Next.js user-facing surface
services/
  api/                   NestJS API
packages/
  compliance/            Compliance policy package
  contracts/             Foundry contracts and tests
  sdk/                   Incomplete SDK source, not yet a real workspace package
  abi/                   Present but currently empty
docs/
  project-state.md       Durable committed project memory
  ARCHITECTURE.md        Current and target architecture
  EXECUTION_GUIDE.md     Sequenced implementation roadmap
AGENTS.md                Durable instructions for future Codex sessions
CLAUDE.md                AI-assisted development guide
COLLABORATION.md         Human and AI workflow guide
CONTRIBUTING.md          Contributor expectations
SECURITY.md              Responsible disclosure guidance
```

## Local Setup

### Prerequisites

- Node 20+
- `pnpm`
- Foundry for contract work

Optional but expected later:

- Postgres
- Base Sepolia RPC access
- future bundler and paymaster credentials for ERC-4337 work

### Install

```bash
pnpm install
```

### Environment

Current repo environment handling is incomplete. Use `.env.example` as the starting point for the contract and frontend side, and review `services/api` config before introducing new required API variables.

Current example variables:

```bash
cp .env.example .env
```

Do not commit real secrets. Use environment-scoped secrets in CI and deployment.

## Development Workflow

1. Read [AGENTS.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/AGENTS.md).
2. Read [docs/project-state.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/project-state.md).
3. Read `docs/_local/current-session.md` if it exists in your local checkout.
4. Make one cohesive, meaningful change at a time.
5. Run the smallest relevant checks first, then broader repo checks.
6. Update durable or local context files when the task changes long-term state or active working context.

Additional workflow guidance lives in:

- [CONTRIBUTING.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/CONTRIBUTING.md)
- [COLLABORATION.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/COLLABORATION.md)
- [CLAUDE.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/CLAUDE.md)

## Quality Standards

Current meaningful verification commands:

```bash
pnpm typecheck
pnpm lint
pnpm --filter @escrow4334/compliance build
pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit
cd packages/contracts && forge test
```

Important repo truths:

- `pnpm typecheck` is meaningful and currently green.
- `pnpm lint` is meaningful and currently green.
- `pnpm test` is not yet a reliable root quality gate because the API package still lacks the expected test coverage layout.
- Do not claim repo health beyond the checks you actually ran.

## Production Readiness Direction

The next serious milestones are:

1. replace in-memory API state with persistence
2. complete wallet and escrow orchestration in the API
3. build real web and admin surfaces
4. add indexing, audit exports, and operations visibility
5. harden CI, deployment, observability, and security posture

The implementation sequence is documented in [docs/EXECUTION_GUIDE.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/EXECUTION_GUIDE.md).

## Project Docs

- [docs/project-state.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/project-state.md): durable project memory
- [docs/ARCHITECTURE.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/ARCHITECTURE.md): system boundaries and target direction
- [docs/EXECUTION_GUIDE.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/EXECUTION_GUIDE.md): step-by-step completion roadmap
- [CLAUDE.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/CLAUDE.md): AI assistant working guide
- [CONTRIBUTING.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/CONTRIBUTING.md): contribution expectations
- [COLLABORATION.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/COLLABORATION.md): working agreements
- [SECURITY.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/SECURITY.md): responsible disclosure guidance

## License

MIT. See [LICENSE](/Users/mc/development/blockchain/ethereum/base/Escrow4337/LICENSE).
