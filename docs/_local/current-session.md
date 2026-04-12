# Current Session

## Date
- 2026-04-12

## Current Objective
- Implement authoritative escrow chain ingestion and reconciliation inside `services/api` without creating a separate service.

## Last Completed Step
- Landed finalized-log ingestion, normalized chain-event persistence, per-job onchain projections, authority-aware escrow and marketplace read paths, operator ingestion status, and runtime or launch-readiness wiring; verified the full API test suite.

## Current Step
- Task complete. Waiting for follow-up review or extension work.

## Why This Step Exists
- The repo needed an internal chain-backed source of truth for escrow lifecycle facts so production reads can distinguish authoritative onchain state from local fallback state.

## Changed Files
- `docs/project-state.md`
- `docs/_local/current-session.md`
- `services/api/src/modules/escrow/escrow-export.ts`
- `services/api/src/modules/escrow/escrow.module.ts`
- `services/api/src/modules/escrow/escrow.service.ts`
- `services/api/src/modules/escrow/escrow.types.ts`
- `services/api/src/modules/marketplace/marketplace.module.ts`
- `services/api/src/modules/marketplace/marketplace.service.ts`
- `services/api/src/modules/operations/deployment-validation.service.ts`
- `services/api/src/modules/operations/escrow-chain-ingestion-status.service.ts`
- `services/api/src/modules/operations/escrow-chain-log.provider.ts`
- `services/api/src/modules/operations/escrow-chain-sync-daemon-monitoring.service.ts`
- `services/api/src/modules/operations/escrow-chain-sync.service.ts`
- `services/api/src/modules/operations/escrow-health.service.ts`
- `services/api/src/modules/operations/escrow-health.types.ts`
- `services/api/src/modules/operations/escrow-onchain-authority.service.ts`
- `services/api/src/modules/operations/launch-readiness.service.ts`
- `services/api/src/modules/operations/launch-readiness.types.ts`
- `services/api/src/modules/operations/operations.config.ts`
- `services/api/src/modules/operations/operations.controller.ts`
- `services/api/src/modules/operations/operations.module.ts`
- `services/api/src/modules/operations/runtime-profile.service.ts`
- `services/api/src/modules/operations/runtime-profile.types.ts`
- `services/api/src/persistence/file/file-persistence.store.ts`
- `services/api/src/persistence/file/file.repositories.ts`
- `services/api/src/persistence/persistence.types.ts`
- `services/api/src/persistence/postgres/migrations/012_escrow_chain_ingestion.sql`
- `services/api/src/persistence/postgres/postgres.repositories.ts`
- `services/api/test/deployment-validation.service.spec.ts`
- `services/api/test/escrow-chain-sync-daemon-alerting.service.spec.ts`
- `services/api/test/escrow-chain-sync.service.spec.ts`
- `services/api/test/launch-readiness.service.spec.ts`
- `services/api/test/runtime-profile.service.spec.ts`

## Key Constraints
- Authority stays split: onchain escrow facts come from projections when healthy; invite state, delivery notes, dispute evidence, operator notes, and marketplace application content stay API-owned.
- v1 remains inside `services/api` and existing worker commands.
- Ingestion is finalized-log based with bounded overlap; deep reorg replay is still postponed.

## Verification Commands
- `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit`
- `pnpm --filter escrow4334-api test -- --runInBand runtime-profile.service.spec.ts`
- `pnpm --filter escrow4334-api test -- --runInBand launch-readiness.service.spec.ts`
- `pnpm --filter escrow4334-api test -- --runInBand escrow-chain-sync.service.spec.ts`
- `pnpm --filter escrow4334-api test -- --runInBand escrow-health.service.spec.ts`
- `pnpm --filter escrow4334-api test -- --runInBand escrow.service.spec.ts`
- `pnpm --filter escrow4334-api test -- --runInBand marketplace.service.spec.ts`
- `pnpm --filter escrow4334-api test -- --runInBand escrow-export.spec.ts`
- `pnpm --filter escrow4334-api test -- --runInBand deployment-validation.service.spec.ts`
- `pnpm --filter escrow4334-api test -- --runInBand`

## Verification Status
- Passed:
  - `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit`
  - `pnpm --filter escrow4334-api test -- --runInBand`

## Expected Result
- Escrow reads, exports, operator health, runtime posture, and marketplace trust signals can prefer authoritative finalized-chain projections while preserving local fallback behavior when projection freshness or health is insufficient.

## Next Likely Step
- Add explicit API and browser coverage for the new ingestion status endpoint and for authority provenance on audit or operator views, then validate the worker loop against a real Postgres-backed local chain environment.
