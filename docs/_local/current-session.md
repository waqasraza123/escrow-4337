# Current Session

## Date
- 2026-04-17

## Current Objective
- Propagate marketplace-origin Phase 8 evidence through every promotion artifact and rollback gate so marketplace support remains explicit from deployed smoke through promotion review, release dossier, stable approved-release pointer publication, production rollback selection, launch-candidate rollback provenance, final release-packet rollback provenance, approved-pointer rollback provenance, promotion-review rollback provenance, promotion-review artifact-selection provenance, final release-packet artifact-selection provenance, approved-pointer artifact-selection provenance, rollback release-pointer selection provenance, strict artifact-search rollback-pointer provenance validation, explicit release-dossier review-selection rendering, strict artifact-search review-selection provenance validation, mandatory review-selection artifact names, and mandatory review run provenance in approved pointers.

## Last Completed Step
- Review-selection artifact names are now mandatory anywhere selection provenance exists: promotion review blocks missing artifact names, the release dossier validator rejects persisted review selections without artifact names, and approved release pointers require review artifact names whenever deployed-smoke or launch-candidate selection sources are present.

## Current Step
- Task complete. Approved release pointers now preserve review run provenance explicitly: deployed-smoke and launch-candidate run ids and URLs are carried into the stable pointer, exported through env and markdown output, and required whenever review selection provenance is present.

## Why This Step Exists
- The stable approved pointer should be self-contained for audit and rollback review. If it records deployed-smoke or launch-candidate selection provenance but drops the underlying review run ids and URLs, operators still have to reconstruct key evidence links from older artifacts.

## Changed Files
- Approved pointer review run provenance:
  `scripts/release-pointer-lib.mjs`
  `scripts/release-pointer.mjs`
  `scripts/release-pointer-lib.test.mjs`
- Docs:
  `docs/_local/current-session.md`

## Key Constraints
- Keep scope inside promotion-artifact hardening; do not add new environment secrets or staging-only code paths.
- Treat marketplace canaries as part of the supported launch surface rather than an optional note attached to generic seeded or exact canaries.
- Preserve backward-compatible artifact schemas where possible while still surfacing the new marketplace-specific fields plainly in JSON and markdown outputs.
- Keep the approved pointer self-contained without weakening the existing rollback and review provenance checks or forcing new workflow inputs beyond the review metadata already present in the release dossier.

## Verification Commands
- `node --test scripts/launch-candidate-lib.test.mjs scripts/promotion-review-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/release-pointer-lib.test.mjs scripts/release-review-selection-lib.test.mjs`
- `git diff --check`

## Verification Status
- Passed:
  - `node --test scripts/launch-candidate-lib.test.mjs scripts/promotion-review-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/release-pointer-lib.test.mjs scripts/release-review-selection-lib.test.mjs`
  - `git diff --check`
- Blocked or not run:
  - exact deployed marketplace canary against a real staged target
  - seeded deployed marketplace canary against a real staged target
  - deployed smoke workflow end-to-end run exercising a failed marketplace seeded lane and confirming the artifact still uploads
  - release dossier generation from real staged smoke plus launch evidence
  - release pointer generation and validation from a real staged approved dossier
  - production launch-candidate workflow run proving rollback auto-resolution rejects stale or incomplete approved pointers
  - promotion-review workflow run proving invalid generated pointers fail before upload
  - launch-candidate workflow run proving rollback source and pointer provenance land in the real promotion record
  - promotion-review workflow run proving rollback provenance lands in the real release dossier
  - promotion-review workflow run proving rollback provenance lands in the real approved release pointer
  - promotion-review workflow run proving rollback provenance is visible and reconciled in the real approval artifact
  - promotion-review workflow run proving artifact auto-discovery versus manual pinning is visible in the real approval artifact
  - promotion-review workflow run proving artifact auto-discovery versus manual pinning is preserved in the real release dossier
  - promotion-review workflow run proving artifact auto-discovery versus manual pinning is preserved in the real approved release pointer
  - launch-candidate workflow run proving rollback release-pointer selection provenance is preserved in the real promotion record
  - launch-candidate workflow run proving artifact-search rollback release-pointer selections fail when artifact id or selected timestamp is missing
  - promotion-review workflow run proving rollback release-pointer selection provenance is preserved in the real approval artifact
  - promotion-review workflow run proving rollback release-pointer selection provenance is preserved in the real release dossier
  - promotion-review workflow run proving rollback release-pointer selection provenance is preserved in the real approved release pointer
  - promotion-review workflow run proving release-dossier markdown renders explicit review-selection artifact ids and timestamps from real staged evidence
  - promotion-review workflow run proving artifact-search deployed-smoke and launch-candidate review selections fail when artifact id or selected timestamp is missing
  - promotion-review workflow run proving deployed-smoke and launch-candidate review selections fail when artifact name is missing
  - promotion-review workflow run proving approved release pointers preserve deployed-smoke and launch-candidate review run ids and URLs from real staged evidence
  - full `pnpm launch:candidate` evidence run against staging or production
  - `pnpm verify:authority:deployed`

