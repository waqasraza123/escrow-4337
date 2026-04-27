# Mobile Offline Recovery V1

## Scope

This note documents the first production-grade mobile offline and recovery slice for `apps/mobile`.

The slice is intentionally native-client focused. It does not introduce a durable offline mutation queue, local write-ahead log, or background sync worker. It gives the app a truthful network source of truth, pauses query refetch behavior while the device is known offline, checks whether the escrow API is reachable separately from device connectivity, blocks high-risk mutations before they enter API or wallet flows, and exposes recovery posture in the surfaces where users are most likely to need it.

## Architecture

`apps/mobile/src/providers/network.tsx` owns the mobile network boundary.

- Uses `@react-native-community/netinfo` as the native connectivity signal.
- Stores connection initialization, transport type, internet reachability, last update time, and the configured API base URL.
- Stores API reachability state with status, check time, latency, and the latest probe error.
- Exposes `useMobileNetwork()` for UI, API probes, and mutation guards.
- Wires NetInfo state into TanStack Query through `onlineManager.setOnline(...)`.
- Treats explicit `isConnected === false` or `isInternetReachable === false` as offline.
- Treats unknown reachability as online for query purposes so app startup is not blocked by platforms that resolve reachability lazily.
- Probes `GET /operations/runtime-profile` with a bounded timeout when connectivity is available.
- Ignores stale probe results so reconnect/manual-refresh races cannot overwrite newer posture.

`apps/mobile/src/providers/root.tsx` mounts `MobileNetworkProvider` above `QueryProvider`. This ordering lets the network provider update React Query online state before screens issue normal query traffic.

`apps/mobile/src/features/network/MobileRecoveryRefreshBridge.tsx` mounts inside `QueryProvider` and watches network/API recovery. After the device or API moves from offline, skipped, or unreachable into a reachable API probe state, it invalidates the mobile read-query families that should replace stale snapshots: runtime profile, jobs, contractor join readiness, project room, marketplace job reviews, and marketplace reads. A short throttle prevents duplicate invalidation bursts during NetInfo/probe races. The same bridge also listens for app foreground return and runs a bounded `network.refresh()` when API posture is unavailable or stale, so background-to-foreground recovery does not depend on NetInfo emitting a fresh event.

`apps/mobile/src/features/network/useNetworkActionGate.ts` is the screen-level mutation gate. It wraps `useMobileNetwork()` and exposes:

- `actionBlocked`: `true` when the device is known offline or the escrow API is known unreachable
- `requireOnline(action)`: the authoritative guard used inside mutation functions
- `blockedReason`, `offline`, and `apiUnavailable`: UI-friendly status values for buttons and copy

Screens should use this hook for authenticated writes instead of duplicating `network.offline || apiReachability.status === 'unreachable'`.

`apps/mobile/src/features/network/NetworkActionNotice.tsx` is the shared blocked-action notice. It renders only when `useNetworkActionGate().actionBlocked` is true and gives users action-specific recovery copy next to disabled mutation controls.

`apps/mobile/src/features/offline/offlineSnapshots.ts` owns the AsyncStorage storage contract for read-only snapshots: resource/user-scoped cache-key construction, envelope reads/writes, and snapshot clearing by user id or whole namespace.

`apps/mobile/src/features/offline/useOfflineSnapshot.tsx` is the shared React boundary. It persists selected authenticated read responses through the storage helper, hydrates them on later app opens, and exposes `OfflineSnapshotNotice` for clear stale-data copy.

`apps/mobile/src/features/offline/OfflineSnapshotRetentionBridge.tsx` mounts at the root provider layer. It runs best-effort namespace retention once on app startup and again after foreground return when the last retention run is older than six hours. It does not block screen rendering, query execution, or session restore.

`apps/mobile/src/features/session/MobileSessionRecoveryBridge.tsx` mounts inside `SessionProvider`. When the app is running from a secure cached profile and API reachability recovers to `reachable`, it throttles and attempts a live session refresh, then invalidates query caches after a successful refresh. Refresh failures stay non-destructive; the cached-profile notice remains visible until a live session refresh succeeds or the user signs out.

