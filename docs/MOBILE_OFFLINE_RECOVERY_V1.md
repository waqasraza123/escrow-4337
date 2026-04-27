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

`apps/mobile/src/features/network/useNetworkActionGate.ts` is the screen-level mutation gate. It wraps `useMobileNetwork()` and exposes:

- `actionBlocked`: `true` when the device is known offline or the escrow API is known unreachable
- `requireOnline(action)`: the authoritative guard used inside mutation functions
- `blockedReason`, `offline`, and `apiUnavailable`: UI-friendly status values for buttons and copy

Screens should use this hook for authenticated writes instead of duplicating `network.offline || apiReachability.status === 'unreachable'`.

`apps/mobile/src/features/network/NetworkActionNotice.tsx` is the shared blocked-action notice. It renders only when `useNetworkActionGate().actionBlocked` is true and gives users action-specific recovery copy next to disabled mutation controls.

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

The implementation does not persist query caches across app restarts. Secure session restore remains owned by the existing session provider; server state remains a normal React Query cache.

## Recovery Model

Current recovery behavior is manual and explicit:

- Users can see whether the app believes the device is offline.
- Users can see whether the configured escrow API is reachable.
- Users can refresh native network state after reconnecting.
- Manual refresh runs both NetInfo refresh and the API reachability probe.
- Query caches are invalidated after manual refresh so visible surfaces can refetch.
- Mutating actions produce direct reconnect-and-retry copy instead of generic API failures.

This is appropriate for the current app because escrow, wallet, and identity mutations should not be silently queued without a stronger idempotency and replay contract.

## Deferred Work

- Durable offline mutation queue for low-risk writes only.
- Per-mutation retry envelopes with idempotency keys, conflict copy, and user-visible pending state.
- Background refresh after reconnect.
- Offline read persistence for selected contract/project-room snapshots.
- Device-level evidence on iOS and Android across airplane mode, captive portal, flaky LTE, and wallet deep-link return paths.

## Operational Notes

- Do not queue escrow execution, wallet verification, OTP, funding, release, dispute, or join mutations until the API and contract gateway expose an explicit mobile-safe replay contract.
- Treat NetInfo reachability as a device signal; use the API probe only as a lightweight reachability check, not as deep backend health proof.
- Keep offline copy action-specific; generic "network failed" messages are not enough for wallet and escrow flows.
- Keep guarded mutation lists in this document aligned with mobile screens when new authenticated write paths are added.
