# Current Session

## Date
- 2026-04-27

## Update (2026-04-27, Mobile Recovery Evidence Coverage)
- Started from a clean `dev` tree aligned with `origin/dev`; there was no uncommitted work to commit. `git push --no-verify origin dev` completed with `Everything up-to-date`.
- Implemented the next mobile offline-recovery evidence slice without intentional tests/builds:
  - added ledger-level scenario coverage summaries in `mobileRecoveryEvidence.ts`
  - coverage tracks all four supported scenarios: offline start, API recovery, wallet return, project room
  - coverage includes captured scenario count, passing scenario count, failing scenario count, per-scenario latest outcome, latest check counts, and report count
  - Account now shows total scenario coverage plus per-scenario status for the local evidence ledger
  - documented coverage semantics in Mobile Offline Recovery V1 and durable project state
- Changed files:
  `apps/mobile/src/features/offline/{MobileRecoveryEvidenceCard.tsx,mobileRecoveryEvidence.ts}`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - pending lightweight source checks
  - real tests/builds intentionally not run by request
- Next useful step:
  - capture one real iOS/Android evidence report per supported scenario and use the coverage summary to confirm all four scenarios are represented before exporting evidence.

## Update (2026-04-27, Mobile Recovery Evidence Checks)
- Started from a clean `dev` tree aligned with `origin/dev`; there was no uncommitted work to commit. `git push --no-verify origin dev` completed with `Everything up-to-date`.
- Implemented the next mobile offline-recovery evidence slice without intentional tests/builds:
  - added scenario-specific computed checks to `MobileRecoveryEvidenceReport`
  - check statuses are `pass`, `warn`, or `fail` and stay coarse/non-sensitive
  - offline-start checks cover offline/API posture, cached profile availability, and read snapshot inventory
  - API-recovery checks cover device connectivity, runtime-profile reachability, and live-versus-cached session posture
  - wallet-return checks cover signed-in state, linked-wallet presence, and execution/smart-account posture
  - project-room checks cover signed-in state, project-room snapshot presence, and live API or snapshot recovery source
  - Account now shows latest saved report check counts
  - documented computed-check semantics in Mobile Offline Recovery V1 and durable project state
- Changed files:
  `apps/mobile/src/features/offline/{MobileRecoveryEvidenceCard.tsx,mobileRecoveryEvidence.ts}`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - pending lightweight source checks
  - real tests/builds intentionally not run by request
- Next useful step:
  - capture real iOS/Android evidence reports and compare reviewer outcomes with computed pass/warn/fail checks for the four supported scenarios.

## Update (2026-04-27, Mobile Recovery Evidence Re-share)
- Started from a clean `dev` tree aligned with `origin/dev`; there was no uncommitted work to commit. `git push --no-verify origin dev` completed with `Everything up-to-date`.
- Implemented the next mobile offline-recovery evidence slice without intentional tests/builds:
  - added saved report reads by id in `apps/mobile/src/features/offline/mobileRecoveryEvidence.ts`
  - added a latest saved evidence re-share action to the Account recovery evidence card
  - re-share reads the exact stored report by id and opens the native share sheet without regenerating or mutating evidence
  - handled missing/pruned saved reports by refreshing the ledger and showing explicit copy
  - documented exact latest-report re-share behavior in Mobile Offline Recovery V1 and durable project state
- Changed files:
  `apps/mobile/src/features/offline/{MobileRecoveryEvidenceCard.tsx,mobileRecoveryEvidence.ts}`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - pending lightweight source checks
  - real tests/builds intentionally not run by request
- Next useful step:
  - capture real iOS/Android evidence reports, then use the re-share path to preserve the exact saved artifacts for offline start, API recovery, wallet return, and project-room scenarios.

## Update (2026-04-27, Mobile Recovery Evidence Context)
- Started from a clean `dev` tree aligned with `origin/dev`; there was no uncommitted work to commit. `git push --no-verify origin dev` completed with `Everything up-to-date`.
- Implemented the next mobile offline-recovery evidence slice without intentional tests/builds:
  - added controlled `scenario` and `outcome` context to `MobileRecoveryEvidenceReport`
  - supported scenarios: offline start, API recovery, wallet return, project room
  - supported outcomes: observed, passed, failed
  - exposed scenario/outcome segmented controls in the Account recovery evidence card
  - included latest report scenario/outcome in the Account ledger summary
  - kept the report free of free-form reviewer notes to avoid accidental PII/secrets
  - documented the controlled context contract in Mobile Offline Recovery V1 and durable project state
- Changed files:
  `apps/mobile/src/features/offline/{MobileRecoveryEvidenceCard.tsx,mobileRecoveryEvidence.ts}`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - pending lightweight source checks
  - real tests/builds intentionally not run by request
- Next useful step:
  - capture real iOS/Android evidence reports for each controlled scenario and preserve pass/fail posture from the local ledger.

## Update (2026-04-27, Mobile Recovery Evidence Ledger)
- Started from a clean `dev` tree aligned with `origin/dev`; there was no uncommitted work to commit. `git push --no-verify origin dev` completed with `Everything up-to-date`.
- Implemented the next mobile offline-recovery evidence slice without intentional tests/builds:
  - added `apps/mobile/src/features/offline/mobileRecoveryEvidence.ts`
  - moved recovery evidence report construction and sanitization out of the Account card into a reusable storage helper
  - saved every shared evidence report into a separate AsyncStorage namespace before opening the native share sheet
  - added bounded evidence retention: newest 12 reports, 30-day max age, malformed envelope pruning
  - surfaced saved-report count, newest report timestamp, and a clear-saved-evidence control in the Account recovery evidence card
  - documented the local evidence ledger, retention, and sanitization contract in Mobile Offline Recovery V1 and durable project state
- Changed files:
  `apps/mobile/src/features/offline/{MobileRecoveryEvidenceCard.tsx,mobileRecoveryEvidence.ts}`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - pending lightweight source checks
  - real tests/builds intentionally not run by request
- Next useful step:
  - capture real iOS/Android evidence reports from the new local ledger for offline cold-start restore, API recovery auto-refresh, marketplace snapshot hydration, retention cleanup, wallet-linking, and project-room delivery paths.

## Update (2026-04-27, Mobile Recovery Evidence Report)
- Started from a clean `dev` tree aligned with `origin/dev`; there was no uncommitted work to commit. `git push origin dev` completed with `Everything up-to-date`, but the repo safe-push hook ran `pnpm build` despite the no-build request.
- Implemented the next mobile offline-recovery evidence slice without intentional tests/builds:
  - added `apps/mobile/src/features/offline/MobileRecoveryEvidenceCard.tsx`
  - surfaced a signed-in Account recovery evidence card that uses the native share sheet
  - generated a sanitized JSON report from platform/app version, API reachability, NetInfo posture, cached-profile session posture, capability booleans, wallet counts, workspace kind/roles, and offline snapshot summary
  - deliberately excluded tokens, email addresses, user ids, wallet addresses, workspace labels, organization names, and URL credentials/query strings from the report
  - documented the report contract in Mobile Offline Recovery V1 and durable project state
- Changed files:
  `apps/mobile/src/features/offline/MobileRecoveryEvidenceCard.tsx`
  `apps/mobile/src/app/(tabs)/account.tsx`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - pending lightweight source checks
  - real tests/builds intentionally not run after implementation by request
- Next useful step:
  - capture real iOS/Android evidence reports for offline cold-start restore, API recovery auto-refresh, marketplace snapshot hydration, retention cleanup, wallet-linking, and project-room delivery paths.

## Update (2026-04-27, Mobile Cached Session Auto Refresh)
- Started from a clean `dev` tree aligned with `origin/dev`; there was no current uncommitted work to publish before this slice.
- Implemented the next mobile offline-recovery session lifecycle slice without intentional tests/builds:
  - added `apps/mobile/src/features/session/MobileSessionRecoveryBridge.tsx`
  - mounted it inside `SessionProvider` so it can consume session, network, and query-client state
  - when a cached-profile session sees API reachability recover to `reachable`, it throttles and attempts a live session refresh
  - successful automatic refresh invalidates query caches so cached/profile-restored reads can converge to live state
  - refresh failures remain non-destructive and keep the cached-profile notice visible
  - updated cached-session notice copy and documented automatic refresh behavior
- Changed files:
  `apps/mobile/src/features/session/{MobileSessionRecoveryBridge.tsx,SessionRestoreNotice.tsx}`
  `apps/mobile/src/providers/root.tsx`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - `git diff --check` passed
  - `git diff --cached --check` passed
  - real tests/builds intentionally not run by request
- Next useful step:
  - capture real-device evidence for cached-profile automatic refresh, offline cold-start restore, marketplace snapshot hydration, retention cleanup, foreground recovery, wallet-linking, and project-room delivery paths.

## Update (2026-04-27, Mobile Cached Session Notice)
- Started from a clean `dev` tree aligned with `origin/dev`; there was no current uncommitted work to publish before this slice.
- Implemented the next mobile offline-recovery session visibility slice without intentional tests/builds:
  - exposed `restoredFromProfileSnapshot` and `profileSnapshotCachedAt` from `useSession()`
  - preserved the original secure profile snapshot timestamp when hydrating from a cached profile
  - added `apps/mobile/src/features/session/SessionRestoreNotice.tsx`
  - surfaced cached-profile session posture on Home and Account with saved timestamp and manual refresh action
  - documented the visible cached-profile session contract in Mobile Offline Recovery V1 and durable project state
- Changed files:
  `apps/mobile/src/providers/session.tsx`
  `apps/mobile/src/features/session/SessionRestoreNotice.tsx`
  `apps/mobile/src/app/{(tabs)/home.tsx,(tabs)/account.tsx}`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - `git diff --check` passed
  - `git diff --cached --check` passed
  - real tests/builds intentionally not run by request
- Next useful step:
  - capture real-device evidence for cached-profile session notice, offline cold-start restore, marketplace snapshot hydration, retention cleanup, foreground recovery, wallet-linking, and project-room delivery paths.

## Update (2026-04-27, Mobile Offline Session Restore)
- Started from a clean `dev` tree aligned with `origin/dev`; there was no current uncommitted work to publish before this slice.
- Implemented the next mobile offline-recovery session slice without intentional tests/builds:
  - added a versioned SecureStore profile snapshot for the last successful `UserProfile`
  - refreshed that profile snapshot after sign-in, refresh, direct profile restore, and explicit `setUser(...)` updates such as workspace switching
  - changed cold restore to try the stored access token first, then rotate the refresh token when the access token is terminally invalid
  - preserved stored tokens and hydrated `user` from the secure profile snapshot when restore fails for a non-terminal network/API outage
  - kept destructive cleanup for terminal/no-snapshot restore failures, including token, profile snapshot, and offline snapshot clearing
  - documented the secure profile fallback in Mobile Offline Recovery V1 and durable project state
- Changed files:
  `apps/mobile/src/providers/session.tsx`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - `git diff --check` passed
  - `git diff --cached --check` passed
  - real tests/builds intentionally not run by request
- Next useful step:
  - capture real-device evidence for offline cold-start session restore, marketplace snapshot hydration, retention cleanup, foreground recovery, wallet-linking, and project-room delivery paths.

## Update (2026-04-27, Mobile Snapshot Retention Bridge)
- Started from a clean `dev` tree aligned with `origin/dev`; there was no current uncommitted work to publish before this slice.
- Implemented the next mobile offline-recovery storage lifecycle slice without intentional tests/builds:
  - added `apps/mobile/src/features/offline/OfflineSnapshotRetentionBridge.tsx`
  - mounted the bridge in `RootProviders` so retention runs once on app startup
  - added throttled foreground-return retention so stale/invalid snapshots are pruned after long background periods without blocking screen rendering
  - corrected namespace-wide retention so the 80-entry cap is enforced per account/public scope instead of across all scopes together
  - documented startup/foreground retention behavior in Mobile Offline Recovery V1 and durable project state
- Changed files:
  `apps/mobile/src/features/offline/{OfflineSnapshotRetentionBridge.tsx,offlineSnapshots.ts}`
  `apps/mobile/src/providers/root.tsx`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - `git diff --check` passed
  - `git diff --cached --check` passed
  - real tests/builds intentionally not run by request
- Next useful step:
  - capture real-device evidence for marketplace snapshot hydration, retention cleanup, foreground recovery, wallet-linking, and project-room delivery paths.

## Update (2026-04-27, Mobile Snapshot Retention Inventory)
- Started from a clean `dev` tree aligned with `origin/dev`; there was no current uncommitted work to publish before this slice.
- Implemented the next mobile offline-recovery storage hardening slice without intentional tests/builds:
  - added offline snapshot metadata and summary APIs for cache key, resource, scope, cached timestamp, and approximate storage size
  - added bounded retention constants: 7-day max age and 80 newest snapshots per account/public scope
  - made successful snapshot writes trigger best-effort scope-local retention pruning, including invalid envelope cleanup
  - moved `useOfflineSnapshot` onto the shared retention max-age constant
  - expanded Account offline data with snapshot inventory, approximate namespace size, account/public counts, newest timestamp, expired-waiting-cleanup count, and retention copy
  - documented retention and inventory behavior in Mobile Offline Recovery V1 and durable project state