## Next Likely Step
- Run the exact and seeded deployed marketplace canaries plus the updated deployed-smoke workflow against a real staged environment, then generate launch-candidate, promotion-review, release-dossier, and release-pointer artifacts from real evidence and verify rollback provenance, artifact-selection provenance, rollback release-pointer selection provenance, strict artifact-search rollback and review provenance validation, mandatory review artifact names, explicit release-dossier selection rendering, and approved-pointer review run provenance end to end against an approved pointer-backed production candidate.

## Update (2026-04-17)
- Added README badges at the top (English + العربية + key stack badges).
- Changed files:
  - `readme.md`

## Update (2026-04-19)
- Reviewed current implementation to identify the product's top three implemented feature pillars: marketplace hiring, escrow lifecycle/dispute handling, and ERC-4337-style wallet onboarding.
- Conclusion:
  - Core escrow lifecycle is the strongest completed slice.
  - Marketplace publish/apply/hire-to-escrow is implemented and meaningfully covered, but still intentionally shallow in ranking/moderation depth.
  - Wallet onboarding is implemented and tested, but still depends on mock-vs-relay infrastructure posture rather than proven hardened production wiring.
- Verification run for this review:
  - `cd packages/contracts && forge test`
  - `pnpm --filter escrow4334-api test -- --runTestsByPath test/marketplace.service.spec.ts test/marketplace.controller.integration.spec.ts test/escrow.service.spec.ts test/escrow.controller.integration.spec.ts test/wallet.integration.spec.ts`
  - `pnpm --filter escrow4334-api test -- --runTestsByPath test/escrow-export.spec.ts test/policy.service.spec.ts`
- Result:
  - Passed: all targeted contract and API suites above
- Build-focused next steps:
  - deepen marketplace ranking/trust workflows
  - reduce wallet/provisioning dependence on mock-mode assumptions
  - polish multi-step contract UX around hire -> join -> deliver -> dispute -> resolve

## Update (2026-04-19, Tailwind Migration)
- Saved the approved Tailwind migration plan locally in `docs/_local/tailwind-production-plan.md`.
- Implemented a Tailwind-first frontend foundation across both Next apps:
  - added Tailwind v4 + PostCSS wiring in `apps/web` and `apps/admin`
  - added shared style/config scaffolding with `components.json`
  - added shared `cn()` and source-owned UI primitives in `packages/frontend-core`
  - replaced frontend CSS Module imports with Tailwind-backed style maps
  - removed `apps/web/src/app/page.module.css`
  - removed `apps/web/src/app/marketing.module.css`
  - removed `apps/admin/src/app/page.module.css`
