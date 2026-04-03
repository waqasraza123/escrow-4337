# Admin App

Operator and dispute-management surface for Milestone Escrow.

## Purpose

This app is intended to become the internal or privileged interface for:

- dispute review and resolution
- compliance visibility
- audit and export workflows
- operational monitoring for escrow activity

The app is still scaffold-stage. The current UI is a placeholder, not an implemented operator tool.

## Current State

- built with Next.js App Router
- root lint and typecheck are wired and meaningful
- current pages are starter-level placeholders
- no real dispute, admin, or reporting workflows exist yet

## Local Development

From the repo root:

```bash
pnpm --filter admin dev
```

Run the app-specific quality checks:

```bash
pnpm --filter admin typecheck
pnpm --filter admin lint
```

## Expected Direction

This app should eventually own:

- case review and resolution flows
- operator-only action surfaces
- compliance and policy review visibility
- audit exports and operational tooling

Do not build admin UX against placeholder backend behavior and assume the workflow is settled. Use the repo execution sequence and current architecture docs.

## Related Docs

- [Root README](/Users/mc/development/blockchain/ethereum/base/Escrow4337/readme.md)
- [Architecture](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/ARCHITECTURE.md)
- [Execution Guide](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/EXECUTION_GUIDE.md)
