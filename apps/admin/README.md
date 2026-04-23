# Admin App

Operator and dispute-management surface for Milestone Escrow.

## Purpose

This app now serves two audiences:

- `/` is a client-facing landing page for the escrow-first product path
- `/operator` and related routes remain the privileged operator interface for:

- dispute review and resolution
- compliance visibility
- audit and export workflows
- operational monitoring for escrow activity

The operator routes now have a real console for public audit bundle lookup, milestone posture review, execution receipt inspection, moderation, and support operations. The public root no longer exposes those diagnostics by default. The app remains prototype-grade and does not yet enforce broader privileged RBAC beyond the current capability checks.

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

Copy [`.env.example`](/Users/mc/development/blockchain/ethereum/base/Escrow4337/apps/admin/.env.example) to `apps/admin/.env`. Local development derives `NEXT_PUBLIC_API_BASE_URL` from `NEXT_PUBLIC_API_PORT`, and deployed environments can override the full base URL directly. Set `NEXT_PUBLIC_WEB_BASE_URL` when the admin landing should link to a separately deployed `apps/web` origin; leave it empty to fall back to same-origin product paths during local development.

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