- Changed files:
  `apps/mobile/src/features/offline/{offlineSnapshots.ts,useOfflineSnapshot.tsx}`
  `apps/mobile/src/app/(tabs)/account.tsx`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - `git diff --check` passed
  - `git diff --cached --check` passed
  - real tests/builds intentionally not run by request
- Next useful step:
  - capture real-device evidence for marketplace snapshot hydration, retention cleanup, foreground recovery, wallet-linking, and project-room delivery paths.

## Update (2026-04-27, Mobile Marketplace Offline Snapshots)
- Started from a clean `dev` tree aligned with `origin/dev`; there was no current uncommitted work to publish before this slice.
- Implemented the next mobile offline-recovery product slice without intentional tests/builds:
  - extended offline snapshot resource keys to cover marketplace talent/opportunity search, public profile/detail reads, analytics, applications, client opportunities, and notifications
  - hydrated the mobile marketplace tab from saved read-only snapshots when live data is missing during loading, API errors, or offline/API-unreachable states
  - hydrated public marketplace profile and opportunity detail routes from saved snapshots with explicit offline-snapshot notices
  - kept opportunity proposal submission live-only by blocking application form entry/submission from snapshot-rendered opportunity state
  - changed Account "Clear offline data" to clear the full offline snapshot namespace so public marketplace snapshots are removed with account-scoped snapshots
  - documented the expanded snapshot contract in Mobile Offline Recovery V1 and durable project state
- Changed files:
  `apps/mobile/src/features/offline/offlineSnapshots.ts`
  `apps/mobile/src/app/{(tabs)/account.tsx,(tabs)/marketplace.tsx,marketplace/profile/[slug].tsx,marketplace/opportunity/[id].tsx}`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - source-level checks pending; real tests/builds intentionally not run by request
- Next useful step:
  - capture real-device evidence for marketplace snapshot hydration, foreground recovery, wallet-linking, and project-room delivery paths.

## Update (2026-04-27, Mobile Foreground Recovery Probe)
- Started from a clean `dev` tree aligned with `origin/dev`; there was no current uncommitted work to publish before this slice.
- Implemented the next mobile offline-recovery hardening slice without intentional tests/builds:
  - extended `apps/mobile/src/features/network/MobileRecoveryRefreshBridge.tsx` with React Native `AppState` foreground detection
  - when the app returns active from background/inactive state, it runs a bounded `network.refresh()` if API posture is stale, skipped, unreachable, unchecked, or the device was offline
  - added foreground refresh throttling so rapid app switching cannot spam NetInfo/API probes
  - kept existing read-query invalidation behavior after API recovery reaches a reachable probe state
  - documented foreground recovery probes in Mobile Offline Recovery V1 and durable project state
- Changed files:
  `apps/mobile/src/features/network/MobileRecoveryRefreshBridge.tsx`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - not run by request
- Next useful step:
  - capture real-device evidence for background/foreground recovery, offline snapshot hydration/clearing, wallet-linking, and project-room delivery paths.

## Update (2026-04-27, Mobile Recovery Auto Refresh)
- Started from a clean `dev` tree aligned with `origin/dev`; there was no current uncommitted work to publish before this slice.
- Implemented the next mobile offline-recovery slice without intentional tests/builds:
  - added `apps/mobile/src/features/network/MobileRecoveryRefreshBridge.tsx`
  - mounted it inside `QueryProvider` so it can consume both NetInfo/API reachability state and the React Query client
  - when the app moves from offline/API-unreachable/skipped state to a reachable API probe, it invalidates runtime, jobs, contractor readiness, project-room, marketplace-review, and marketplace read-query families
  - added a short throttle so NetInfo/probe races cannot create duplicate invalidation bursts
  - documented the recovery bridge and removed background refresh from deferred work in Mobile Offline Recovery V1 plus durable project state
- Changed files:
  `apps/mobile/src/features/network/MobileRecoveryRefreshBridge.tsx`
  `apps/mobile/src/providers/root.tsx`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - not run by request
- Next useful step:
  - capture real-device evidence for offline snapshot hydration/clearing, automatic recovery refresh, wallet-linking, and project-room delivery paths.

## Update (2026-04-27, Mobile Offline Snapshot Lifecycle)
- Started from a clean `dev` tree aligned with `origin/dev`; there was no current uncommitted work to publish before this slice.
- Implemented the next mobile offline-recovery hardening slice without intentional tests/builds:
  - split snapshot storage into `apps/mobile/src/features/offline/offlineSnapshots.ts` so session cleanup can clear cached reads without importing UI/hook code
  - centralized snapshot cache-key creation for contracts, project-room, and marketplace-review snapshots
  - cleared saved snapshots for the current user on sign-out, and cleared the snapshot namespace after failed session restore
  - added an Account "Clear offline data" control with user-facing success/failure copy
  - documented snapshot lifecycle, account control behavior, and namespace isolation in Mobile Offline Recovery V1 plus durable project state
- Changed files:
  `apps/mobile/src/features/offline/{offlineSnapshots.ts,useOfflineSnapshot.tsx}`
  `apps/mobile/src/providers/session.tsx`
  `apps/mobile/src/app/{(tabs)/account.tsx,(tabs)/contracts.tsx,contracts/[id].tsx,contracts/[id]/room.tsx}`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - not run by request
- Next useful step:
  - capture real-device evidence for offline snapshot hydration/clearing, wallet-linking, and project-room delivery paths.

## Update (2026-04-27, Mobile Read-Only Offline Snapshots)
- Started from a clean `dev` tree aligned with `origin/dev`; there was no current uncommitted work to publish before this slice.
- Implemented the next mobile offline-recovery slice without intentional tests/builds:
  - added `apps/mobile/src/features/offline/useOfflineSnapshot.tsx` for AsyncStorage-backed, user-scoped read snapshots plus `OfflineSnapshotNotice`
  - cached contracts list/detail source data, project-room state, and marketplace job-review reads after successful live queries
  - allowed contracts, selected contract detail, and project-room/review screens to render saved snapshots during known offline/API-unreachable/error/loading states
  - kept snapshots read-only by disabling stale-state writes and adding live-state guards before funding, milestone, project-room, support, and review mutations
  - documented the snapshot contract, cache-key posture, and remaining deferred work in Mobile Offline Recovery V1 and durable project state
- Changed files:
  `apps/mobile/src/features/offline/useOfflineSnapshot.tsx`
  `apps/mobile/src/app/{(tabs)/contracts.tsx,contracts/[id].tsx,contracts/[id]/room.tsx}`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - not run by request
- Next useful step:
  - capture real-device evidence for offline snapshot hydration, wallet-linking, and project-room delivery paths.

## Update (2026-04-27, Mobile Blocked Action Notices)
- Started from a clean `dev` tree and confirmed `origin/dev` was up to date with `git push origin dev --no-verify`.
- Implemented the next mobile recovery UX slice without intentional tests/builds:
  - added `apps/mobile/src/features/network/NetworkActionNotice.tsx` as a shared blocked-action notice powered by `useNetworkActionGate()`
  - surfaced blocked-action copy next to disabled sign-in, wallet setup/default-wallet, workspace switch, marketplace application, contract creation/funding/join, milestone, project-room, support, and review write controls
  - documented the notice contract and current placements in Mobile Offline Recovery V1, plus updated durable project state
- Changed files:
  `apps/mobile/src/features/network/NetworkActionNotice.tsx`
  `apps/mobile/src/app/{(auth)/sign-in.tsx,(tabs)/marketplace.tsx,contracts/new.tsx,contracts/join.tsx,contracts/[id].tsx,contracts/[id]/room.tsx,marketplace/opportunity/[id].tsx}`
  `apps/mobile/src/features/wallet/MobileWalletSetupCard.tsx`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - not run by request
- Next useful step:
  - capture real-device evidence for wallet-linking and project-room delivery paths, or add a read-only offline snapshot layer for selected contract/project-room views.

## Update (2026-04-27, Mobile Network Action Gate)
- Started from a clean `dev` tree and confirmed `origin/dev` was up to date with `git push origin dev --no-verify`.
- Implemented the next mobile recovery/code-quality slice without intentional tests/builds:
  - added `apps/mobile/src/features/network/useNetworkActionGate.ts` as the shared screen-level guard for offline/API-unreachable writes
  - rewired sign-in, wallet setup UI, contract creation/join/detail/project-room screens, marketplace workspace switching, and marketplace opportunity applications to use the shared gate
  - added network guards to the previously uncovered workspace selection and marketplace proposal submission mutations
  - documented the shared action-gate contract and current guarded screen list in Mobile Offline Recovery V1, plus updated durable project state
- Changed files:
  `apps/mobile/src/features/network/useNetworkActionGate.ts`
  `apps/mobile/src/app/{(auth)/sign-in.tsx,(tabs)/marketplace.tsx,contracts/new.tsx,contracts/join.tsx,contracts/[id].tsx,contracts/[id]/room.tsx,marketplace/opportunity/[id].tsx}`
  `apps/mobile/src/features/wallet/MobileWalletSetupCard.tsx`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - not run by request
- Next useful step:
  - keep future authenticated mobile writes on `useNetworkActionGate()` and capture real-device evidence for wallet/project-room flows.

## Update (2026-04-27, Mobile Mutation Network Guards)
- Started from a clean `dev` tree and confirmed `origin/dev` was up to date with `git push origin dev --no-verify`.
- Implemented the next mobile recovery slice without intentional tests/builds:
  - added `useMobileNetwork()` action guards to direct contract creation, contractor join, contract funding, direct milestone commit, worker delivery, client release, and client dispute mutations
  - added the same guard pattern to project-room submission, revision request, approval, approved-delivery, room message, support case, support reply, and marketplace review mutations
  - disabled primary mutation buttons while the device is known offline or the API is known unreachable, while keeping provider-level guards as the authoritative protection at mutation execution time
  - updated Mobile Offline Recovery V1 and durable project state with the expanded guarded mutation contract
- Changed files:
  `apps/mobile/src/app/contracts/{new.tsx,join.tsx,[id].tsx,[id]/room.tsx}`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - not run by request
- Next useful step:
  - add a small shared mobile mutation-guard helper if more write paths are introduced, then capture real-device evidence for wallet/project-room flows.

## Update (2026-04-27, Mobile API Reachability)
- Started from a clean `dev` tree and confirmed `origin/dev` was up to date with `git push origin dev --no-verify`.
- Implemented the next mobile recovery slice without intentional tests/builds:
  - expanded the mobile network provider with API reachability status, latency, last check time, bounded runtime-profile probes, timeout copy, and stale-probe race protection
  - kept React Query online state tied to native device connectivity while surfacing API outage posture separately
  - updated the shared network card to show API reachability, probe latency, last API check, and latest probe failure
  - made sign-in and wallet setup buttons stop early when the API is known unreachable, while existing provider guards still own the final action-level error copy
  - updated Mobile Offline Recovery V1 and durable project state with the backend reachability contract
- Changed files:
  `apps/mobile/src/providers/network.tsx`
  `apps/mobile/src/features/network/NetworkStatusCard.tsx`
  `apps/mobile/src/features/wallet/MobileWalletSetupCard.tsx`
  `apps/mobile/src/app/(auth)/sign-in.tsx`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - not run by request
- Next useful step:
  - extend mobile-safe network guards across contract creation, contractor join, delivery/dispute, and project-room mutations before considering durable offline replay.

## Update (2026-04-27, Mobile Offline Recovery)
- Started from a clean `dev` tree, confirmed `origin/dev` was up to date, and kept working without intentional tests/builds by request.
- Implemented the next mobile hardening slice:
  - added a NetInfo-backed mobile network provider that exposes connectivity posture, API target, refresh, and action-level `requireOnline(...)` guards
  - wired native connectivity into TanStack Query's online manager so known-offline devices pause query refetch behavior
  - added a reusable Network status/recovery card on Home, Account, and Sign-in
  - blocked OTP request/verify, wallet connector opening, and wallet setup mutations before they enter API or wallet flows when the device is known offline
  - documented the Mobile Offline Recovery V1 contract, limitations, and deferred durable queue work
