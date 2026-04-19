# Current Session

## Date
- 2026-04-19

## Current Objective
- Implement the next production-grade Phase 0 slice inside Workstream 0.7: keep tightening canonical evidence artifacts so launch/release consumers read one normalized posture instead of re-deriving nested state.

## Last Completed Step
- Added a canonical launch-evidence posture artifact and wired it into the release dossier:
  - `launch-candidate` now writes `launch-evidence-posture.json`
  - `launch-evidence-posture.json` is now part of the required launch artifact contract
  - `release-dossier` now copies and validates that posture artifact against `promotion-record.json` and `evidence-manifest.json`
  - pending commit for this slice

## Current Step
- Commit and push the canonical launch-evidence posture slice, then continue Workstream 0.7 by reconciling workflow consumers and review docs around that normalized artifact.

## Why This Step Exists
- Phase 0 already proves chain authority, execution traces, and marketplace-origin flow shape, but release consumers were still reading those fields from different nested artifacts. This step creates one normalized launch posture document and ensures the release dossier validates it instead of trusting duplicated derivations.

## Changed Files
- Canonical launch posture artifact:
  `scripts/launch-candidate-lib.mjs`
  `scripts/launch-candidate.mjs`
  `scripts/launch-candidate-lib.test.mjs`
  `scripts/release-dossier-lib.mjs`
  `scripts/release-dossier.mjs`
  `scripts/release-dossier-lib.test.mjs`
- Docs:
  `docs/project-state.md`
  `docs/_local/current-session.md`

## Key Constraints
- Treat the current repo as an escrow-first marketplace foundation, not a blank-slate rewrite target.
- Preserve the strongest current slices: `WorkstreamEscrow`, OTP + SIWE + smart-account onboarding, persisted workflow orchestration, hire-to-escrow bridging, and operator trust/safety tooling.
- Keep the near-term product narrow: fixed-price, milestone-first, Base/USDC-first, one client organization to one freelancer or agency seat.
- Keep historical plan docs concise and clearly marked rather than deleting context that still explains completed work.
- Keep the implementation docs repo-specific: they should describe modules, workflows, data shape direction, verification, and UI posture in terms of the current monorepo instead of generic marketplace advice.

## Verification Commands
- `git diff --check`
- `node --test scripts/launch-candidate-lib.test.mjs scripts/promotion-review-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/release-pointer-lib.test.mjs`
- `pnpm build`

## Verification Status
- Passed:
  - `git diff --check`
  - `node --test scripts/launch-candidate-lib.test.mjs scripts/promotion-review-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/release-pointer-lib.test.mjs`
  - `pnpm build`
- Blocked or not run:
  - real staged deployment validation against live staging secrets and URLs
  - real staged deployed marketplace canaries with the new marketplace-origin artifact contract
  - real promotion/release workflows consuming the new canonical `launch-evidence-posture.json` artifact in GitHub Actions

## Next Likely Step
- After committing this slice, continue Workstream 0.7 by teaching promotion/release workflow consumers or runbooks to reference `launch-evidence-posture.json` directly so rollout, rollback, and audit drills all point at the same canonical posture artifact.

## Update (2026-04-19, Marketplace-Origin Launch Proof)
- Added `tests/e2e/fixtures/marketplace-evidence.ts` so deployed marketplace canaries can convert exported `job-history` and `dispute-case` JSON into explicit marketplace-origin evidence artifacts.
- Seeded and exact deployed marketplace canaries now both persist marketplace-origin proof with:
  - expected opportunity id and job id
  - contract path
  - marketplace terms (`opportunityId`, `applicationId`, visibility, fit score, risk flags)
  - chain-projection authority posture
  - execution-trace coverage posture
  - hiring-spec and proposal completeness summary
  - dispute or resolution outcome summary
- `scripts/launch-candidate.mjs` and `scripts/launch-candidate-lib.mjs` now require:
  - `marketplace-seeded-evidence.json`
  - `marketplace-exact-evidence.json`
  - `marketplace-origin-summary.json`
- Launch blockers now fail when:
  - either marketplace lane did not produce evidence
  - either lane failed marketplace-origin confirmation
  - the marketplace-origin summary is missing or incomplete