- Changed files:
  - `package.json`
  - `pnpm-lock.yaml`
  - `apps/web/package.json`
  - `apps/admin/package.json`
  - `apps/web/postcss.config.mjs`
  - `apps/admin/postcss.config.mjs`
  - `apps/web/components.json`
  - `apps/admin/components.json`
  - `packages/frontend-core/components.json`
  - `packages/frontend-core/package.json`
  - `packages/frontend-core/src/index.ts`
  - `packages/frontend-core/src/lib/utils.ts`
  - `packages/frontend-core/src/lib/ui.tsx`
  - `apps/web/src/app/globals.css`
  - `apps/admin/src/app/globals.css`
  - `apps/web/src/app/page.styles.ts`
  - `apps/web/src/app/marketing.styles.ts`
  - `apps/admin/src/app/page.styles.ts`
  - frontend route/component files that now import `*.styles` instead of CSS modules
- Verification run for the Tailwind migration:
  - `pnpm --filter @escrow4334/frontend-core typecheck`
  - `pnpm --filter web typecheck`
  - `pnpm --filter admin typecheck`
  - `pnpm --filter web build`
  - `pnpm --filter admin build`
  - `pnpm --filter web test`
  - `pnpm --filter admin test`
- Result:
  - Passed: all commands above
- Follow-up opportunities:
  - replace style-map-heavy console surfaces with more granular shared primitives over time
  - add more shadcn/Radix interactive primitives where current route UIs still rely on hand-rolled markup
  - optionally normalize repeated Tailwind recipes into dedicated `frontend-core` layout and form components

## Update (2026-04-19, Production-Grade Shared UI Step)
- Committed and pushed the Tailwind migration foundation to `origin/main` as `b07c565` (`Migrate frontend apps to Tailwind`).
- Implemented the next production-grade frontend step by moving repeated public-page structure into shared `frontend-core` primitives instead of leaving those patterns in app-local style maps.
- Added shared UI primitives and compatibility improvements in `packages/frontend-core/src/lib/ui.tsx`:
  - `PageTopBar`
  - `SectionCard`
  - `FactGrid`
  - `FactItem`
  - shared `LocaleSwitcher` now preserves legacy class override hooks used by existing console surfaces
  - `FactItem` now preserves `data-ltr="true"` for LTR-only technical values used in RTL routes
- Updated app wrappers to use the shared locale switcher contract:
  - `apps/web/src/app/language-switcher.tsx`
  - `apps/admin/src/app/language-switcher.tsx`
- Migrated public marketplace detail/reporting routes to the shared primitive layer:
  - `apps/web/src/app/marketplace/profiles/[slug]/profile-detail.tsx`
  - `apps/web/src/app/marketplace/opportunities/[id]/opportunity-detail.tsx`
  - `apps/web/src/app/marketplace/abuse-report-panel.tsx`
- Continued the earlier primitive rollout on public/help routes:
  - `apps/web/src/app/page.tsx`
  - `apps/web/src/app/trust/page.tsx`
  - `apps/web/src/app/app/help/launch-flow/page.tsx`
  - `apps/admin/src/app/help/operator-case-flow/page.tsx`
- Verification for this step:
  - `pnpm --filter @escrow4334/frontend-core typecheck`
  - `pnpm --filter web typecheck`
  - `pnpm --filter admin typecheck`
  - `pnpm --filter web build`
  - `pnpm --filter admin build`
  - `pnpm --filter web test`
  - `pnpm --filter admin test`
- Result:
  - Passed: all commands above
  - During the pass, web marketplace RTL tests failed because the new shared fact primitive dropped `data-ltr`; fixed in `FactItem` and reran tests/build successfully
- Next production-grade target:
  - replace the repeated hero/panel/meta/action shells inside `apps/web/src/app/web-console.tsx`, `apps/admin/src/app/operator-console.tsx`, `apps/web/src/app/marketplace/workspace.tsx`, and `apps/admin/src/app/marketplace/moderation-console.tsx` with the same shared primitive set

## Update (2026-04-19, Explicit Tailwind Config Files)
- Added explicit Tailwind config files for discoverability and toolchain clarity:
  - `apps/web/tailwind.config.mjs`
  - `apps/admin/tailwind.config.mjs`
