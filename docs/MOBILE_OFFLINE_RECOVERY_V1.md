# Mobile Offline Recovery V1

## Scope

This note documents the first production-grade mobile offline and recovery slice for `apps/mobile`.

The slice is intentionally native-client focused. It does not introduce a durable offline mutation queue, local write-ahead log, or background sync worker. It gives the app a truthful network source of truth, pauses query refetch behavior while the device is known offline, blocks high-risk mutations before they enter API or wallet flows, and exposes recovery posture in the surfaces where users are most likely to need it.

## Architecture

`apps/mobile/src/providers/network.tsx` owns the mobile network boundary.

- Uses `@react-native-community/netinfo` as the native connectivity signal.
- Stores connection initialization, transport type, internet reachability, last update time, and the configured API base URL.
- Exposes `useMobileNetwork()` for UI and mutation guards.
- Wires NetInfo state into TanStack Query through `onlineManager.setOnline(...)`.
- Treats explicit `isConnected === false` or `isInternetReachable === false` as offline.
- Treats unknown reachability as online for query purposes so app startup is not blocked by platforms that resolve reachability lazily.

`apps/mobile/src/providers/root.tsx` mounts `MobileNetworkProvider` above `QueryProvider`. This ordering lets the network provider update React Query online state before screens issue normal query traffic.

## UI Surface

`apps/mobile/src/features/network/NetworkStatusCard.tsx` is the shared status and recovery surface.

It displays:

- initialized network posture: checking, online, or offline
- native transport type
- configured API target
- internet reachability state
- last NetInfo refresh time in expanded mode
- a manual refresh action that refreshes NetInfo state and invalidates query caches

Current placements:

- Home tab, compact mode, near runtime posture
- Account tab, expanded mode for signed-in users
- Sign-in screen, compact mode before OTP entry

The card is intentionally diagnostic but user-facing. It avoids implying that API health is proven; the provider only knows native connectivity and configured API target.

## Mutation Guarding

The network provider exposes:

```ts
requireOnline(action?: string): void
```

The helper throws a user-safe error when the device is known offline. Screens and providers call this before starting high-risk or confusing actions:

- OTP code request
- OTP verification
- wallet connector opening
- wallet SIWE challenge creation and signature verification
- smart-account provisioning
- default wallet update

This keeps offline failures close to the initiating action and avoids sending users into wallet approval or OTP flows that cannot complete.

## Query Behavior

TanStack Query online state is now derived from native connectivity. When NetInfo reports the device as offline or internet unreachable, query refetches pause through React Query's built-in online manager behavior.

The implementation does not persist query caches across app restarts. Secure session restore remains owned by the existing session provider; server state remains a normal React Query cache.

## Recovery Model

Current recovery behavior is manual and explicit:

- Users can see whether the app believes the device is offline.
- Users can refresh native network state after reconnecting.
- Query caches are invalidated after manual refresh so visible surfaces can refetch.
- Mutating actions produce direct reconnect-and-retry copy instead of generic API failures.

This is appropriate for the current app because escrow, wallet, and identity mutations should not be silently queued without a stronger idempotency and replay contract.

## Deferred Work

- Durable offline mutation queue for low-risk writes only.
- Per-mutation retry envelopes with idempotency keys, conflict copy, and user-visible pending state.
- API reachability probe that distinguishes internet access from backend outage.
- Background refresh after reconnect.
- Offline read persistence for selected contract/project-room snapshots.
- Device-level evidence on iOS and Android across airplane mode, captive portal, flaky LTE, and wallet deep-link return paths.

## Operational Notes

- Do not queue escrow execution, wallet verification, OTP, funding, release, dispute, or join mutations until the API and contract gateway expose an explicit mobile-safe replay contract.
- Treat NetInfo reachability as a device signal, not a backend health check.
- Keep offline copy action-specific; generic "network failed" messages are not enough for wallet and escrow flows.
