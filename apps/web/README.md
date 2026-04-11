# Web App

User-facing product surface for Milestone Escrow.

## Purpose

This app is intended to become the client and contractor experience for:

- onboarding
- job and milestone creation
- escrow funding and release flows
- delivery and dispute actions
- future smart-account onboarding

The app now has a real console surface for OTP auth, manual SIWE wallet linking, smart-account provisioning, job creation, milestone actions, and audit review. It is still prototype-grade and depends on the current API behavior and environment configuration.

## Current State

- built with Next.js App Router
- root lint and typecheck are wired and meaningful
- current page is a real client console wired to the API auth, wallet, jobs, and audit endpoints
- wallet linking is a manual SIWE challenge plus pasted-signature flow rather than browser-wallet-native UX
- API access is configured through `NEXT_PUBLIC_API_BASE_URL`

## Local Development

From the repo root:

```bash
pnpm --filter web dev
```

Copy [`.env.example`](/Users/mc/development/blockchain/ethereum/base/Escrow4337/apps/web/.env.example) to `apps/web/.env`. Local development derives `NEXT_PUBLIC_API_BASE_URL` from `NEXT_PUBLIC_API_PORT`, and deployed environments can override the full base URL directly.

Run the app-specific quality checks:

```bash
pnpm --filter web typecheck
pnpm --filter web lint
```

## Expected Direction

This app should eventually own:

- browser-wallet-native SIWE signing instead of manual signature paste
- richer role-aware workflow guidance and task-specific views
- stronger end-to-end coverage once the backend is exercised against a real environment

## Related Docs

- [Root README](/Users/mc/development/blockchain/ethereum/base/Escrow4337/readme.md)
- [Architecture](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/ARCHITECTURE.md)
- [Execution Guide](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/EXECUTION_GUIDE.md)