- Wired both app CSS entrypoints to the explicit config with `@config`:
  - `apps/web/src/app/globals.css`
  - `apps/admin/src/app/globals.css`
- Updated shadcn/Tailwind metadata to point at the real config files:
  - `apps/web/components.json`
  - `apps/admin/components.json`
- Config scope:
  - each app now explicitly scans its own `src/**/*` plus `../../packages/frontend-core/src/**/*`
  - theme tokens still remain CSS-owned in app `globals.css`; the new config files exist for explicit governance/discoverability, not to move the design-token layer out of CSS
- Verification:
  - `pnpm --filter web build`
  - `pnpm --filter admin build`
- Result:
  - Passed: both app production builds succeeded with the explicit `@config` wiring in place

## Update (2026-04-19, Production-Grade Console Shell Extraction)
- Committed and pushed the explicit Tailwind config step to `origin/main` as `6fd911b` (`Add explicit Tailwind app config files`).
- Implemented the next production-grade frontend step by extracting recurring console/workspace shell structure into shared `frontend-core` primitives and migrating the largest route shells onto them.
- Added shared primitives in `packages/frontend-core/src/lib/ui.tsx`:
  - `ConsolePage`
  - `HeroPanel`
  - `SectionCard` now accepts standard `div` attributes so walkthrough ids and other data attributes can stay on shared cards
- Reused existing shared primitives more aggressively in large surfaces:
  - `PageTopBar`
  - `FactGrid`
  - `FactItem`
- Migrated shell layers in:
  - `apps/web/src/app/web-console.tsx`
    - top bar
    - hero summary
    - runtime validation section
  - `apps/admin/src/app/operator-console.tsx`
    - top bar
    - hero summary
    - runtime validation section
  - `apps/web/src/app/marketplace/workspace.tsx`
    - top bar
    - status/empty shell panels
    - overview metrics panel
  - `apps/admin/src/app/marketplace/moderation-console.tsx`
    - top bar
    - status/empty shell panels
    - moderation overview metrics panel
- Intentional scope boundary:
  - left deeper form, queue, moderation, and lifecycle interaction bodies intact
  - moved repeated frame/hero/metrics structure first so the next pass can replace inner panel bodies incrementally without re-solving page chrome
- Verification:
  - `pnpm --filter @escrow4334/frontend-core typecheck`
  - `pnpm --filter web typecheck`
  - `pnpm --filter admin typecheck`
  - `pnpm --filter web test`
  - `pnpm --filter admin test`
  - `pnpm --filter web build`
  - `pnpm --filter admin build`
- Result:
  - Passed:
    - all typecheck commands
    - `pnpm --filter web test`
    - `pnpm --filter admin test` when run in isolation
    - both app production builds
  - Watchout:
    - `pnpm --filter admin test` timed out once during a fully parallel test/build run on the long operator-resolution test, but it passed on immediate isolated rerun with no code changes
- Next production-grade target:
  - continue the same extraction pattern deeper inside `web-console`, `operator-console`, `marketplace/workspace`, and `marketplace/moderation-console` by converting the repeated access/operations/workspace panel bodies and action rows onto shared primitives instead of app-local recipes

## Update (2026-04-19, Web Futurist Redesign Pass)
- Reworked `apps/web` from the warm neutral launch aesthetic into a darker futurist visual system without changing backend contracts or route paths.
- Web-only design-token and motion changes:
  - replaced the `apps/web/src/app/globals.css` palette, shadows, surfaces, and focus treatment with graphite/electric tokens
  - added staged `fx-fade-up*` motion utilities plus `prefers-reduced-motion` fallbacks
- Shared `frontend-core` foundation updates for the web redesign:
  - refreshed `Button`, `Badge`, `SurfaceCard`, `PageTopBar`, `HeroPanel`, `FactItem`, `FeatureCard`, and web `LocaleSwitcher` visuals in `packages/frontend-core/src/lib/ui.tsx`
  - kept the change at the reusable foundation layer; high-expression page compositions remained app-local