`apps/mobile/src/features/offline/mobileRecoveryEvidence.ts` owns the mobile recovery evidence report contract. It assembles sanitized JSON reports from controlled evidence context, scenario-specific posture checks, network/API posture, cached-session state, wallet and workspace counts, capability booleans, and offline snapshot inventory, attaches report review manifests with deterministic non-secret fingerprints and privacy-boundary metadata, stores recent reports in AsyncStorage, summarizes scenario coverage across the local ledger, derives the next missing scenario capture plan, attaches scenario-guide metadata, builds a coverage bundle from the latest readable exact saved report for each scenario, includes explicit bundle readiness metadata plus the capture plan and bundle review manifest, supports reading a saved report by id for exact re-share, and enforces bounded local retention. Reports intentionally exclude access tokens, refresh tokens, email addresses, user ids, workspace labels, organization names, wallet addresses, free-form reviewer notes, and URL credentials or query strings.

`apps/mobile/src/features/offline/MobileRecoveryEvidenceCard.tsx` is the manual evidence boundary for real-device checks. It captures controlled scenario and outcome values, creates one sanitized report per share action, saves it locally before invoking the native share sheet, displays an animated compact readiness/progress panel, saved-report count, scenario coverage, next-capture guidance with expected posture, bundle readiness, staged posture and scenario status pills, newest report timestamp, newest pass/warn/fail check counts, and newest report fingerprint, supports sharing a scenario coverage bundle, supports re-sharing the latest saved report without regenerating it, and exposes a clear control for the local evidence ledger.

## UI Surface

`apps/mobile/src/features/network/NetworkStatusCard.tsx` is the shared status and recovery surface.

It displays:

- initialized network posture: checking, online, or offline
- native transport type
- configured API target
- API reachability and probe latency
- latest API probe failure, when the API is known unreachable
- internet reachability state
- last NetInfo refresh time in expanded mode
- last API probe time in expanded mode
- a manual refresh action that refreshes NetInfo state and invalidates query caches

Current placements:

- Home tab, compact mode, near runtime posture
- Account tab, expanded mode for signed-in users
- Sign-in screen, compact mode before OTP entry

The card is intentionally diagnostic but user-facing. It separates device connectivity from backend reachability so a backend outage is not presented as a local airplane-mode problem.

`apps/mobile/src/features/offline/MobileRecoveryEvidenceCard.tsx` is shown on the Account tab for signed-in users. It lets a reviewer pick a scenario and outcome, then save and export a comparable recovery report during iOS or Android manual evidence runs after toggling airplane mode, restoring API reachability, returning from background, or exercising wallet deep-link recovery.

## Mutation Guarding

The network provider exposes:

```ts
requireOnline(action?: string): void
```

The helper throws a user-safe error when the device is known offline or when the escrow API is known unreachable from the most recent probe. Screens and providers call this before starting high-risk or confusing actions:

- OTP code request
- OTP verification
- workspace switching
- marketplace opportunity application submission
- direct contract creation and initial milestone commit
- contract funding
- contractor readiness re-check and join execution
- direct milestone commit
- worker milestone delivery
- client milestone release
- client milestone dispute
- project-room milestone submission
- project-room revision request
- project-room submission approval
- approved-submission onchain delivery
- project-room message posting
- participant-visible support case opening and reply posting
- post-contract marketplace review submission
- wallet connector opening
- wallet SIWE challenge creation and signature verification
- smart-account provisioning
- default wallet update

This keeps offline and API-outage failures close to the initiating action and avoids sending users into wallet approval or OTP flows that cannot complete.

Mutation surfaces also disable their primary action buttons while the device is known offline or the API is known unreachable. The provider guard remains the authoritative protection because programmatic mutation calls, stale buttons, and fast network changes can still happen between render and press.

Current guarded mobile write surfaces:

- `apps/mobile/src/app/(auth)/sign-in.tsx`
- `apps/mobile/src/app/(tabs)/marketplace.tsx`
- `apps/mobile/src/app/marketplace/opportunity/[id].tsx`
- `apps/mobile/src/app/contracts/new.tsx`
- `apps/mobile/src/app/contracts/join.tsx`
- `apps/mobile/src/app/contracts/[id].tsx`
- `apps/mobile/src/app/contracts/[id]/room.tsx`
- `apps/mobile/src/features/wallet/MobileWalletSetupCard.tsx`
- `apps/mobile/src/providers/wallet.tsx`

Current blocked-action notice placements:

- sign-in
- wallet setup and default wallet changes
- marketplace workspace switching and opportunity applications
- contract creation, funding, contractor join, milestone commit, and milestone actions
- project-room submission, review, approved delivery, messages, support, and marketplace review capture

## Query Behavior

TanStack Query online state is derived from native connectivity, not backend reachability. When NetInfo reports the device as offline or internet unreachable, query refetches pause through React Query's built-in online manager behavior. If the device is online but the API probe fails, normal queries remain unpaused and can surface endpoint-specific errors while high-risk guarded actions stop early with clearer recovery copy.