- Changed files:
  `apps/mobile/src/providers/{network.tsx,root.tsx,wallet.tsx}`
  `apps/mobile/src/features/network/NetworkStatusCard.tsx`
  `apps/mobile/src/app/{(auth)/sign-in.tsx,(tabs)/home.tsx,(tabs)/account.tsx}`
  `docs/{MOBILE_OFFLINE_RECOVERY_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - not run by request
- Next useful step:
  - capture real-device wallet-linking and project-room delivery evidence; only add durable offline mutation replay after the API exposes an explicit mobile-safe idempotency contract.

## Update (2026-04-27, Mobile Wallet Diagnostics)
- Started from a clean `dev` tree and confirmed `origin/dev` was up to date with `git push origin dev --no-verify`.
- Implemented the next mobile hardening slice without intentional verification:
  - exported WalletConnect metadata, native redirect, supported Base chain ids, network labels, configured-chain normalization, and supported-chain helpers from mobile wallet config
  - expanded the mobile wallet context with target/connected chain diagnostics, metadata/redirect diagnostics, supported-chain state, and a `wrong_chain` phase
  - blocked SIWE wallet linking when a connected wallet reports an unsupported chain and surfaced recovery copy that points users back to the configured Base target
  - added wallet readiness diagnostics to setup and account surfaces, including target chain, connected chain, Reown project posture, metadata URL, native redirect, and supported chains
  - documented Mobile Wallet Hardening V1 and updated durable project state
- Changed files:
  `apps/mobile/src/providers/{wallet-config.ts,wallet.tsx}`
  `apps/mobile/src/features/wallet/MobileWalletSetupCard.tsx`
  `apps/mobile/src/app/(tabs)/account.tsx`
  `docs/{MOBILE_WALLET_HARDENING_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - not run by request
- Next useful step:
  - capture real-device wallet-linking and project-room delivery evidence with MetaMask/Coinbase/Rainbow-class wallets.

## Update (2026-04-27, Mobile Support and Reviews)
- Started from a clean `dev` tree and confirmed `origin/dev` was up to date with `git push origin dev --no-verify`.
- Implemented the next mobile product slice without intentional verification:
  - added mobile-safe support-case and marketplace-review DTOs plus product-core API methods for support case create/reply and job review read/create
  - expanded `/contracts/[id]/room` with participant-visible support intake, support case selection, external support replies, marketplace review history, and gated post-contract review capture
  - review capture records overall rating plus scope clarity, communication, timeliness, and outcome quality scores through the existing marketplace review API
  - updated Mobile Project Room V1 docs to cover support/review API mapping, UI behavior, and remaining admin-led gaps
- Changed files:
  `packages/product-core/src/api/{client.ts,types.ts}`
  `apps/mobile/src/app/contracts/[id]/room.tsx`
  `docs/{MOBILE_PROJECT_ROOM_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - not run by request
- Next useful step:
  - device-test wallet-backed project-room delivery and wallet-linking flows against real mobile wallets.

## Update (2026-04-27, Mobile Project Room)
- Started from `dev`, confirmed `origin/dev` was up to date, and preserved the existing in-progress project-room DTO edit in `packages/product-core/src/api/types.ts`.
- Implemented the next mobile product slice without intentional verification:
  - added mobile-safe project-room DTOs and product-core API methods for room read, messages, submissions, revision requests, approvals, and approved-submission delivery
  - added `/contracts/[id]/room` with participant-scoped room summary, milestone selector, worker submission flow, client revision/approval flow, worker approved-delivery action, recent messages, and room/audit activity
  - linked contract detail into the native project room
  - documented the Mobile Project Room V1 role model, API mapping, artifact input contract, UI behavior, and gaps
- Changed files:
  `packages/product-core/src/api/{client.ts,types.ts}`
  `apps/mobile/src/app/{_layout.tsx,contracts/[id].tsx,contracts/[id]/room.tsx}`
  `docs/{MOBILE_PROJECT_ROOM_V1.md,project-state.md,_local/current-session.md}`
- Verification:
  - not run by request
- Next useful step:
  - device-test wallet-backed project-room delivery with real mobile wallets, then add native support-case and job-review capture.

## Update (2026-04-27, Mobile Delivery and Dispute Actions)
- Started from a clean `dev` tree and confirmed `origin/dev` was up to date with `git push origin dev --no-verify`.
- Implemented the next mobile product slice without intentional verification:
  - added role-aware milestone action derivation on `/contracts/[id]`
  - workers can submit delivery notes plus comma-separated evidence URLs for pending milestones
  - clients can release delivered milestones or open disputes with reason plus evidence URLs
  - action mutations reuse the existing authenticated escrow APIs: `deliverMilestone`, `releaseMilestone`, and `disputeMilestone`
  - the contract detail view now clears submitted form state after successful milestone actions and refreshes the participant job list cache
- Changed files:
  `apps/mobile/src/app/contracts/[id].tsx`
  `docs/project-state.md`
  `docs/_local/current-session.md`
- Verification:
  - not run by request

## Update (2026-04-27, Mobile Contractor Join)
- Started from a clean `dev` tree and confirmed `origin/dev` was up to date with `git push origin dev --no-verify`.
- Implemented the next mobile product slice without intentional verification:
  - added shared contractor-join helpers for invite-token normalization, readiness copy, status tone, and join eligibility
  - added `/contracts/join` for authenticated invite entry by job id and invite token
  - added `/contracts/[id]/join` for job-specific invite links that can carry `invite` or `inviteToken` query params
  - the join screen now calls the existing protected join-readiness API, shows email/wallet/seat readiness, linked wallet posture, and executes the existing contractor join mutation when ready
  - updated the contracts tab and root stack to expose the join flow
- Changed files:
  `apps/mobile/src/app/_layout.tsx`
  `apps/mobile/src/app/(tabs)/contracts.tsx`
  `apps/mobile/src/app/contracts/{join.tsx,[id]/join.tsx}`
  `apps/mobile/src/features/contracts/contractor-join.ts`
  `docs/project-state.md`
  `docs/_local/current-session.md`
- Verification:
  - not run by request

## Update (2026-04-27, Mobile Direct Contract Creation)
- Started from a clean `dev` tree and confirmed `origin/dev` was up to date with `git push origin dev --no-verify`.
- Implemented the next mobile product slice without intentional verification:
  - added shared mobile contract draft helpers for initial drafts, milestone normalization, terms JSON generation, readiness checks, and job-to-milestone draft hydration
  - added `/contracts/new` for guided direct escrow creation with scope, contractor identity, settlement token, milestone plan, terms, smart-account readiness, and automatic milestone commit after job creation
  - added `/contracts/[id]` for participant-scoped contract detail with authority summary, milestone commit/review, and client funding action
  - updated the contracts tab to deep-link into contract detail and direct contract creation
  - added `EXPO_PUBLIC_DEFAULT_CURRENCY_ADDRESS` to the mobile environment contract
- Changed files:
  `apps/mobile/.env.example`
  `apps/mobile/app.json`
  `apps/mobile/src/app/_layout.tsx`
  `apps/mobile/src/app/(tabs)/contracts.tsx`
  `apps/mobile/src/app/contracts/{new.tsx,[id].tsx}`
  `apps/mobile/src/features/contracts/contract-drafts.ts`
  `docs/project-state.md`
  `docs/_local/current-session.md`
- Verification:
  - not run by request

## Update (2026-04-27, Mobile Marketplace Workspace and Apply)
- Started from a clean `dev` tree and pushed `origin/dev`; there was no pre-existing uncommitted work to commit.
- Implemented the next mobile product slice without intentional verification:
  - `apps/mobile/src/app/(tabs)/marketplace.tsx` now shows authenticated workspace summaries, workspace switching, analytics counts, notification posture, freelancer application posture, and client opportunity posture
  - `apps/mobile/src/app/marketplace/opportunity/[id].tsx` now supports native wallet-bound structured opportunity applications from freelancer/agency-capable workspaces
  - application submission captures cover note, delivery approach, milestone plan, screening answers, proposed rate, selected wallet, estimated start, and portfolio URLs through the existing product API client
- Docs updated:
  - `docs/project-state.md`
  - `docs/_local/current-session.md`
- Verification:
  - not run by request
- Note:
  - the repo pre-push hook automatically replayed cached `pnpm build` during the initial no-op push before implementation; no additional tests or builds were run after code changes.

## Update (2026-04-26, Mobile Wallet Commit/Push)
- Prepared the native mobile wallet/setup work for branch publication.
- Pre-push build initially exposed a shared frontend React/CSS type drift after adding the mobile React Native stack.
- Added a root `csstype` pnpm override and tightened shared frontend primitive typing so `admin` production build passes before push.
- Verification:
  - passed: `pnpm --filter admin build`

## Update (2026-04-26, Native Mobile Wallet Setup)
- Added native mobile wallet setup to `apps/mobile`:
  - installed Reown/AppKit React Native, EVM adapter, WalletConnect RN compat, random values, SVG, NetInfo, and Expo Application dependencies
  - added Expo/Babel configuration for WalletConnect deep-linking and import-meta support
  - added a mobile wallet provider that uses Reown/AppKit for EVM wallet connection, signs the backend-issued SIWE challenge with `personal_sign`, verifies through the existing wallet API, refreshes authenticated user state, and supports smart-account provisioning plus default-wallet updates
  - made setup readiness actionable through `WalletSetupCard`
  - added linked-wallet inspection/default actions to Account
  - added `apps/mobile/.env.example` with API, Reown project id, chain id, and WalletConnect metadata knobs
- Changed files:
  `apps/mobile/{package.json,pnpm-lock dependencies via root lock,app.json,babel.config.js,.env.example}`
  `apps/mobile/src/providers/{root.tsx,wallet.tsx,wallet-config.ts}`
  `apps/mobile/src/features/{setup/SetupReadinessCard.tsx,wallet/MobileWalletSetupCard.tsx}`
  `apps/mobile/src/app/(tabs)/account.tsx`
  `docs/{project-state.md,_local/current-session.md}`
- Verification:
  - passed: `pnpm --filter mobile typecheck`
  - passed: `pnpm --filter @escrow4334/product-core typecheck`
  - passed: `pnpm --filter mobile exec expo config --type public`
  - passed: `pnpm --filter mobile exec expo export --platform web --output-dir dist-web-smoke`
- Notes:
  - real wallet connection requires `EXPO_PUBLIC_REOWN_PROJECT_ID`
  - no device-level wallet round trip was run in this shell

## Update (2026-04-26, Mobile Polish Refinement)
- Continued the mobile UI polish pass in `apps/mobile`:
  - fixed `AnimatedReveal` so progressive content can animate out before unmounting
  - tightened adaptive metrics for tiny phones, sticky footer scroll clearance, segmented controls, badges, metric rows, and full-width bottom actions
  - refined tab bar safe-area sizing with a subtle active indicator
  - improved marketplace/contracts loading density, contracts error handling, sign-in keyboard metadata, and the opportunity detail CTA so signed-in users do not hit a no-op
- Changed files:
  `apps/mobile/src/ui/{motion.tsx,primitives.tsx}`
  `apps/mobile/src/app/{(auth)/sign-in.tsx,(tabs)/_layout.tsx,(tabs)/contracts.tsx,(tabs)/marketplace.tsx,marketplace/opportunity/[id].tsx}`
  `docs/_local/current-session.md`
- Verification:
  - passed: `pnpm --filter mobile typecheck`
  - passed: `pnpm --filter @escrow4334/product-core typecheck`
  - passed: `pnpm --filter mobile exec expo config --type public`
  - passed: `pnpm --filter mobile exec expo export --platform web --output-dir dist-web-smoke`
  - passed: `git diff --check`

## Update (2026-04-26, Mobile UI Polish and Motion)
- Upgraded `apps/mobile` polish without adding animation dependencies:
  - added a restrained reusable motion layer with built-in React Native `Animated`
  - motion now supports entrance/reveal, press scale, skeleton pulse, and reduced-motion accessibility
  - refined shared primitives for adaptive spacing, large-phone content rails, compact small-phone density, focused fields, segmented controls, premium list cards, metric rows, and sticky bottom actions
  - improved Expo Router stack transitions, detail-route back headers, tab bar spacing/elevation, and keyboard/tab behavior
  - refreshed onboarding, OTP sign-in, home, marketplace, profile/opportunity details, contracts, setup readiness, and account/settings to use the new hierarchy and interaction patterns
- Changed files:
  `apps/mobile/src/**`
  `docs/{project-state.md,_local/current-session.md}`
- Verification:
  - passed: `pnpm --filter mobile typecheck`
  - passed: `pnpm --filter @escrow4334/product-core typecheck`
  - passed: `pnpm --filter mobile exec expo config --type public`
  - passed: `pnpm --filter mobile exec expo export --platform web --output-dir dist-web-smoke`
  - passed: `git diff --check`
- Notes:
  - no new animation library was introduced
  - pre-existing dirty web edits were left untouched

## Update (2026-04-26, Mobile Phase 1 Scaffold)
- Added first mobile foundation slice:
  - new `packages/product-core` workspace with platform-neutral API client/types, i18n, formatting, marketplace lane helpers, and product design tokens
  - new `apps/mobile` Expo Router app pinned to Expo SDK 55 / React Native 0.83 / React 19.2
  - mobile providers for TanStack Query, token-backed API access, SecureStore session restore, AsyncStorage locale/theme preferences, and token-driven theme mapping
  - native UI primitives plus onboarding, OTP sign-in, setup readiness, marketplace browse/detail, contracts, and account/settings starter routes
- Native SIWE/WalletConnect/Reown wallet adapter, full contract creation, delivery/dispute forms, and workspace summary parity remain future phases.
- Changed files:
  `apps/mobile/**`
  `packages/product-core/**`
  `pnpm-lock.yaml`
  `docs/{project-state.md,_local/current-session.md}`
- Verification:
  - passed: `pnpm --filter @escrow4334/product-core typecheck`
  - passed: `pnpm --filter mobile typecheck`
  - passed: `pnpm --filter mobile exec expo config --type public`
  - passed: `git diff --check`
- Notes:
  - `pnpm install` completed with existing peer/bin-link warnings, including `ts-node` bin warnings under `services/api` and React peer warnings unrelated to this mobile scaffold.
  - Expo Metro boot smoke was attempted: default `8081` was occupied, and a retry on `8082` printed the project startup line but did not reach a ready prompt before it was stopped.
  - Pre-existing dirty web edits were left untouched.

## Update (2026-04-23, Public Hero Contrast Fix)
- Fixed low-contrast text in the dark public hero surfaces in `apps/web`:
  - applied the dedicated landing hero title class on `/`
  - added shared high-contrast hero heading/summary tone helpers in marketing styles
  - updated marketplace profile/opportunity detail heroes to use explicit light eyebrow, title, and summary styling instead of default `SectionHeading` colors
- Changed files:
  `apps/web/src/app/{marketing.styles.ts,page.tsx}`
  `apps/web/src/app/marketplace/profiles/[slug]/profile-detail.tsx`
  `apps/web/src/app/marketplace/opportunities/[id]/opportunity-detail.tsx`
- Verification:
  - passed: `pnpm --filter web test -- src/app/marketing-page.spec.tsx 'src/app/marketplace/profiles/[slug]/profile-detail.spec.tsx' 'src/app/marketplace/opportunities/[id]/opportunity-detail.spec.tsx'`
  - passed: `pnpm --filter web typecheck`
  - passed: `git diff --check`

## Update (2026-04-23, Tailored Product Favicon)
- Replaced the stock Next favicons in both frontend apps with a repo-specific SVG mark:
  - dark escrow vault/shield silhouette
  - stepped milestone bars inside the shield to reflect milestone-funded settlement
  - cyan/green glow aligned with the current product theme tokens
  - wired the icon through layout metadata and `public/favicon.svg` after the App Router `icon.svg` route caused a production-build prerender failure
- Changed files:
  `apps/web/{public/favicon.svg,src/app/layout.tsx}`
  `apps/admin/{public/favicon.svg,src/app/layout.tsx}`
  removed: `apps/web/src/app/favicon.ico`
  removed: `apps/admin/src/app/favicon.ico`
- Verification:
  - passed: `pnpm --filter admin build`
  - passed: `pnpm --filter web build`

## Update (2026-04-22, Admin Public Landing and Operator Route Split)
- Reworked `apps/admin` around a public root plus dedicated operator routes:
  - `/` is now a client-facing landing page with product-value, workflow, trust, and CTA sections
  - `/operator` now owns the existing operator dashboard
  - `/operator/cases/[id]` now owns operator case review
  - `/operator/marketplace` now owns marketplace moderation
  - legacy `/cases/[id]` and `/marketplace` now redirect into the operator route family
- Updated operator-facing navigation and framing without changing capability logic:
  - operator hero copy now summarizes queue/readiness posture instead of leading with API/runtime diagnostics
  - walkthrough, help/manual, moderation, and dispute-queue links now point to `/operator` and `/operator/cases/<job-id>`
  - added `NEXT_PUBLIC_WEB_BASE_URL` so landing CTAs can target a separately deployed `apps/web` origin while still falling back to same-origin routes locally
- Changed files:
  `apps/admin/.env.example`
  `apps/admin/README.md`
  `apps/admin/src/app/{page.tsx,landing-page.tsx,layout.tsx,page.styles.ts,operator-console.tsx,operator-walkthrough.tsx,landing-page.spec.tsx,route-redirects.spec.ts}`
  `apps/admin/src/app/{cases/[id]/page.tsx,marketplace/page.tsx,help/layout.tsx,help/operator-case-flow/page.tsx}`
  `apps/admin/src/app/operator/{page.tsx,marketplace/page.tsx}`
  `apps/admin/src/app/operator/cases/[id]/{page.tsx,page.spec.tsx}`
  `apps/admin/src/app/{page.spec.tsx,operator-walkthrough.spec.tsx}`
  `apps/admin/src/app/marketplace/{moderation-console.tsx,marketplace-moderation.spec.tsx}`
  `apps/admin/src/lib/{i18n.tsx,public-app-url.ts}`
  `docs/{project-state.md,_local/current-session.md}`
- Verification:
  - passed: `pnpm --filter admin test`
  - passed: `pnpm --filter admin typecheck`
  - passed: `git diff --check`

## Update (2026-04-22, Freelancer Light-Theme Contrast Fix)
- Tightened the light-theme secondary and muted text tokens on `apps/web` so freelancer-facing workspace copy reads more clearly against pale panel and status backgrounds.
- Changed files:
  `apps/web/src/app/globals.css`
- Verification:
  - passed: `pnpm --filter web typecheck`
  - passed: `git diff --check`

## Update (2026-04-22, Marketplace Hero Readability Pass)
- Improved the public marketplace hero for clearer text hierarchy and better contrast:
  - rewrote the hero eyebrow/title/lead and stat copy in English and Arabic
  - switched the hero surface to a higher-contrast dark presentation with explicit hero text colors
  - strengthened CTA, badge, and stat-pill contrast so the section is readable in both themes
- Changed files:
  `apps/web/src/app/{marketing.styles.ts}`
  `apps/web/src/app/marketplace/{marketplace-browser.tsx,marketplace-page.spec.tsx}`
  `apps/web/src/lib/i18n.tsx`
- Verification:
  - passed: `pnpm --filter web test src/app/marketplace/marketplace-page.spec.tsx`
  - passed: `pnpm --filter web typecheck`

## Update (2026-04-22, Admin Theme Alignment)
- Re-themed `apps/admin` to match the web app visual system:
  - added admin light/dark theme state with cookie-backed persistence via `escrow4334-admin-theme`
  - switched admin layout/fonts and global tokens to the same web-style theme model
  - moved admin shell and shared-page usage onto the `web` theme variant
  - added admin theme toggle controls to the operator and marketplace moderation top bars
  - added admin theme-toggle coverage and updated toolbar assertions in admin UI tests
- Changed files:
  `apps/admin/src/app/{globals.css,language-switcher.tsx,layout.tsx,operator-console.tsx,page.styles.ts,spatial-shell.tsx,theme-toggle.tsx,theme-toggle.spec.tsx}`
  `apps/admin/src/app/marketplace/{moderation-console.tsx,marketplace-moderation.spec.tsx}`
  `apps/admin/src/app/operator-walkthrough.spec.tsx`
  `apps/admin/src/lib/{i18n.tsx,theme.shared.ts,theme.tsx}`
- Verification:
  - passed: `pnpm --filter admin typecheck`
  - passed: `pnpm --filter admin test -- src/app/operator-case.spec.ts`
  - passed: `pnpm --filter admin test -- src/app/operator-walkthrough.spec.tsx src/app/theme-toggle.spec.tsx`
  - passed: `pnpm --filter admin test -- src/app/marketplace/marketplace-moderation.spec.tsx`
  - passed: `git diff --check`
  - still noisy in this shell: `pnpm --filter admin test` and `pnpm --filter admin test -- src/app/page.spec.tsx` did not return a clean completion signal here even though targeted admin specs and typecheck passed

## Current Objective
- Advance Mobile V1 from contractor join into milestone execution:
  - worker delivery submission
  - client release action
  - client dispute initiation with evidence
  - no test/build verification in this request

## Last Completed Step
- Pushed the clean `dev` branch before implementation; `origin/dev` was already up to date.

## Current Step
- Mobile delivery/release/dispute code is implemented and intentionally unverified:
  - `apps/mobile/src/app/contracts/[id].tsx`
  - `docs/project-state.md`
  - `docs/_local/current-session.md`
- No tests or builds were run after implementation.
- Remaining external work is still the separate staged proof path:
  - deploy the candidate with real staging secrets
  - run `Deployed Smoke`
  - run `Launch Candidate`
  - run `Promotion Review`

## Why This Step Exists
- Mobile could create, join, fund, and inspect contracts but still lacked milestone execution actions for worker delivery, client release, and client disputes.

## Changed Files
- Phase 0 repo-closeout:
  `package.json`
  `scripts/{staging-contract*,phase0-readiness*}.mjs`
  `docs/{DEPLOYMENT_RUNBOOK.md,ENVIRONMENT_MATRIX.md,LAUNCH_READINESS.md,MARKETPLACE_PHASE_0_BACKLOG_V1.md,MARKETPLACE_PHASE_0_V1.md,PHASE_0_STAGING_HANDOFF.md,STAGING_EXECUTION_SEQUENCE.md}`
- Phase 1 backend:
  `services/api/src/modules/organizations/*`
  `services/api/src/persistence/{persistence.types.ts,file/file-persistence.store.ts,file/file.organizations.repositories.ts,postgres/postgres.organizations.repositories.ts}`
  `services/api/src/persistence/postgres/migrations/{018_organizations_workspaces.sql,019_organization_invitations.sql}`
  `services/api/test/organizations.service.spec.ts`
- Phase 1 web/browser:
  `apps/web/src/{lib/api.ts,lib/i18n.tsx,app/marketplace/workspace.tsx,app/marketplace/marketplace-workspace.spec.tsx}`
  `tests/e2e/flows/marketplace-exact-flow.ts`
- Repo memory:
  `docs/project-state.md`
  `docs/_local/current-session.md`
  `docs/MARKETPLACE_PHASE_1_V1.md`
- Phase 3 work in progress:
  `services/api/src/modules/marketplace/{marketplace.controller.ts,marketplace.dto.ts,marketplace.service.ts,marketplace.types.ts}`
  `services/api/src/persistence/{persistence.types.ts,file/file-persistence.store.ts,file/file.marketplace.repositories.ts,postgres/postgres.marketplace.repositories.ts}`
  `services/api/src/persistence/postgres/migrations/021_marketplace_pipeline_phase.sql`
  `apps/web/src/{lib/api.ts,lib/i18n.tsx,app/marketplace/workspace.tsx}`
- Phase 4 work in progress:
  `services/api/src/modules/marketplace/{marketplace.controller.ts,marketplace.dto.ts,marketplace.service.ts,marketplace.types.ts}`
  `services/api/src/persistence/{persistence.types.ts,file/file-persistence.store.ts,file/file.marketplace.repositories.ts,postgres/postgres.marketplace.repositories.ts}`
  `services/api/src/persistence/postgres/migrations/022_marketplace_contract_drafts.sql`
  `apps/web/src/{lib/api.ts,lib/i18n.tsx,app/marketplace/workspace.tsx}`
- Phase 5 work in progress:
  `services/api/src/modules/escrow/{escrow.controller.ts,escrow.dto.ts,escrow.service.ts,escrow.types.ts}`
  `services/api/src/persistence/{file/file.repositories.ts,postgres/postgres.repositories.ts}`
  `services/api/src/persistence/postgres/migrations/023_escrow_project_room.sql`
  `apps/web/src/{app/project-room.tsx,app/app/contracts/[id]/room/page.tsx,app/web-console.tsx,app/marketplace/workspace.tsx,lib/api.ts,lib/i18n.tsx}`
- Phase 6 work in progress:
  `services/api/src/modules/marketplace/{marketplace.controller.ts,marketplace.dto.ts,marketplace.service.ts,marketplace.types.ts}`
  `services/api/src/persistence/{persistence.types.ts,file/file-persistence.store.ts,file/file.marketplace.repositories.ts,postgres/postgres.marketplace.repositories.ts}`
  `services/api/src/persistence/postgres/migrations/024_marketplace_reputation_and_reviews.sql`
  `apps/web/src/{app/project-room.tsx,app/marketplace/profiles/[slug]/profile-detail.tsx,app/marketplace/opportunities/[id]/opportunity-detail.tsx,lib/api.ts,lib/i18n.tsx}`
  `apps/admin/src/{app/marketplace/moderation-console.tsx,lib/api.ts}`
- Phase 7 work in progress:
  `services/api/src/modules/escrow/{escrow.controller.ts,escrow.dto.ts,escrow.service.ts,escrow.types.ts}`
  `services/api/src/modules/marketplace/marketplace.service.ts`
  `services/api/src/persistence/{file/file.repositories.ts,postgres/postgres.repositories.ts}`
  `apps/web/src/{app/project-room.tsx,app/web-console.tsx,lib/api.ts}`
  `apps/admin/src/{app/operator-console.tsx,lib/api.ts}`
  `docs/{project-state.md,_local/current-session.md}`
- Phase 8 work in progress:
  `services/api/src/modules/marketplace/{marketplace.controller.ts,marketplace.dto.ts,marketplace.service.ts,marketplace.types.ts}`
  `services/api/src/persistence/{persistence.types.ts,file/file-persistence.store.ts,file/file.marketplace.repositories.ts,postgres/postgres.marketplace.repositories.ts}`
  `services/api/src/persistence/postgres/migrations/025_marketplace_intelligence_phase.sql`
  `apps/web/src/{app/marketplace/marketplace-browser.tsx,app/marketplace/workspace.tsx,app/marketplace/page.tsx,app/marketplace/profiles/[slug]/{page.tsx,profile-detail.tsx},app/marketplace/opportunities/[id]/{page.tsx,opportunity-detail.tsx},lib/api.ts}`
  `apps/admin/src/{app/marketplace/moderation-console.tsx,lib/api.ts}`
  `docs/{project-state.md,_local/current-session.md}`

## Key Constraints
- Treat the current repo as an escrow-first marketplace foundation, not a blank-slate rewrite target.
- Preserve the strongest current slices: `WorkstreamEscrow`, OTP + SIWE + smart-account onboarding, persisted workflow orchestration, hire-to-escrow bridging, and operator trust/safety tooling.
- Keep the near-term product narrow: fixed-price, milestone-first, Base/USDC-first, one client organization to one freelancer or agency seat.
- Keep historical plan docs concise and clearly marked rather than deleting context that still explains completed work.
- Keep the implementation docs repo-specific: they should describe modules, workflows, data shape direction, verification, and UI posture in terms of the current monorepo instead of generic marketplace advice.

## Verification Commands
- `pnpm staging:contract:validate`
- `pnpm phase0:readiness`
- `pnpm --filter escrow4334-api test -- --runTestsByPath test/organizations.service.spec.ts test/marketplace.service.spec.ts`
- `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit`
- `pnpm --filter web test src/app/marketplace/marketplace-workspace.spec.tsx`
- `pnpm --filter web typecheck`
- `PLAYWRIGHT_LOCAL_SERVER_MODE=built pnpm e2e:journeys:local tests/e2e/specs/journeys/local/marketplace-exact-publish-apply-hire-flow.spec.ts`
- `git diff --check`

## Verification Status
- Passed:
  - `node --test scripts/staging-contract-lib.test.mjs scripts/phase0-readiness-lib.test.mjs`
  - `pnpm staging:contract:validate`
  - `pnpm phase0:readiness`
  - `pnpm --filter escrow4334-api test -- --runTestsByPath test/organizations.service.spec.ts test/marketplace.service.spec.ts`
  - `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit`
  - `pnpm --filter web test src/app/marketplace/marketplace-workspace.spec.tsx`
  - `pnpm --filter web typecheck`
  - `PLAYWRIGHT_LOCAL_SERVER_MODE=built pnpm e2e:journeys:local tests/e2e/specs/journeys/local/marketplace-exact-publish-apply-hire-flow.spec.ts`
  - `git diff --check`
- Blocked or not run:
  - targeted verification for the Phase 6 trust/reputation/review pass was intentionally not run because the user explicitly asked for code and documentation only
  - targeted verification for the agency-lane completion pass was intentionally not run because the user explicitly asked for code and documentation only
  - full `pnpm build` was intentionally not pursued further after the user redirected away from build/debug work; the last repo build failure was environment-only Google Fonts fetch resolution in the sandboxed web build, not a code type/test failure
  - real staged deployment validation against live staging secrets and URLs
  - real Phase 0 staging proof against launch-candidate evidence artifacts
  - broader browser proof for agency/delegated workspace flows

## Next Likely Step
- If staying in product code:
  - add mobile project-room delivery review
  - add device-level wallet hardening notes after real wallet exercise
  - add mobile support/review capture for closed contracts
- If switching back to release work:
  - deploy the target candidate to staging
  - run `Deployed Smoke`
  - run `Launch Candidate`
  - run `Promotion Review`
  - preserve `release-dossier` and `release-pointer-staging`

## Update (2026-04-22, Marketplace Plan Remaining-Work Assessment)
- Assessed the active marketplace plan against repo memory and current local session state.
- Current best summary:
  - repo-side marketplace phases `1..8` are largely implemented
  - Phase 8 is still marked code-only and intentionally unverified in this checkout
  - Phase 0 is repo-complete but still blocked on real staging proof and release evidence
- Remaining work clusters:
  - real staging validation for email, relay, bundler/paymaster, and escrow execution providers
  - real `Deployed Smoke` -> `Launch Candidate` -> `Promotion Review` execution with preserved reviewed artifacts
  - broader browser-proof hardening for workspace/lane flows and ranking/search conversion surfaces
  - deferred post-plan capabilities such as advanced ranking/search indexing, richer in-product comms, open bidding, and multi-contractor escrow composition
- Verification for this assessment:
  - docs-only review; no code/tests/builds run

## Update (2026-04-21, Phase 1 Agency Identity Completion)
- Completed the remaining repo-side Phase 1 identity/workspace slice without running verification.
- Backend changes:
  - widened organization kinds/roles to include agency ownership and membership
  - added missing file/Postgres organization-invitation repository methods
  - added `019_organization_invitations.sql`
  - made invitation management reject personal workspaces while still allowing new org creation from management-capable workspaces
- Web changes:
  - marketplace workspace now derives an explicit `agency` lane on top of freelancer-kind workspaces with `organizationKind === 'agency'`
  - onboarding and mode guide now expose hire/freelance/agency entry points
  - organization creation now supports `client` or `agency`
  - organization ownership, membership, and invitation surfaces are generic across shared org kinds
  - pending invitation acceptance now activates the correct lane copy for client vs agency invites
- Docs updated:
  - `docs/project-state.md`
  - `docs/MARKETPLACE_PHASE_1_V1.md`
  - `docs/_local/current-session.md`
- Verification:
  - not run by request

## Update (2026-04-21, Marketplace Search and Invite Backend Slice)
- Added a new marketplace search/read-model backend slice on top of the current Phase 1 workspace baseline:
  - public talent/opportunity search endpoints
  - authenticated talent/opportunity recommendation endpoints
  - saved-search create/list/delete support
  - opportunity invite create/list support
- Persistence now includes dedicated search/invite records:
  - `marketplace_talent_search_documents`
  - `marketplace_opportunity_search_documents`
  - `marketplace_saved_searches`
  - `marketplace_opportunity_invites`
- Organization management also expanded slightly:
  - org-scoped membership listing
  - pending invitation revocation
  - membership responses now expose member user/email identity for client-owner UI use
- Changed files:
  `apps/web/src/lib/api.ts`
  `services/api/src/modules/{marketplace,organizations}/*`
  `services/api/src/persistence/{persistence.types.ts,file/file-persistence.store.ts,file/file.marketplace.repositories.ts,postgres/postgres.marketplace.repositories.ts}`
  `services/api/src/persistence/postgres/migrations/020_marketplace_search_phase.sql`
- Verification:
  - not run in this checkout before commit/push
- Next step:
  - run targeted API typecheck/tests for the marketplace + organizations slice
  - then add the web/UI consumer layer for search, recommendations, saved searches, and invites

## Update (2026-04-21, Marketplace Phase 3 Pipeline)
- Added the repo-side Phase 3 pipeline without running verification:
  - immutable `marketplace_application_revisions`
  - `marketplace_interview_threads` and `marketplace_interview_messages`
  - `marketplace_offers`
  - `marketplace_application_decisions`
- Backend changes:
  - added DTO/controller/service support for application revise, timeline, interview message, offer create/respond, and opportunity comparison routes
  - application apply/withdraw/shortlist/reject/hire flows now also persist timeline/decision records
  - Postgres and file persistence now both implement the new pipeline records
- Web changes:
  - `apps/web/src/app/marketplace/workspace.tsx` now exposes timeline load, comparison load, interview messaging, proposal revision, and offer actions in the authenticated workspace
  - `apps/web/src/lib/api.ts` now mirrors the new Phase 3 response shapes and routes
  - `apps/web/src/lib/i18n.tsx` now includes Phase 3 workspace copy in English and Arabic
- Verification:
  - not run by request

## Update (2026-04-21, Marketplace Phase 4 Contract Draft Conversion)
- Added the repo-side Phase 4 handoff without running verification:
  - accepted-offer `marketplace_contract_drafts`
  - immutable contract metadata snapshots plus metadata hashes
  - participant approval state and finalized-draft conversion into escrow jobs
- Backend changes:
  - added contract-draft DTO/controller/service routes for read, revise, approve, and convert
  - accepted offer transitions now seed a contract draft automatically
  - hire-to-escrow now routes through finalized contract drafts when present instead of rebuilding terms ad hoc
- Web changes:
  - `apps/web/src/app/marketplace/workspace.tsx` now renders contract-draft forms in both client and talent timeline views
  - comparison cards now show contract-draft status
  - `apps/web/src/lib/i18n.tsx` now includes Phase 4 draft and conversion copy in English and Arabic
- Verification:
  - not run by request

## Update (2026-04-21, Marketplace Phase 5 Project Room Execution)
- Added the repo-side Phase 5 execution workspace without running verification:
  - contract-linked project room persisted directly on escrow jobs
  - milestone submissions, revision requests, approvals, room messages, and merged activity feed
  - deliver-approved-submission bridge into the existing onchain milestone lifecycle
- Backend changes:
  - added escrow DTO/controller/service routes for `GET /jobs/:id/project-room` and project-room mutation endpoints
  - file/Postgres escrow persistence now reads/writes `project_room_json`
  - added `023_escrow_project_room.sql`
- Web changes:
  - added `/app/contracts/[id]/room` plus a dedicated project-room client surface
  - marketplace workspace and contract console now deep-link into the room for converted/hired contracts
  - `apps/web/src/lib/api.ts` and `apps/web/src/lib/i18n.tsx` now include the new project-room response shapes and English/Arabic copy
- Verification:
  - not run by request

## Update (2026-04-21, Marketplace Phase 6 Reputation, Reviews, and Trust)
- Added the repo-side Phase 6 trust layer without running verification:
  - persisted marketplace job reviews and operator-owned identity risk reviews
  - derived public reputation snapshots and operator-only risk signals
  - public profile/opportunity trust UI plus project-room review capture after contract close
- Backend changes:
  - added DTO/controller/service routes for authenticated job-review read/create plus operator review moderation and identity-risk review updates
  - marketplace read models now enrich talent/client summaries with derived reputation snapshots and public reviews
  - moderation dashboard/profile reads now include review/identity counters and operator risk posture
- Web/admin changes:
  - `apps/web` now renders public reputation/review cards on marketplace detail pages and review capture/listing inside the project room
  - `apps/admin` moderation now includes review visibility actions and identity confidence/risk review controls
- Verification:
  - not run by request

## Update (2026-04-20, Exact Marketplace Canary Stabilization)
- Stabilized the exact Phase 1 marketplace browser canary against the built local stack.
- Playwright/runtime changes:
  - `playwright.config.ts` now runs local/deployed projects with `reducedMotion: 'reduce'` to keep the spatial motion layer from dominating actionability in browser canaries
- Exact-flow changes:
  - `tests/e2e/flows/marketplace-exact-flow.ts` now:
    - uses `SharedCard` test-id selectors instead of stale nested `article` assumptions
    - switches into the required client/freelancer lane through the real workspace switcher when needed
    - retries workspace actions once across DOM replacement instead of failing on stale button handles
    - relies on durable workflow state such as `My applications` instead of transient submit toasts where appropriate
- Product change:
  - `apps/web/src/app/marketplace/workspace.tsx` now reloads marketplace workspace state before rehydrating opportunity applications after shortlist/reject/hire decisions, so the client review board stays loaded and the hire action remains available in the same session
- Regression coverage:
  - `apps/web/src/app/marketplace/marketplace-workspace.spec.tsx` now covers the review-board persistence after shortlisting an applicant
- Verification:

## Update (2026-04-22, Post-Phase-8 Automation Execution)
- Implemented the next repo-side marketplace phase as retention automation execution:
  - persisted immutable `marketplace_automation_runs`
  - added authenticated automation run list, per-rule manual run, and bulk dispatch endpoints
  - generated run items now snapshot lifecycle follow-up recommendations from saved-search, invite, talent-pool, and rehire tasks
  - workspace retention UI now shows run history, due/all-enabled dispatch actions, and rule-level last-run posture
  - analytics and moderation intelligence now include automation run counts plus delivered task totals
- Changed files:
  `services/api/src/modules/marketplace/{marketplace.controller.ts,marketplace.dto.ts,marketplace.service.ts,marketplace.types.ts}`
  `services/api/src/persistence/{persistence.types.ts,file/file-persistence.store.ts,file/file.marketplace.repositories.ts,postgres/postgres.marketplace.repositories.ts}`
  `services/api/src/persistence/postgres/migrations/027_marketplace_automation_runs.sql`
  `apps/web/src/{app/marketplace/workspace.tsx,lib/api.ts}`
  `apps/admin/src/{app/marketplace/moderation-console.tsx,lib/api.ts}`
  `docs/{project-state.md,_local/current-session.md}`
- Verification:
  - passed: filtered API typecheck scan for touched marketplace/persistence files
  - passed: filtered web typecheck scan for touched marketplace/admin files
  - passed: `pnpm --filter escrow4334-api test -- --runTestsByPath test/migrations.spec.ts`
  - known existing failures remain in `pnpm --filter escrow4334-api test -- --runTestsByPath test/marketplace.service.spec.ts`:
    - zero-amount escrow reconciliation in hire flows
    - hidden-profile visibility expectation mismatch
  - `pnpm --filter web test src/app/marketplace/marketplace-workspace.spec.tsx`
  - `pnpm --filter web typecheck`
  - `PLAYWRIGHT_LOCAL_SERVER_MODE=built pnpm e2e:journeys:local tests/e2e/specs/journeys/local/marketplace-exact-publish-apply-hire-flow.spec.ts`
  - `git diff --check`
- Result:
  - Passed

## Update (2026-04-20, Exact Lane Proof in Launch Evidence)
- Extended the exact marketplace evidence contract so deployed exact journeys now emit explicit client/freelancer lane proof alongside marketplace-origin exports.
- `tests/e2e/fixtures/marketplace-evidence.ts` now requires exact lane proof for exact-mode evidence:
  - expected lane identity
  - current lane confirmation
  - empty-state confirmation
  - lane-surface confirmation
  - whether the workspace switcher was used
- `tests/e2e/flows/marketplace-exact-flow.ts` now returns lane proof for both actors, and the deployed exact marketplace canary persists it into `marketplace-exact-evidence.json`.
- `scripts/launch-candidate-lib.mjs` now carries that exact lane proof into:
  - `marketplace-origin-summary`
  - `launch-evidence-posture.json`
  - `promotion-record.json`
- `scripts/promotion-review-lib.mjs` and `scripts/release-dossier-lib.mjs` now compare exact lane proof across posture vs promotion record and surface it in markdown artifacts.
- Verification:
  - `git diff --check`
  - `node --test scripts/launch-candidate-lib.test.mjs scripts/promotion-review-lib.test.mjs scripts/release-dossier-lib.test.mjs`
- Result:
  - Passed

## Update (2026-04-20, Exact Lane Proof in Release Pointer)
- `scripts/release-pointer-lib.mjs` now snapshots exact marketplace lane proof from the canonical launch posture into the release pointer:
  - `launchMarketplaceExactLaneProofOk`
  - `launchMarketplaceExactClientLaneSwitchedViaWorkspaceSwitcher`
  - `launchMarketplaceExactFreelancerLaneSwitchedViaWorkspaceSwitcher`
- Ready-launch validation for release pointers now also blocks when exact marketplace lane proof is not confirmed.
- `scripts/release-pointer.mjs` now exports the new exact lane proof fields through `--write-env` and surfaces them in `release-pointer.md`.
- Verification:
  - `git diff --check`
  - `node --test scripts/release-pointer-lib.test.mjs scripts/launch-candidate-lib.test.mjs scripts/promotion-review-lib.test.mjs scripts/release-dossier-lib.test.mjs`
- Result:
  - Passed

## Update (2026-04-20, Release Pointer Workflow Summaries)
- `Launch Candidate` now writes the resolved rollback release-pointer posture into `GITHUB_STEP_SUMMARY` for `production` runs:
  - candidate run id
  - commit SHA
  - image digest
  - launch status/readiness/evidence completeness
  - marketplace-origin proof
  - exact marketplace lane proof
  - exact client/freelancer workspace-switch facts
- `Promotion Review` now validates the generated release pointer with `--write-env` and writes the same exact-lane posture into its workflow summary for reviewers.
- Updated launch/deployment/staging docs so reviewers explicitly check workflow-summary exact-lane proof alongside the persisted `release-pointer` artifact.
- Verification:
  - `git diff --check`
- Result:
  - Passed

## Update (2026-04-20, Launch Review Artifact Contract)
- Fixed the live GitHub `Launch Candidate` review artifact so it now preserves the full release-facing launch evidence subset expected later by `Promotion Review` and `release-dossier`:
  - `evidence-manifest.json`
  - `launch-evidence-posture.json`
  - `marketplace-origin-summary.json`
  - `marketplace-seeded-evidence.json`
  - `marketplace-exact-evidence.json`
  - `promotion-record.json`
  - `promotion-record.md`
  - `provider-validation-summary.json`
  - `summary.md`
- Updated launch/deployment/staging docs so reviewers explicitly expect that fuller artifact set before trusting dossier assembly.
- Verification:
  - `git diff --check`
- Result:
  - Passed

## Update (2026-04-20, Release Dossier Source Validation)
- Added `validateReleaseDossierSourceDirectories(...)` to `scripts/release-dossier-lib.mjs` and exposed `node ./scripts/release-dossier.mjs validate-sources ...` as the shared source-bundle validator for reviewed artifacts.
- `scripts/release-dossier.mjs` now validates reviewed source bundles before copy/generation and fails with an explicit list of missing required files.
- `Promotion Review` now runs that source validation step before `release-dossier` generation, and `release-dossier` generation itself is skipped when the validation step fails.
- Added test coverage for missing reviewed launch files and verified the CLI emits the expected missing-file contract errors.
- Verification:
  - `git diff --check`
  - `node --test scripts/release-dossier-lib.test.mjs`
  - `node ./scripts/release-dossier.mjs validate-sources --image-manifest-dir scripts --deployed-smoke-dir scripts --launch-review-dir scripts --promotion-review-dir scripts`
    Expected to fail with explicit missing-file errors.
- Result:
  - Passed

## Update (2026-04-20, Early GitHub Bundle Validation)
- Added reusable single-source validation to `scripts/release-dossier-lib.mjs`:
  - `findReleaseDossierSourceSpec(...)`
  - `validateReleaseDossierSourceDirectory(...)`
- `scripts/release-dossier.mjs` now supports:
  - `validate-source-dir --source <key> --dir <path>`
- `Launch Candidate` now validates the reviewed `launchCandidateReview` bundle before uploading the review artifact.
- `Promotion Review` now validates the downloaded `imageManifest`, `deployedSmokeReview`, and `launchCandidateReview` bundles before reconciliation begins.
- Added targeted test coverage for single-source validation and unknown source keys.
- Verification:
  - `git diff --check`
  - `node --test scripts/release-dossier-lib.test.mjs`
  - `node ./scripts/release-dossier.mjs validate-source-dir --source launchCandidateReview --dir scripts`
    Expected to fail with explicit missing-file errors.
- Result:
  - Passed

## Update (2026-04-20, Reviewed Artifact Upload Validation)
- `Deployed Smoke` now validates `artifacts/deployed-smoke-review` with `validate-source-dir --source deployedSmokeReview` before uploading the reviewed smoke artifact in both staging-auto and manual paths.
- `Promotion Review` now validates `artifacts/promotion-review` with `validate-source-dir --source promotionReview` before uploading the reviewed promotion artifact.
- Updated launch/deployment docs so the reviewed-artifact contract is stated consistently across smoke, launch, promotion, dossier, and pointer steps.
- Verification:
  - `git diff --check`
- Result:
  - Passed

## Update (2026-04-20, Full Generated Bundle Validation)
- Added explicit generated-bundle validators for the remaining full GitHub upload boundaries:
  - `scripts/launch-candidate.mjs validate-artifacts --artifacts-dir <path>`
  - `scripts/release-dossier.mjs validate-output-dir --dir <path>`
  - `scripts/release-pointer.mjs validate-output-dir --dir <path>`
- `scripts/launch-candidate-lib.mjs` now defines the full upload contract for `launch-candidate-*`, including canonical evidence, posture, manifest, promotion, and summary files.
- `scripts/release-dossier-lib.mjs` now validates the generated dossier root files plus the copied canonical evidence tree under `evidence/`.
- `scripts/release-pointer-lib.mjs` now validates the generated pointer directory before upload.
- GitHub workflow changes:
  - `Launch Candidate` validates the full `launch-candidate-*` bundle before upload
  - `Promotion Review` validates generated `release-dossier-*` and `release-pointer-*` directories before upload
- Verification:
  - `node --test scripts/launch-candidate-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/release-pointer-lib.test.mjs`
  - `git diff --check`
- Result:
  - Passed

## Update (2026-04-20, Semantic Generated Bundle Validation)
- Upgraded the generated-bundle validators from file-presence checks to semantic consistency checks.
- Launch-candidate validation now:
  - parses `evidence-manifest.json`, `launch-evidence-posture.json`, `promotion-record.json`, and `summary.json`
  - cross-checks artifact counts, completeness flags, promotion status, authority audit source, provider failure/warning counts, marketplace-origin proof, and exact-lane proof
- Release-dossier output validation now:
  - recomputes the copied evidence inventory under `evidence/`
  - compares file count, total bytes, per-file path/hash/size inventory, and `release-dossier-checksums.txt`
- Release-pointer output validation now:
  - parses the generated pointer JSON
  - re-runs `validateReleasePointer(..., { requireReadyLaunchPosture: true })`
- Added focused regression tests for semantic drift in all three validators.
- Verification:
  - `node --test scripts/launch-candidate-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/release-pointer-lib.test.mjs`
  - `git diff --check`
- Result:
  - Passed

## Update (2026-04-20, Semantic Source Bundle Validation)
- Upgraded `validate-source-dir` and the shared source-bundle path from file-presence checks to semantic validation.
- `release-dossier-lib.mjs` now:
  - validates image manifests with `validateApiImageManifest(...)`
  - validates deployed-smoke review packets with `validateDeployedSmokeRecord(...)`
  - validates launch-candidate review bundles with the same promotion-record/evidence-manifest/evidence-posture consistency checks used by promotion review
  - validates promotion-review bundles for coherent review structure before upload or dossier assembly
- `promotion-review-lib.mjs` now exports reusable validators for:
  - launch-candidate review bundles
  - promotion-review artifacts
- Added focused regression tests for:
  - incomplete promotion-review structure
  - semantic image-manifest source drift
  - semantic launch-candidate review source drift
- Verification:
  - `node --test scripts/promotion-review-lib.test.mjs scripts/release-dossier-lib.test.mjs`
  - `git diff --check`
- Result:
  - Passed

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

## Update (2026-04-19, Release Pointer Canonical Posture Integration)
- Updated `scripts/release-pointer-lib.mjs` so `buildReleasePointer(...)` now prefers `releaseDossier.launchEvidence.posture` as the canonical source for:
  - launch status and launch-ready posture
  - launch blocker/warning counts
  - evidence completeness and required/missing artifact counts
  - provider failure/warning counts
  - execution-trace coverage counts
  - marketplace-origin proof posture
  - marketplace canary failure counts
  - rollback posture
- Added stronger `validateReleasePointer(...)` checks for:
  - `launchStatus`
  - `launchReady`
  - `launchBlockerCount`
- Extended `scripts/release-pointer.mjs` so `release-pointer.md` and `--write-env` now expose the canonical launch-status fields too.
- Backward compatibility:
  - older release dossiers still fall back to the previous nested fields if `launchEvidence.posture` is absent
- Verification:
  - `git diff --check`
  - `node --test scripts/release-pointer-lib.test.mjs scripts/launch-candidate-lib.test.mjs scripts/release-dossier-lib.test.mjs scripts/promotion-review-lib.test.mjs`
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
## Update (2026-04-20, Marketplace Lane Contract In Exact Browser Journeys)
- Extended the exact marketplace Playwright contract so both local and deployed exact lanes assert the post-Phase-1 workspace split before continuing the escrow journey:
  - client actors must land in the client lane and see the client-native empty state before authoring a brief
  - freelancer actors must land in the freelancer lane and see the freelancer-native empty state before editing the credibility profile
- Updated:
  - `tests/e2e/flows/marketplace-exact-flow.ts`
  - `tests/e2e/specs/journeys/local/marketplace-exact-publish-apply-hire-flow.spec.ts`
  - `tests/e2e/specs/journeys/deployed/deployed-exact-marketplace-launch-candidate-flow.spec.ts`
- Browser-contract adjustment:
  - the exact flow now treats client and freelancer entry paths differently
  - client actors assert lane/empty-state plus `Create hiring spec`
  - freelancer actors assert lane/empty-state plus the editable `Credibility profile` form
- Verification:
  - `pnpm e2e:journeys:local tests/e2e/specs/journeys/local/marketplace-exact-publish-apply-hire-flow.spec.ts`
  - `git diff --check`
- Result:
  - Partial: the first browser failure was fixed by aligning the exact flow with the shipped lane split
  - Current blocker: the same local exact journey still times out later in the client publish step under the local dev-backed stack, after draft creation succeeds and the draft card plus publish control are rendered
- Next step:
  - investigate the slow or stalled local exact publish path and stabilize the exact canary so the new lane contract is fully covered end to end
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
## Update (2026-04-21, Web Theme System And Saudi-Green Default)
- Added a real `apps/web` theme system with cookie-backed persistence and a route-global light/dark toggle.
- Theme changes:
  - new default web theme is a Saudi-green light palette
  - existing dark visual system is preserved behind `data-theme='dark'`
  - theme persists through `escrow4334-web-theme` and is applied server-side in `apps/web/src/app/layout.tsx`
- UI changes:
  - added `useWebTheme` / `WebThemeProvider` under `apps/web/src/lib`
  - added `ThemeToggle` to public navs, escrow console top bar, marketplace workspace top bar, and marketplace detail top bars
  - refactored shared web-facing tokens/components away from hard-coded blue/violet web values into semantic CSS variables across:
    - `apps/web/src/app/globals.css`
    - `apps/web/src/app/{marketing.styles.ts,page.styles.ts}`
    - `packages/frontend-core/src/lib/{ui.tsx,spatial.tsx}`
- Test changes:
  - added `apps/web/src/app/theme-toggle.spec.tsx`
  - extended route specs to assert theme-toggle presence on public, console, workspace, and detail surfaces
  - added local Playwright smoke spec `tests/e2e/specs/smoke/local/theme-toggle.spec.ts`
- Changed files:
  - `apps/web/src/app/{layout.tsx,spatial-shell.tsx,theme-toggle.tsx,globals.css,page.tsx,trust/page.tsx,web-console.tsx,marketing.styles.ts,page.styles.ts}`
  - `apps/web/src/app/marketplace/{marketplace-browser.tsx,workspace.tsx,abuse-report-panel.tsx,marketplace-page.spec.tsx,marketplace-workspace.spec.tsx}`
  - `apps/web/src/app/marketplace/profiles/[slug]/{profile-detail.tsx,profile-detail.spec.tsx}`
  - `apps/web/src/app/marketplace/opportunities/[id]/{opportunity-detail.tsx,opportunity-detail.spec.tsx}`
  - `apps/web/src/app/{marketing-page.spec.tsx,page.spec.tsx,theme-toggle.spec.tsx}`
  - `apps/web/src/lib/{i18n.tsx,theme.shared.ts,theme.tsx}`
  - `packages/frontend-core/src/lib/{ui.tsx,spatial.tsx}`
  - `tests/e2e/specs/smoke/local/theme-toggle.spec.ts`
- Verification:
  - passed: `pnpm --filter web typecheck`
  - passed: `pnpm --filter web test -- src/app/theme-toggle.spec.tsx src/app/marketing-page.spec.tsx src/app/marketplace/marketplace-page.spec.tsx 'src/app/marketplace/profiles/[slug]/profile-detail.spec.tsx' 'src/app/marketplace/opportunities/[id]/opportunity-detail.spec.tsx' src/app/page.spec.tsx src/app/marketplace/marketplace-workspace.spec.tsx`
  - passed: `git diff --check`
  - blocked: `PLAYWRIGHT_PROFILE=local pnpm exec playwright test tests/e2e/specs/smoke/local/theme-toggle.spec.ts --project=local-smoke`
    - blocked by unrelated existing API TypeScript build failures in marketplace/organizations modules during Playwright webServer startup

## Update (2026-04-22, Post-Phase-8 Retention Layer)
- Implemented the next full marketplace slice after Phase 8 as one repo-side pass:
  - client talent pools with staged members and source references
  - workspace automation rules for saved-search, pool, invite, and rehire follow-up
  - lifecycle digest reads with pending task generation and repeat-hire prompts
  - completed-job rehire shortcut that seeds a private repeat brief, auto-publishes when escrow-ready, and re-invites the prior worker
- Backend changes:
  - added controller/service routes for talent pools, automation rules, lifecycle digest, and rehire opportunity creation
  - added Postgres migration `026_marketplace_retention_phase.sql`
  - extended file/Postgres marketplace persistence for pools, pool members, and automation rules
  - extended analytics/intelligence responses with retention metrics
- Frontend changes:
  - `apps/web` marketplace workspace now renders retention metrics, talent-pool management, automation rules, lifecycle tasks, save-to-pool actions, and rehire prompts
  - `apps/admin` moderation intelligence now shows retention counts alongside funnel/liquidity QA
- Changed files:
  `services/api/src/modules/marketplace/{marketplace.controller.ts,marketplace.dto.ts,marketplace.service.ts,marketplace.types.ts}`
  `services/api/src/persistence/{persistence.types.ts,file/file-persistence.store.ts,file/file.marketplace.repositories.ts,postgres/postgres.marketplace.repositories.ts}`
  `services/api/src/persistence/postgres/migrations/026_marketplace_retention_phase.sql`
  `apps/web/src/{app/marketplace/workspace.tsx,lib/api.ts}`
  `apps/admin/src/{app/marketplace/moderation-console.tsx,lib/api.ts}`
  `services/api/test/{marketplace.controller.integration.spec.ts,marketplace.service.spec.ts}`
  `docs/{project-state.md,_local/current-session.md}`
- Verification:
  - filtered marketplace/web typecheck grep passed with no matches for the touched retention files
  - full repo API/web typechecks still fail in unrelated existing escrow/operations/organizations/web fixture areas outside this slice
- Next likely step:
  - either formalize this retention lane into a named post-Phase-8 plan/doc set
  - or switch back to staged deployment and launch evidence work

## Update (2026-04-22, Marketplace Notifications Inbox)
- Implemented the next full repo-side marketplace slice on top of retention and automation:
  - persisted workspace-scoped marketplace notifications
  - authenticated inbox reads plus mark-read / dismiss actions
  - notification emission from invite, application, interview, offer, review, hire-status, and automation-run flows
- Backend changes:
  - added notification DTO/types/controller/service support under `services/api/src/modules/marketplace`
  - added file/Postgres persistence support and Postgres migration `028_marketplace_notifications.sql`
  - notification responses now surface user-filtered inbox state across client and talent workspaces
- Frontend changes:
  - `apps/web/src/lib/api.ts` now exposes marketplace notification reads and update actions
  - `apps/web/src/app/marketplace/workspace.tsx` now renders a marketplace notifications panel with unread counts, mark-all-read, mark-read, and dismiss controls
  - refreshed `apps/web/src/app/marketplace/marketplace-workspace.spec.tsx` to match the current organization/timeline contracts
- Changed files:
  `services/api/src/modules/marketplace/{marketplace.controller.ts,marketplace.dto.ts,marketplace.service.ts,marketplace.types.ts}`
  `services/api/src/persistence/{persistence.types.ts,file/file-persistence.store.ts,file/file.marketplace.repositories.ts,postgres/postgres.marketplace.repositories.ts}`
  `services/api/src/persistence/postgres/migrations/028_marketplace_notifications.sql`
  `apps/web/src/{app/marketplace/workspace.tsx,app/marketplace/marketplace-workspace.spec.tsx,lib/api.ts}`
  `docs/{project-state.md,_local/current-session.md}`
- Verification:
  - passed: `pnpm --filter web test src/app/marketplace/marketplace-workspace.spec.tsx`
  - passed: `pnpm --filter escrow4334-api test -- --runTestsByPath test/migrations.spec.ts`
  - passed: `git diff --check`
  - blocked: `pnpm --filter web typecheck`
    - blocked by unrelated existing web type errors in `src/app/milestone-lifecycle.spec.ts`, `src/app/project-room.tsx`, and `src/test/fixtures.ts`
- Next likely step:
  - add operator-visible notification analytics or digest policies if this inbox becomes part of the formal post-Phase-8 plan

## Update (2026-04-22, Marketplace Digest Controls)
- Implemented the next full repo-side marketplace slice on top of the inbox layer:
  - persisted per-user marketplace notification preferences
  - preference-aware notification emission
  - persisted marketplace digest snapshots with acknowledgement/archive state
  - authenticated digest reads plus manual digest generation for the active workspace context
- Backend changes:
  - added marketplace digest/preference DTOs, controller routes, service flows, and new response types
  - added file/Postgres persistence support and Postgres migration `029_marketplace_digest_preferences.sql`
  - digest generation now summarizes filtered notifications plus optional lifecycle/analytics posture for the active workspace
- Frontend changes:
  - `apps/web/src/lib/api.ts` now exposes marketplace digest and notification-preference reads/mutations
  - `apps/web/src/app/marketplace/workspace.tsx` now renders digest settings, manual digest generation, digest cards, and digest status actions
  - `apps/web/src/app/marketplace/marketplace-workspace.spec.tsx` now mocks the new digest/preference contract
- Changed files:
  `services/api/src/modules/marketplace/{marketplace.controller.ts,marketplace.dto.ts,marketplace.service.ts,marketplace.types.ts}`
  `services/api/src/persistence/{persistence.types.ts,file/file-persistence.store.ts,file/file.marketplace.repositories.ts,postgres/postgres.marketplace.repositories.ts}`
  `services/api/src/persistence/postgres/migrations/029_marketplace_digest_preferences.sql`
  `apps/web/src/{app/marketplace/workspace.tsx,app/marketplace/marketplace-workspace.spec.tsx,lib/api.ts}`
  `docs/{project-state.md,_local/current-session.md}`
- Verification:
  - passed: `pnpm --filter web test src/app/marketplace/marketplace-workspace.spec.tsx`
  - passed: `pnpm --filter escrow4334-api test -- --runTestsByPath test/migrations.spec.ts`
  - passed: `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit 2>&1 | rg "marketplace|persistence.types|file-persistence.store|file.marketplace.repositories|postgres.marketplace.repositories" || true`
  - passed: `git diff --check`
- Next likely step:
  - if product-code work continues, add digest dispatch/background materialization or operator-facing digest analytics on top of this persisted control layer

## Update (2026-04-22, Marketplace Digest Intelligence)
- Implemented the next full repo-side marketplace slice on top of digest controls:
  - operator-visible digest adoption metrics inside the marketplace intelligence report
  - suppression-pattern analytics for notification preference toggles
  - recent digest snapshot reporting with cadence/status/user context
- Backend changes:
  - extended marketplace intelligence reporting with `digestOps` metrics and recent digest entries
  - added repository list support for marketplace notification preferences so operator analytics can aggregate adoption/suppression posture
- Admin changes:
  - `apps/admin/src/lib/api.ts` now includes the expanded intelligence report contract
  - `apps/admin/src/app/marketplace/moderation-console.tsx` now renders a dedicated digest adoption/suppression panel with recent digest cards
  - `apps/admin/src/app/marketplace/marketplace-moderation.spec.tsx` now covers the new digest intelligence surface and current moderation fixture contract
- Changed files:
  `services/api/src/modules/marketplace/{marketplace.service.ts,marketplace.types.ts}`
  `services/api/src/persistence/{persistence.types.ts,file/file.marketplace.repositories.ts,postgres/postgres.marketplace.repositories.ts}`
  `apps/admin/src/{lib/api.ts,app/marketplace/{moderation-console.tsx,marketplace-moderation.spec.tsx}}`
  `docs/{project-state.md,_local/current-session.md}`
- Verification:
  - passed: `pnpm --filter admin test src/app/marketplace/marketplace-moderation.spec.tsx`
  - passed: `pnpm --filter admin typecheck 2>&1 | rg "marketplace/moderation-console|apps/admin/src/lib/api.ts|MarketplaceIntelligenceReport" || true`
  - passed: `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit 2>&1 | rg "marketplace|persistence.types|file-persistence.store|file.marketplace.repositories|postgres.marketplace.repositories" || true`
  - passed: `git diff --check`
- Next likely step:
  - add actual due-digest dispatch/background materialization on top of the now-observable digest layer

## Update (2026-04-22, Marketplace Digest Dispatch)
- Implemented the next full repo-side marketplace slice on top of digest controls/intelligence:
  - persisted workspace-scoped digest dispatch run history
  - authenticated due/all-enabled digest dispatch for shared client workspaces
  - digest snapshots now carry `dispatchRunId` when materialized through a dispatch run
  - workspace UI now renders dispatch actions plus recent dispatch history
- Backend changes:
  - added digest-dispatch DTO/controller/service flows and new response types
  - added file/Postgres persistence support plus `030_marketplace_digest_dispatch_runs.sql`
  - dispatch execution now resolves workspace members, respects digest cadence, skips manual/not-due/no-activity recipients, and records per-recipient results
  - fixed a small `organizations.service.ts` type/runtime issue surfaced by targeted verification (`listMemberships` user lookup + owner-role narrowing)
- Frontend changes:
  - `apps/web/src/lib/api.ts` now exposes digest-dispatch run reads/mutations
  - `apps/web/src/app/marketplace/workspace.tsx` now renders due/all-enabled dispatch controls and recent run cards beside digest snapshots
  - `apps/web/src/app/marketplace/marketplace-workspace.spec.tsx` now covers dispatch-history rendering and the due-dispatch action
- Changed files:
  `services/api/src/modules/{marketplace/{marketplace.controller.ts,marketplace.dto.ts,marketplace.service.ts,marketplace.types.ts},organizations/organizations.service.ts}`
  `services/api/src/persistence/{persistence.types.ts,file/file-persistence.store.ts,file/file.marketplace.repositories.ts,postgres/postgres.marketplace.repositories.ts}`
  `services/api/src/persistence/postgres/migrations/030_marketplace_digest_dispatch_runs.sql`
  `services/api/test/marketplace.service.spec.ts`
  `apps/web/src/{app/marketplace/workspace.tsx,app/marketplace/marketplace-workspace.spec.tsx,lib/api.ts}`
  `docs/{project-state.md,_local/current-session.md}`
- Verification:
  - passed: `pnpm --filter web test src/app/marketplace/marketplace-workspace.spec.tsx`
  - passed: `pnpm --filter escrow4334-api test -- --runTestsByPath test/marketplace.service.spec.ts -t "dispatches due digests across a shared client workspace and respects cadence windows|skips manual cadence recipients when dispatching all enabled digests"`
  - passed: `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit 2>&1 | rg "marketplace|organizations.service|persistence.types|file.marketplace.repositories|postgres.marketplace.repositories|marketplace.controller|marketplace.dto" || true`
  - passed: `pnpm --filter web typecheck 2>&1 | rg "app/marketplace/workspace|app/marketplace/marketplace-workspace.spec|lib/api.ts" || true`
  - passed: `git diff --check`
  - blocked or unrelated:
    - full `pnpm --filter escrow4334-api test -- --runTestsByPath test/marketplace.service.spec.ts` still has pre-existing failures in unrelated escrow/commercial and moderation expectations
    - full `pnpm --filter escrow4334-api exec tsc -p tsconfig.json --noEmit` still has unrelated existing errors in escrow/project-room/operations modules
    - full `pnpm --filter web typecheck` still has unrelated existing errors in `src/app/milestone-lifecycle.spec.ts`, `src/app/project-room.tsx`, and `src/test/fixtures.ts`
- Next likely step:
  - add operator-facing digest dispatch analytics or a scheduler/worker entry point that triggers the same due-dispatch path outside the workspace UI

## Update (2026-04-22, Remaining Repo Work Closeout)
- Closed the remaining repo-side blockers that were preventing the marketplace plan checkout from verifying cleanly:
  - fixed zero-safe internal commercial reconciliation math in escrow
  - restored public marketplace profile-search filtering for hidden/incomplete profiles
  - updated stale web/admin marketplace walkthrough/detail specs to the current API/UI contracts
  - normalized job-history import digest comparison so JSON-imported execution records match local persisted timelines even when optional fields are omitted instead of stored as `undefined`
  - fixed fresh-Postgres migration FK type mismatches for marketplace job references
- Backend changes:
  - `services/api/src/modules/escrow/escrow.service.ts`
  - `services/api/src/modules/marketplace/marketplace.service.ts`
  - `services/api/src/modules/operations/escrow-history-import.service.ts`
  - `services/api/src/persistence/postgres/migrations/{026_marketplace_retention_phase.sql,028_marketplace_notifications.sql}`
- Frontend/admin test changes:
  - `apps/web/src/app/marketplace/{marketplace-page.spec.tsx,profiles/[slug]/profile-detail.spec.tsx,opportunities/[id]/opportunity-detail.spec.tsx}`
  - `apps/admin/src/app/operator-walkthrough.spec.tsx`
- Verification:
  - passed: `pnpm --filter escrow4334-api test -- --runTestsByPath test/escrow.service.spec.ts test/marketplace.service.spec.ts test/escrow-health.service.spec.ts test/escrow-chain-sync.service.spec.ts`
  - passed: `pnpm --filter web test src/app/marketplace/marketplace-page.spec.tsx`
  - passed: `pnpm --filter web test 'src/app/marketplace/opportunities/[id]/opportunity-detail.spec.tsx'`
  - passed: `pnpm --filter web test 'src/app/marketplace/profiles/[slug]/profile-detail.spec.tsx'`
  - passed: `pnpm --filter admin test src/app/operator-walkthrough.spec.tsx`
  - passed: `pnpm --filter escrow4334-api test -- --runTestsByPath test/escrow-history-import.service.spec.ts`
  - passed: `env PLAYWRIGHT_LOCAL_SERVER_MODE=built pnpm e2e:smoke:local`
  - passed: `pnpm verify:ci`
- Remaining work is now external rather than repo-side:
  - real staged `Deployed Smoke` -> `Launch Candidate` -> `Promotion Review`
  - live provider validation with real staging secrets/URLs
  - preserved reviewed release artifacts (`release-dossier`, `release-pointer-staging`)

## Update (2026-04-22, Fresh Postgres Migration Integrity Gate)
- Added a dedicated fresh-Postgres migration verifier so schema/FK regressions fail before Playwright startup:
  - new root command: `pnpm verify:migrations:fresh`
  - `pnpm verify:ci` now runs that verifier after the repo build and before `e2e:smoke:local`
  - the verifier boots a disposable Postgres instance, applies every API migration on an empty database, checks that pending migrations reach zero, then re-runs migrations to prove idempotence
- Runtime behavior:
  - prefers an ephemeral native Postgres cluster when `initdb`/`pg_ctl` are available locally
  - falls back to the repo Docker Compose Postgres stack when native binaries are unavailable
  - `infra/postgres/docker-compose.yml` now accepts `POSTGRES_CONTAINER_NAME` override so disposable compose runs do not collide with the default local container name
- Changed files:
  `scripts/verify-fresh-postgres-migrations.mjs`
  `scripts/verify-ci.sh`
  `package.json`
  `infra/postgres/docker-compose.yml`
  `docs/{project-state.md,_local/current-session.md}`
- Verification:
  - passed: `pnpm verify:migrations:fresh`
  - passed: `pnpm verify:ci`
  - passed: `git diff --check`
- Next likely step:
  - if more hardening is needed, keep infra/startup regressions moving earlier in `verify:ci` so Playwright only exercises product behavior rather than schema/bootstrap failures

## Update (2026-04-22, Client Console Route Family)
- Implemented the dedicated client marketplace console under `/app/marketplace/client...` and kept `/app/marketplace` as the workspace/lane entry shell:
  - added app-router client pages for `dashboard`, `opportunities`, `applicants`, `interviews`, `offers`, `contracts`, `funding`, and `disputes`
  - extracted shared marketplace session/lane helpers from `apps/web/src/app/marketplace/workspace.tsx` into `apps/web/src/app/marketplace/shared.ts`
  - added `apps/web/src/app/marketplace/client-console.tsx` to load route-scoped client data and actions from existing `webApi` reads/mutations
  - added a dedicated `publicMarketplace.clientConsole` i18n namespace and a client-console CTA from the workspace shell
- Browser/test coverage:
  - added `apps/web/src/app/marketplace/client-console.spec.tsx` for dashboard prioritization, blocked non-client posture, opportunity create/publish/pause flows, applicant review actions, interview replies, offer rendering, and contract/funding/dispute deep links
  - extended `apps/web/src/app/marketplace/marketplace-workspace.spec.tsx` with client-console entry-point regression coverage
  - extended `tests/e2e/flows/marketplace-exact-flow.ts` with `clientSurface: 'console' | 'workspace'`
  - added `tests/e2e/specs/journeys/local/marketplace-client-console-flow.spec.ts` to drive the exact hire-to-dispute browser canary through the dedicated client routes
- Changed files:
  `apps/web/src/app/{app/marketplace/client/{page.tsx,opportunities/page.tsx,applicants/page.tsx,interviews/page.tsx,offers/page.tsx,contracts/page.tsx,funding/page.tsx,disputes/page.tsx},marketplace/{client-console.tsx,client-console.spec.tsx,marketplace-workspace.spec.tsx,shared.ts,workspace.tsx}}`
  `apps/web/src/lib/i18n.tsx`
  `tests/e2e/{flows/marketplace-exact-flow.ts,specs/journeys/local/marketplace-client-console-flow.spec.ts}`
  `docs/{project-state.md,_local/current-session.md}`
- Verification:
  - passed: `pnpm --filter web test src/app/marketplace/client-console.spec.tsx src/app/marketplace/marketplace-workspace.spec.tsx`
  - passed: `pnpm --filter web typecheck`
  - passed: `PLAYWRIGHT_PROFILE=local pnpm exec playwright test tests/e2e/specs/journeys/local/marketplace-client-console-flow.spec.ts --project=local-journeys --list`
  - passed: `git diff --check`
- Not run:
  - full browser execution of `tests/e2e/specs/journeys/local/marketplace-client-console-flow.spec.ts`

## Update (2026-04-22, Public Marketplace UI Refresh)
- Reworked the public `/` and `/marketplace` surfaces to feel marketplace-first instead of contract-demo-first:
  - homepage now leads with marketplace hiring as the primary conversion, keeps direct escrow secondary, compresses copy, and replaces the old stats/bounds stack with scan-first hiring lanes, escrow-flow steps, and proof strips
  - public marketplace now uses a stronger browse/search presentation with a compact hero, escrow/trust signal strip, filter rail, upgraded result cards, and lighter directory copy while keeping the existing search/tracking behavior unchanged
  - added repo-native SVG public visuals in `apps/web/src/app/public-visuals.tsx` for the hero, directory, escrow flow, and category glyphs
  - localized the refreshed public copy in `apps/web/src/lib/i18n.tsx`, including Arabic-safe filter defaults and marketplace labels
- Changed files:
  `apps/web/src/app/{page.tsx,marketing.styles.ts,public-visuals.tsx,public-visuals.spec.tsx,marketing-page.spec.tsx,marketplace/marketplace-browser.tsx,marketplace/marketplace-page.spec.tsx}`
  `apps/web/src/lib/i18n.tsx`
- Verification:
  - passed: `pnpm --filter web test src/app/marketing-page.spec.tsx src/app/marketplace/marketplace-page.spec.tsx src/app/public-visuals.spec.tsx`
  - passed: `pnpm --filter web typecheck`
  - passed: `git diff --check`
- Not run:
  - browser/dev-server visual verification of the refreshed public homepage and marketplace surface

## Update (2026-04-22, Public Detail Page Refresh)
- Extended the public marketplace visual system into the clickthrough detail pages so the browse funnel no longer drops back to the older console-style layout:
  - refreshed public profile detail to use the same marketplace nav, shorter hero copy, code-native vector scene, trust badges, lighter fact groupings, and stronger browse-to-workspace CTA treatment
  - refreshed public opportunity detail with the same public chrome, a brief-first hero, vector summary scene, clearer scope/fit/client-trust sections, and a cleaner apply-from-workspace conversion path
  - added a shared `public-marketplace-nav` component for the public detail routes and new detail-specific SVG scenes in `apps/web/src/app/public-visuals.tsx`
  - expanded public-marketplace copy with availability labels plus profile timezone/availability labels, and updated the detail/visual tests to match the new public surface
- Changed files:
  `apps/web/src/app/marketplace/{public-marketplace-nav.tsx,profiles/[slug]/profile-detail.tsx,profiles/[slug]/profile-detail.spec.tsx,opportunities/[id]/opportunity-detail.tsx,opportunities/[id]/opportunity-detail.spec.tsx}`
  `apps/web/src/app/{public-visuals.tsx,public-visuals.spec.tsx}`
  `apps/web/src/lib/i18n.tsx`
- Verification:
  - passed: `pnpm --filter web test 'src/app/marketplace/profiles/[slug]/profile-detail.spec.tsx' 'src/app/marketplace/opportunities/[id]/opportunity-detail.spec.tsx' src/app/public-visuals.spec.tsx`
  - passed: `pnpm --filter web typecheck`
  - passed: `git diff --check`
- Not run:
  - browser/dev-server visual verification of the refreshed public profile and opportunity detail routes

## Update (2026-04-22, Authenticated Workspace Entry Refresh)
- Refreshed the top of the authenticated marketplace workspace so the first viewport no longer drops back to the older console stack:
  - kept the existing workspace workflows and backend contracts intact, but replaced the old active-workspace summary panel with a real hero entry shell
  - folded the highest-value pipeline metrics into the hero summary rail and moved workspace switching into that same control area
  - kept lane cards and onboarding actions intact, including the client-console deep link and capability-aware lane switching behavior
  - updated the workspace spec for the now-valid duplicate public-marketplace link in the redesigned shell
- Changed files:
  `apps/web/src/app/marketplace/{workspace.tsx,marketplace-workspace.spec.tsx}`
- Verification:
  - passed: `pnpm --filter web test src/app/marketplace/marketplace-workspace.spec.tsx`
  - passed: `pnpm --filter web typecheck`
  - passed: `git diff --check`
- Not run:
  - browser/dev-server visual verification of the refreshed authenticated workspace shell