- Promotion review and release dossier validation now consume the marketplace-origin summary instead of treating marketplace proof as implicit in raw Playwright pass/fail counts.
- Verification:
  - `git diff --check`
  - `node --test scripts/launch-candidate-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/promotion-review-lib.test.mjs`
  - `pnpm build`
- Result:
  - Passed
  - local deployed-profile Playwright list still requires explicit staged base URLs

## Update (2026-04-19, Release Pointer Evidence Contract)
- Extended `scripts/release-pointer-lib.mjs` so `buildReleasePointer(...)` now snapshots launch evidence posture directly from the release dossier:
  - `launchRequiredArtifactCount`
  - `launchMissingArtifactCount`
  - `launchEvidenceComplete`
  - `launchProviderFailureCount`
  - `launchProviderWarningCount`
  - execution-trace coverage counts
  - marketplace-origin proof status plus confirmed/missing/failed modes
- Tightened `validateReleasePointer(...)` so `--require-ready-launch-posture` now also blocks when:
  - launch evidence is incomplete
  - missing launch artifacts are reported
  - marketplace-origin proof is not confirmed
  - both `seeded` and `exact` marketplace modes are not confirmed
  - marketplace-origin missing/failed modes are present
- Extended `scripts/release-pointer.mjs` so `release-pointer.md` and `--write-env` expose the richer launch posture to operators and workflow consumers.
- Verification:
  - `git diff --check`
  - `node --test scripts/launch-candidate-lib.test.mjs scripts/promotion-review-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/release-pointer-lib.test.mjs`
  - `pnpm build`
- Result:
  - Passed

## Update (2026-04-19, Canonical Launch Evidence Posture)
- Added `buildLaunchEvidencePosture(...)` to `scripts/launch-candidate-lib.mjs` and made `launch-candidate` publish:
  - `launch-evidence-posture.json`
- The posture artifact now normalizes:
  - promotion-readiness status, blockers, and warnings
  - authority/trace posture
  - provider failure/warning counts
  - evidence completeness and missing artifact counts
  - marketplace-origin proof posture
  - canary failure counts
  - rollback posture
  - daemon/alert-drill posture
- `launch-evidence-posture.json` is now a required launch artifact and `release-dossier` now:
  - copies it into the canonical evidence packet
  - validates it against `promotion-record.json` and `evidence-manifest.json`
  - carries it forward under `release-dossier.json.launchEvidence.posture`
- Verification:
  - `git diff --check`
  - `node --test scripts/launch-candidate-lib.test.mjs scripts/promotion-review-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/release-pointer-lib.test.mjs`
  - `pnpm build`
- Result:
  - Passed

## Update (2026-04-19, Execution Trace Evidence Contract)
- Added `services/api/src/modules/escrow/escrow-execution-traces.ts` as the canonical trace summarizer for persisted escrow executions.
- `job-history` and `dispute-case` export JSON summaries now include `summary.executionTraces` with:
  - execution count and trace count
  - request/correlation/idempotency/operation coverage
  - confirmed-without-correlation count
  - grouped trace entries with actions, request ids, operation keys, milestone indices, and tx hashes
- Failed-execution diagnostics now expose trace coverage and grouped trace clusters so retries can be understood without reconstructing them from raw execution arrays.
- Deployed authority evidence now proves trace completeness in addition to chain projection:
  - validates trace summary presence
  - validates request/correlation/operation coverage
  - validates staged tx hashes appear in the exported job-history document
- Launch candidate, promotion review, and release dossier artifacts now carry execution-trace coverage so promotion proof includes both chain authority and execution traceability.
- Admin operator UI now surfaces trace coverage and grouped trace hints for failed execution clusters.
- Verification:
  - `git diff --check`
  - `pnpm --filter escrow4334-api test -- --runTestsByPath test/escrow-export.spec.ts test/escrow-health.service.spec.ts`
  - `node --test scripts/launch-candidate-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/promotion-review-lib.test.mjs`
  - `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit`
  - `pnpm --filter admin test src/app/page.spec.tsx`
  - `pnpm --filter admin typecheck`
  - `pnpm build`
- Result:
  - Passed

## Update (2026-04-19, Privileged Capability Baseline)
- Added `UserCapabilitiesService` under `services/api/src/modules/users` and extended auth/user profiles with explicit capabilities for:
  - `escrowResolution`
  - `escrowOperations`
  - `chainAuditSync`
  - `jobHistoryImport`
  - `marketplaceModeration`