The implementation does not persist the full React Query cache across app restarts. Secure session restore remains owned by the existing session provider; most server state remains a normal React Query cache.

## Session Restore

`apps/mobile/src/providers/session.tsx` stores access and refresh tokens in native SecureStore. It now also stores the last successful `UserProfile` response as a versioned SecureStore profile snapshot. The profile snapshot contains no access or refresh token, but it does include the identity/workspace/wallet summary needed to keep account-scoped offline reads coherent during an offline or API-unreachable app start.

Restore behavior:

- read stored access token, refresh token, and cached profile snapshot together
- try `GET /auth/me` with the stored access token first
- if the access token is terminally invalid and a refresh token exists, rotate the refresh token before clearing the session
- after successful sign-in, refresh, or profile read, replace the cached profile snapshot
- if profile/refresh calls fail for a non-terminal outage and a profile snapshot exists, keep the stored tokens and hydrate `user` from the secure profile snapshot
- expose `restoredFromProfileSnapshot` and `profileSnapshotCachedAt` through `useSession()`
- Home and Account surface a cached-profile session notice with the saved timestamp and a manual session refresh action
- once API reachability recovers, the session recovery bridge attempts the same live refresh automatically and invalidates queries after success
- if restore fails without a usable profile snapshot, clear tokens, clear the cached profile snapshot, clear offline snapshots, and return to signed-out state
- sign-out clears tokens, the profile snapshot, and account-scoped offline snapshots before best-effort logout

This keeps offline contract/project-room/marketplace snapshots usable after a cold offline start without treating every backend outage as a revoked session.

Selected high-value read surfaces now persist explicit offline snapshots:

- contracts list and contract detail source data from `api.listJobs`
- project-room state from `api.getProjectRoom`
- marketplace review state from `api.getMarketplaceJobReviews`
- public marketplace talent and opportunity search responses
- public marketplace talent profile and opportunity detail responses
- authenticated marketplace analytics, application posture, client opportunity posture, and notifications

Snapshots are intentionally read-only. When a screen is rendered from snapshot data rather than live query data, it shows an `Offline snapshot` notice with the saved timestamp and disables write actions that depend on that stale state. Fresh successful query responses replace the previous snapshot. Snapshot keys use the authenticated user id and resource id, never access or refresh tokens.

Snapshot retention rules:

- snapshots expire after 7 days
- each account or public snapshot scope retains at most 80 newest entries
- each successful snapshot write triggers best-effort retention pruning for that scope
- app startup and throttled foreground return trigger best-effort retention pruning across the snapshot namespace
- invalid or unreadable snapshot envelopes are removed by the same retention pass
- Account displays the current snapshot inventory, approximate namespace size, public snapshot count, account-scoped snapshot count, newest saved timestamp, and expired-waiting-cleanup count

Snapshot lifecycle rules:

- sign-out clears saved snapshots for the signed-out user
- failed session restore with no usable secure profile snapshot clears the snapshot namespace before returning to signed-out state
- Account exposes a signed-in "Clear offline data" control that removes the full offline snapshot namespace, including public marketplace snapshots
- snapshot clearing only targets keys under `escrow4337.offlineSnapshot.v1`, leaving locale, theme, WalletConnect, and secure token storage untouched

## Recovery Evidence

The Account recovery evidence card uses a separate AsyncStorage namespace, `escrow4337.mobileRecoveryEvidence.v1`, for sanitized manual-run reports. This namespace is intentionally separate from read-only offline snapshots because evidence reports are operational proof artifacts, not cached product data.

The evidence export audit uses `escrow4337.mobileRecoveryEvidenceAudit.v1`. Audit entries are bounded local metadata records for export actions only. They include action type, timestamps, report id/scenario/outcome where applicable, bundle readiness counts, and compact bundle review-decision summaries for bundle share/cancel events; they do not include report bodies, tokens, email addresses, wallet addresses, workspace labels, organization names, URL credentials, URL query strings, private keys, or free-form reviewer notes.

Evidence report retention rules:

- each share action saves the report locally before opening the native share sheet
- each report includes a controlled scenario: offline start, API recovery, wallet return, or project room
- each report includes a controlled outcome: observed, passed, or failed
- each report includes scenario-specific computed checks with `pass`, `warn`, or `fail` status
- each new report includes an `artifact` review manifest with schema, generated timestamp, scenario/outcome summary, check counts, reviewer checklist, privacy boundary, and deterministic `fnv1a32-canonical-json` fingerprint over the report body without the artifact block
- each coverage bundle includes a `ledgerReview` with sanitized retained report summaries, scenario fingerprint coverage, bounded export-audit trail metadata, privacy boundary, reviewer checklist, and deterministic `fnv1a32-canonical-json` fingerprint over the ledger review body without the fingerprint field
- each coverage bundle includes a `reviewManifest` with schema, readiness, retention constants, partial reasons, privacy boundary, reviewer checklist, scenario artifact descriptors, `ledgerReviewFingerprint`, and deterministic `fnv1a32-canonical-json` fingerprint over the manifest body without the fingerprint field
- each coverage bundle includes a `verification` block that recomputes report artifact, ledger review, review manifest, manifest-to-ledger, and scenario-artifact links before export; `verification.valid` is true only when every included fingerprint link is valid
- each coverage bundle includes a `reviewDecision` block with status, hard blockers, advisory warnings, reviewer next actions, and a compact summary over readiness, verification, captured outcomes, missing scenarios, and unreadable scenarios
- the app retains the newest 12 reports
- the app retains the newest 24 export-audit events
- reports expire after 30 days
- export-audit events expire after 30 days
- malformed report envelopes are pruned by the same retention pass
- malformed audit envelopes are pruned by the audit retention pass
- Account displays a readiness/progress panel, saved-report count, export-audit count, total scenario coverage, next missing scenario, expected posture for that capture, bundle readiness, passing/failing scenario counts, compact session/API/snapshot/profile posture pills, per-scenario latest outcome pills, pre-share bundle review decision, bundle verification posture, bundle fingerprint, newest report scenario, newest report outcome, newest report timestamp, newest check counts, newest report fingerprint, and latest audit action
- Account can share a coverage bundle containing the current coverage summary, explicit readiness metadata, ledger review, review manifest, and the latest readable exact saved report for each scenario that has one
- Account requires explicit confirmation before sharing any bundle whose `reviewDecision.status` is not `ready`; the confirmation lists missing scenarios, unreadable scenarios, blockers, warnings, and next actions before the native share sheet opens
- Account can re-share the latest saved report by id without generating a new report or mutating the existing evidence
- Account exposes a "Clear saved evidence" action that removes the saved recovery reports and export-audit namespace

Coverage semantics are ledger-local. A scenario is counted as captured once at least one saved report exists for that scenario. The capture plan uses that same local coverage summary to identify the first missing scenario in the supported order and lets Account select it with the recommended `observed` outcome. Scenario guides define each scenario title, expected posture, capture goal, and review focus so exported bundles preserve reviewer intent without free-form notes. Passing and failing scenario counts are based on reviewer-controlled outcomes, not computed checks. Computed checks remain attached to individual reports so reviewers can compare objective posture against the reviewer outcome before preserving the evidence externally. Coverage bundles add a `generatedAt` timestamp, the current capture plan, a `readiness` block, a `ledgerReview`, a `reviewManifest`, a `verification` block, and a `reviewDecision` block; they do not regenerate or mutate the included reports. A bundle is ready only when every supported scenario has a readable saved report at bundle-generation time. Bundles whose review decision is `partial`, `blocked`, or `ready_with_warnings` can still be shared, but Account requires a confirmation prompt before opening the native share sheet and that prompt lists missing scenarios, unreadable scenarios, blockers, warnings, and next actions so the review risk is explicit before export.

Review-manifest and ledger-review fingerprints are deterministic review checksums, not cryptographic signatures or tamper-proof proofs. They exist to make manual exported artifacts easier to compare across screenshots, saved JSON, issue comments, and reviewer notes. Report fingerprints are computed from canonical JSON after removing the `artifact` block. Ledger-review fingerprints are computed from canonical ledger-review content before the fingerprint field is attached. Bundle manifest fingerprints are computed from canonical manifest content before the fingerprint field is attached and include `ledgerReviewFingerprint` so reviewers can compare the two sections. Legacy saved reports that do not have an `artifact` block still receive a derived display fingerprint from the same canonical report-body algorithm when listed locally.

Bundle verification is self-contained and deterministic. `verification.checks` covers the ledger-review checksum, the bundle review-manifest checksum, and the review-manifest link to the included ledger review. `verification.reportChecks` covers each included report with an artifact block. `verification.scenarioArtifactChecks` compares each review-manifest scenario artifact descriptor with the included report for that scenario. Missing checks usually indicate a legacy report or a partial bundle; invalid checks indicate that the exported JSON sections no longer match their embedded fingerprints. Verification does not prove operating-system share completion and does not make the artifact tamper-proof.