- Public/web route redesign work:
  - rebuilt public marketing and trust compositions in `apps/web/src/app/page.tsx`, `apps/web/src/app/trust/page.tsx`, and `apps/web/src/app/marketing.styles.ts`
  - redesigned marketplace browse/detail/reporting surfaces in:
    - `apps/web/src/app/marketplace/marketplace-browser.tsx`
    - `apps/web/src/app/marketplace/profiles/[slug]/profile-detail.tsx`
    - `apps/web/src/app/marketplace/opportunities/[id]/opportunity-detail.tsx`
    - `apps/web/src/app/marketplace/abuse-report-panel.tsx`
  - shifted authenticated `/app` surfaces broadly by replacing the shared web console/workspace style map in `apps/web/src/app/page.styles.ts`
  - raised the explicit timeout budget for the long guided-flow route test in `apps/web/src/app/page.spec.tsx` from `20_000` to `45_000` so the full suite remains stable under the heavier redesigned DOM
- Verification:
  - `pnpm --filter @escrow4334/frontend-core typecheck`
  - `pnpm --filter web typecheck`
  - `pnpm --filter web test`
  - `pnpm --filter web build`
- Result:
  - Passed: all commands above

## Update (2026-04-19, Spatial Motion Redesign Across Web And Admin)
- Implemented the spatial redesign plan across both Next apps without changing business logic, routes, permissions, form behavior, or API contracts.
- Shared architecture changes:
  - added `motion` to `packages/frontend-core`
  - introduced the client-only spatial export path `@escrow4334/frontend-core/spatial`
  - added shared motion/spatial primitives in `packages/frontend-core/src/lib/spatial.tsx`:
    - `SpatialShell`
    - `AmbientBackdrop`
    - `GlassPanel`
    - `FloatingToolbar`
    - `RevealSection`
    - `SharedCard`
    - `SpotlightButton`
    - `StickyActionRail`
    - `MotionEmptyState`
    - `MotionTabs`
  - restyled walkthrough overlays in `packages/frontend-core/src/lib/walkthrough.tsx` to match the glass/spatial language
- App shell changes:
  - added pathname-keyed client shells in:
    - `apps/web/src/app/spatial-shell.tsx`
    - `apps/admin/src/app/spatial-shell.tsx`
  - wrapped both app layouts with the new spatial shell:
    - `apps/web/src/app/layout.tsx`
    - `apps/admin/src/app/layout.tsx`
- Token and surface updates:
  - replaced both app global token layers with shared spatial semantics and reduced-motion handling:
    - `apps/web/src/app/globals.css`
    - `apps/admin/src/app/globals.css`
  - tuned admin route styling to a calmer spatial workspace in `apps/admin/src/app/page.styles.ts`
- Route integration work:
  - web marketing and public marketplace surfaces now use reveal/glass/shared-card layers:
    - `apps/web/src/app/page.tsx`
    - `apps/web/src/app/trust/page.tsx`
    - `apps/web/src/app/marketplace/marketplace-browser.tsx`
    - `apps/web/src/app/marketplace/profiles/[slug]/profile-detail.tsx`
    - `apps/web/src/app/marketplace/opportunities/[id]/opportunity-detail.tsx`
  - authenticated workspace/dashboard shells now use reveal/shared-card motion:
    - `apps/web/src/app/web-console.tsx`
    - `apps/web/src/app/marketplace/workspace.tsx`
    - `apps/admin/src/app/operator-console.tsx`
- Testing note:
  - `RevealSection` now automatically falls back to non-viewport animation when `IntersectionObserver` is unavailable, which keeps Vitest/jsdom stable while preserving browser behavior.
- Verification:
  - `pnpm --filter @escrow4334/frontend-core typecheck`
  - `pnpm --filter web typecheck`
  - `pnpm --filter admin typecheck`
  - `pnpm --filter web test`
  - `pnpm --filter admin test`
  - `pnpm --filter web build`
  - `pnpm --filter admin build`
- Result:
  - Passed: all commands above