- Current capability grant model is intentionally minimal and explicit:
  - granted when the authenticated session controls the configured arbitrator wallet
  - denied otherwise with a server-provided reason and required wallet address
- Replaced duplicated privileged wallet checks in marketplace moderation, escrow operations health, chain-audit sync, job-history import preview, and dispute resolution with the shared capability service.
- Updated admin consoles so blocked states now use server-authoritative capability posture instead of deriving access only from locally linked wallets.
- Updated admin/web `UserProfile` types and fixtures to carry capabilities.
- Verification:
  - `git diff --check`
  - `pnpm --filter escrow4334-api test -- --runTestsByPath test/auth.integration.spec.ts test/marketplace.service.spec.ts test/escrow-health.service.spec.ts`
  - `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit`
  - `pnpm --filter admin test src/app/page.spec.tsx src/app/marketplace/marketplace-moderation.spec.tsx`
  - `pnpm --filter admin typecheck`
  - `pnpm --filter web typecheck`
  - `pnpm build`
- Result:
  - Passed

## Update (2026-04-19, Provider Validation Evidence Contract)
- Extended the launch-candidate artifact contract so provider posture is preserved as a first-class artifact:
  - `provider-validation-summary.json`
- The launch-candidate summary and promotion record now surface provider-specific status for:
  - email relay
  - smart-account relay
  - bundler
  - paymaster
  - escrow relay
- Provider failure and warning modes are now classified into reviewable categories such as:
  - `missing_config`
  - `credentials_rejected`
  - `validation_route_missing`
  - `invalid_chain_target`
  - `provider_unhealthy`
  - `unreachable`
  - `degraded_readability`
  - `unsafe_validation_route`
- Launch blockers now include provider-specific messages in addition to the generic deployment-validation blocker.
- The release dossier now copies `provider-validation-summary.json`, and the incident playbook now treats it as part of the relay/chain-assumption evidence contract.
- Verification:
  - `git diff --check`
  - `node --test scripts/launch-candidate-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/promotion-review-lib.test.mjs`
  - `pnpm --filter escrow4334-api test -- --runTestsByPath test/deployment-validation.service.spec.ts test/launch-readiness.service.spec.ts test/runtime-profile.service.spec.ts`
  - `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit`
- Result:
  - Passed

## Update (2026-04-19, Authenticated Provider Validation)
- Tightened `services/api/src/modules/operations/deployment-validation.service.ts` so relay-backed provider checks now run in two layers:
  - reachability or health probes
  - authenticated protected-route probes for email relay, smart-account relay, and escrow relay
- Added explicit checks:
  - `email-relay-auth`
  - `smart-account-relay-auth`
  - `escrow-relay-auth`
- Default authenticated validation routes now assume:
  - email relay: `${AUTH_EMAIL_RELAY_BASE_URL}/email/send`
  - smart-account relay: `${WALLET_SMART_ACCOUNT_RELAY_BASE_URL}/wallets/smart-accounts/provision`
  - escrow relay: `${ESCROW_RELAY_BASE_URL}/escrow/execute`
- Added dedicated override env vars for providers whose protected route contracts differ:
  - `AUTH_EMAIL_RELAY_VALIDATION_URL`
  - `WALLET_SMART_ACCOUNT_RELAY_VALIDATION_URL`
  - `ESCROW_RELAY_VALIDATION_URL`
- Validation semantics:
  - `401` or `403`: fail because credentials were rejected
  - `404`: fail because the expected protected route is missing or misrouted
  - `5xx`: fail because the provider route is unhealthy
  - other `4xx`: pass because the route exists, auth worked, and the intentionally invalid probe payload was rejected
  - `2xx`: warn because the route accepted the probe payload and should be checked for side effects
- Updated operator docs and env examples so the new provider-validation contract is discoverable without reading source.
- Verification:
  - `git diff --check`
  - `pnpm --filter escrow4334-api test -- --runTestsByPath test/deployment-validation.service.spec.ts test/launch-readiness.service.spec.ts test/runtime-profile.service.spec.ts`
  - `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit`
- Result:
  - Passed

