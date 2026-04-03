# Web App

User-facing product surface for Milestone Escrow.

## Purpose

This app is intended to become the client and contractor experience for:

- onboarding
- job and milestone creation
- escrow funding and release flows
- delivery and dispute actions
- future smart-account onboarding

The app is still scaffold-stage. The current UI is not product-complete and should not be treated as representative of the intended experience.

## Current State

- built with Next.js App Router
- root lint and typecheck are wired and meaningful
- current pages are starter-level placeholders
- no real API client, wallet flow, or escrow journey is implemented yet

## Local Development

From the repo root:

```bash
pnpm --filter web dev
```

Run the app-specific quality checks:

```bash
pnpm --filter web typecheck
pnpm --filter web lint
```

## Expected Direction

This app should eventually own:

- account onboarding UX
- job and milestone lifecycle screens
- funding, delivery, release, and dispute interactions
- loading, empty, error, and retry states for every core workflow

Do not build real product UI here on top of placeholder API endpoints. Follow the sequence in the root execution guide first.

## Related Docs

- [Root README](/Users/mc/development/blockchain/ethereum/base/Escrow4337/readme.md)
- [Architecture](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/ARCHITECTURE.md)
- [Execution Guide](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/EXECUTION_GUIDE.md)