Bundle review decisions translate readiness and verification into reviewer action. `reviewDecision.status` is `partial` when required scenarios are missing or unreadable, `blocked` when the bundle is otherwise complete but self-verification fails, `ready_with_warnings` when completeness and verification pass but latest scenario outcomes or computed checks still need human attention, and `ready` when no blockers or warnings are present. `reviewDecision.validForExternalReview` requires both `readiness.ready` and `verification.valid`; warnings do not change that boolean because they are intended to guide human review, not hide evidence completeness.

Account builds a local pre-share bundle preview from the retained report ledger and export-audit events whenever the local evidence history changes. The preview uses the same bundle builder as export, but it does not save or share anything by itself. Its only UI purpose is to show the reviewer the current bundle decision, verification posture, bundle fingerprint, blockers, and warnings before they open the native share sheet.

Export-audit semantics are local and bounded. Saving a new report, opening the native share sheet for a new report, opening the native share sheet for a saved report, opening the native share sheet for a bundle, and canceling a decision-gated bundle export each append one metadata event. Older local ledgers may still contain the legacy `partial_bundle_share_cancelled` action; new decision-gated cancellations use `bundle_share_cancelled`. Bundle share/cancel audit events include compact review-decision metadata only: status, blocker count, warning count, `validForExternalReview`, and verification validity. These events are meant to help a reviewer reconstruct manual evidence handling on the device; they are not proof that the operating-system share target completed delivery. Coverage-bundle `ledgerReview.auditTrail` carries the newest retained audit metadata entries only: action, timestamp, report id, scenario/outcome, report fingerprint, bundle fingerprint, ready/partial posture, and compact review-decision summary when available. It never carries report bodies, blocker text, warning text, next-action text, or share-target details.

Computed checks are intentionally coarse and non-sensitive. Offline-start checks cover whether the device/API is actually unavailable, whether a secure profile snapshot is visible, and whether any read-only snapshot inventory exists. API-recovery checks cover device connectivity, runtime-profile reachability, and whether account context has recovered from cached-profile posture. Wallet-return checks cover signed-in state, linked-wallet presence, and default execution or smart-account posture. Project-room checks cover signed-in state, project-room snapshot availability, and whether recovery has either a live API or saved project-room snapshot source.

Evidence reports may include scenario, outcome, computed checks, platform, app version, sanitized API base URL, API probe status/error, NetInfo state, cached-profile session status, capability booleans, wallet counts, workspace kind/role posture, and offline snapshot summary counts. They must not include session tokens, OTPs, email addresses, user ids, wallet addresses, workspace labels, organization names, invite tokens, private keys, free-form reviewer notes, URL credentials, or URL query strings.

## Recovery Model

Current recovery behavior is manual and explicit:

- Users can see whether the app believes the device is offline.
- Users can see whether the configured escrow API is reachable.
- Users can refresh native network state after reconnecting.
- Manual refresh runs both NetInfo refresh and the API reachability probe.
- Query caches are invalidated after manual refresh so visible surfaces can refetch.
- Query caches for mobile read surfaces are also invalidated automatically after an offline/API-unreachable period recovers into a reachable API probe state.
- Foreground resume triggers a bounded network/API refresh when the previous API probe is stale or unavailable.
- Mutating actions produce direct reconnect-and-retry copy instead of generic API failures.
- Selected contract, project-room, and marketplace read surfaces can still show the last saved snapshot after an offline start or backend outage.
- Account can save and share sanitized recovery evidence reports so manual device checks can preserve runtime posture without copying secrets or personally identifying account data.

This is appropriate for the current app because escrow, wallet, and identity mutations should not be silently queued without a stronger idempotency and replay contract.

## Deferred Work

- Durable offline mutation queue for low-risk writes only.
- Per-mutation retry envelopes with idempotency keys, conflict copy, and user-visible pending state.
- Real iOS and Android evidence runs using the Account recovery evidence report across airplane mode, captive portal, flaky LTE, and wallet deep-link return paths.

## Operational Notes

- Do not queue escrow execution, wallet verification, OTP, funding, release, dispute, or join mutations until the API and contract gateway expose an explicit mobile-safe replay contract.
- Treat NetInfo reachability as a device signal; use the API probe only as a lightweight reachability check, not as deep backend health proof.
- Keep offline copy action-specific; generic "network failed" messages are not enough for wallet and escrow flows.
- Keep guarded mutation lists in this document aligned with mobile screens when new authenticated write paths are added.
