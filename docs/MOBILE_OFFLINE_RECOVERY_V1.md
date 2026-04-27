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
- failed session restore clears the snapshot namespace before returning to signed-out state
- Account exposes a signed-in "Clear offline data" control that removes the full offline snapshot namespace, including public marketplace snapshots
- snapshot clearing only targets keys under `escrow4337.offlineSnapshot.v1`, leaving locale, theme, WalletConnect, and secure token storage untouched

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

This is appropriate for the current app because escrow, wallet, and identity mutations should not be silently queued without a stronger idempotency and replay contract.

## Deferred Work

- Durable offline mutation queue for low-risk writes only.
- Per-mutation retry envelopes with idempotency keys, conflict copy, and user-visible pending state.
- Device-level evidence on iOS and Android across airplane mode, captive portal, flaky LTE, and wallet deep-link return paths.

## Operational Notes

- Do not queue escrow execution, wallet verification, OTP, funding, release, dispute, or join mutations until the API and contract gateway expose an explicit mobile-safe replay contract.
- Treat NetInfo reachability as a device signal; use the API probe only as a lightweight reachability check, not as deep backend health proof.
- Keep offline copy action-specific; generic "network failed" messages are not enough for wallet and escrow flows.
- Keep guarded mutation lists in this document aligned with mobile screens when new authenticated write paths are added.