## Update (2026-04-19, Strict Staging Validation Contract)
- Added `services/api/src/modules/operations/deployment-target.ts` so deployment/readiness logic can recognize explicit `staging`/`production` targets separately from generic local/prod `NODE_ENV` behavior.
- Tightened `deployment:validate` so explicit deployment targets now enforce:
  - strict provider posture for staging as well as production
  - required deployed browser targets (`PLAYWRIGHT_DEPLOYED_WEB_BASE_URL`, `PLAYWRIGHT_DEPLOYED_ADMIN_BASE_URL`, `PLAYWRIGHT_DEPLOYED_API_BASE_URL`)
  - HTTPS/localhost restrictions for deployed browser targets unless explicitly overridden
  - `NEST_API_CORS_ORIGINS` coverage for deployed web/admin origins
  - relay reachability probes that forward configured relay API keys
- Tightened launch-readiness to block when the staged browser-target contract is incomplete or when backend CORS does not cover the staged web/admin origins.
- Wired `DEPLOYMENT_TARGET_ENVIRONMENT` into `Deployed Smoke` and `Launch Candidate` workflows so strict staging/production validation actually runs in CI.
- Updated staging/deployment docs and durable memory to treat deployed browser target URLs plus CORS alignment as part of the enforced staging contract.
- Verification:
  - `git diff --check`
  - `pnpm --filter escrow4334-api test -- --runTestsByPath test/deployment-validation.service.spec.ts test/launch-readiness.service.spec.ts test/runtime-profile.service.spec.ts`
  - `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit`
- Result:
  - Passed
  - live staging execution still pending

## Update (2026-04-19, README Program Framing Pass)
- Refined `readme.md` again after the roadmap/Phase 0 work so the front page now emphasizes:
  - status at a glance
  - narrow launch scope
  - the active execution stack
  - who the repo is for right now
- Intent:
  - make the repo understandable in under two minutes for product, engineering, or operator readers
  - keep the README aligned with the actual marketplace program instead of the older escrow-foundation framing
- Verification:
  - `git diff --check`

## Update (2026-04-19, Phase 0 Backlog And README Direction)
- Added `docs/MARKETPLACE_PHASE_0_BACKLOG_V1.md` to break Phase 0 into concrete workstreams and ticket-sized tasks.
- Linked the Phase 0 backlog from the implementation index and the Phase 0 phase doc.
- Rewrote `readme.md` around the active escrow-first marketplace direction and added roadmap/phase/network badges plus links to the active docs set.
- Updated durable memory in `docs/project-state.md` to record the new immediate backlog.
- Verification:
  - `git diff --check`
- Result:
  - Passed
  - no code or product tests run; this task only changed planning/docs

## Update (2026-04-19, Marketplace Implementation Set)
- Added a repo-native implementation index:
  - `docs/MARKETPLACE_IMPLEMENTATION_V1.md`
- Added a shared marketplace design guide:
  - `docs/MARKETPLACE_DESIGN_GUIDE_V1.md`
- Added one detailed implementation doc per phase:
  - `docs/MARKETPLACE_PHASE_0_V1.md`
  - `docs/MARKETPLACE_PHASE_1_V1.md`
  - `docs/MARKETPLACE_PHASE_2_V1.md`
  - `docs/MARKETPLACE_PHASE_3_V1.md`
  - `docs/MARKETPLACE_PHASE_4_V1.md`
  - `docs/MARKETPLACE_PHASE_5_V1.md`
  - `docs/MARKETPLACE_PHASE_6_V1.md`
  - `docs/MARKETPLACE_PHASE_7_V1.md`
  - `docs/MARKETPLACE_PHASE_8_V1.md`
- Updated roadmap and durable memory to point at the phased implementation set.
- Verification:
  - `git diff --check`
- Result:
  - Passed
  - no code or product tests run; this task only changed planning docs

## Update (2026-04-19, Marketplace Plan V1)
- Saved the new active repo roadmap as `docs/MARKETPLACE_PLAN_V1.md` with version `v1`.
- Marked prior active plan threads closed or superseded based on current state:
  - `docs/FRONTEND_PLAN.md` is now historical frontend detail
  - `docs/_local/tailwind-production-plan.md` is now historical and complete
  - the previous promotion-artifact/provenance thread is now treated as completed repo work with remaining staged proof folded into Phase 0 production hardening
- Updated durable repo memory in `docs/project-state.md` so the active roadmap now points at Marketplace Plan V1.
- Verification:
  - `git diff --check`
