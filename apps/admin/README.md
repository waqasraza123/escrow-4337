# Admin App

Operator and dispute-management surface for Milestone Escrow.

## Purpose

This app is intended to become the internal or privileged interface for:

- dispute review and resolution
- compliance visibility
- audit and export workflows
- operational monitoring for escrow activity

The app now has a real operator console for public audit bundle lookup, milestone posture review, and execution receipt inspection. It remains prototype-grade and does not yet enforce privileged operator auth.

## Current State

- built with Next.js App Router
- root lint and typecheck are wired and meaningful
- current page is a real audit and execution inspector wired to the public job audit endpoint
- API access is configured through `NEXT_PUBLIC_API_BASE_URL`
- dispute workflows are inspected here, not executed from this app

## Local Development

From the repo root:

```bash
pnpm --filter admin dev
```

Copy [`.env.example`](/Users/mc/development/blockchain/ethereum/base/Escrow4337/apps/admin/.env.example) to `apps/admin/.env` and point `NEXT_PUBLIC_API_BASE_URL` at the running API.

Run the app-specific quality checks:

```bash
pnpm --filter admin typecheck
pnpm --filter admin lint
```

## Expected Direction

This app should eventually own:

- operator-authenticated actions instead of public read-only audit lookup
- compliance review, export, and case ownership workflows
- filtering, saved searches, and operational dashboards

## Related Docs

- [Root README](/Users/mc/development/blockchain/ethereum/base/Escrow4337/readme.md)
- [Architecture](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/ARCHITECTURE.md)
- [Execution Guide](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/EXECUTION_GUIDE.md)