- Result:
  - Passed
  - no code or product tests run; this task only changed planning docs

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
## Update (2026-04-19, Phase 0 Chain Event Mirror Baseline)
- Implemented the next production-grade Phase 0 step from `MARKETPLACE_PHASE_0_BACKLOG_V1.md`: Workstream `0.3` chain event mirror and reconciliation baseline.
- Backend changes:
  - extended `EscrowChainEventRecord` with mirror provenance fields: `source`, `ingestionKind`, `ingestedAt`, `correlationId`, `mirrorStatus`, and `persistedVia`
  - added Postgres migration `015_escrow_chain_event_mirror_metadata.sql` and file-store normalization defaults so legacy mirrored rows are still readable
  - updated manual sync, persisted replay, and finalized-ingestion flows in `EscrowChainSyncService` so mirrored events carry explicit provenance and chain-sync reports emit `mirror` and `replay` summaries
- Operator/admin changes:
  - extended the admin API contract and operator console to render mirror event count, replay source, correlation id, latest mirrored event provenance, drift source, retry posture, and failure cause
  - hardened the operator console to tolerate older sync reports that do not yet include the new `mirror` or `replay` payloads
- Added explicit coverage in `services/api/test/escrow-chain-sync.service.spec.ts` for:
  - preview manual-sync mirror metadata
  - persisted manual-sync mirror metadata
  - blocked unsupported replay posture
  - finalized-ingestion mirror persistence and cursor advancement
- Verification:
  - `pnpm --filter escrow4334-api test -- --runTestsByPath test/escrow-chain-sync.service.spec.ts test/escrow-health.service.spec.ts`
  - `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit`
  - `pnpm --filter admin test src/app/page.spec.tsx src/app/marketplace/marketplace-moderation.spec.tsx`
  - `pnpm --filter admin typecheck`
  - `git diff --check`
- Next production-grade target:
  - continue Phase 0 by hardening reconciliation and execution correlation around the mirrored chain stream, especially explicit event correlation IDs across API, queue, and execution attempts
## Update (2026-04-19, Phase 0 Execution Correlation And Idempotency Baseline)
- Implemented the next production-grade Phase 0 step from `MARKETPLACE_PHASE_0_BACKLOG_V1.md`: Workstream `0.4` execution correlation and idempotency.
- HTTP/execution context changes:
  - added request-context normalization under `services/api/src/common/http/request-context.ts`
  - API now attaches `x-request-id` on inbound HTTP requests and preserves any valid incoming request/idempotency key headers
  - escrow controllers now pass request execution context into onchain mutation paths without changing direct controller-test call sites
- Escrow mutation changes:
  - escrow execution records now persist `requestId`, `correlationId`, `idempotencyKey`, and `operationKey`
  - relay-backed escrow execution now forwards:
    - `x-request-id`
    - `x-correlation-id`
    - `x-escrow-operation-key`
    - `idempotency-key`
  - job-scoped onchain mutations now replay confirmed or failed attempts when the same idempotency key is retried for the same operation payload instead of creating ambiguous duplicate history
  - confirmed `create_job` requests now also replay safely on the same idempotency key after persistence
- Persistence changes:
  - added Postgres migration `016_escrow_execution_trace_metadata.sql`
  - added file-store normalization/version bump for legacy execution rows without trace fields
  - added repository lookup by execution idempotency key so retries can be resolved from persisted state
- Operator/evidence changes:
  - failed execution summaries now surface request/correlation/idempotency/operation metadata
  - operator console failure cards now show correlation/idempotency identifiers
  - job-history exports now include execution trace metadata in execution timeline detail payloads
- Verification:
  - `pnpm --filter escrow4334-api test -- --runTestsByPath test/escrow.service.spec.ts test/escrow-health.service.spec.ts test/escrow-export.spec.ts`
  - `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit`
  - `pnpm --filter admin test src/app/page.spec.tsx src/app/marketplace/marketplace-moderation.spec.tsx`
  - `pnpm --filter admin typecheck`
  - `pnpm --filter web typecheck`
  - `git diff --check`
  - `pnpm build`
- Next production-grade target:
  - continue Phase 0 by pushing the same correlation thread into reconciliation/launch evidence so failed execution diagnostics, exports, and release artifacts can be joined on one operator-visible trace without reading raw logs
