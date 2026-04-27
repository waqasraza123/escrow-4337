# Mobile Wallet Hardening V1

## Scope

This note covers the native wallet hardening layer in `apps/mobile`. The goal is to make wallet setup safer to operate on real devices before live wallet round-trip evidence exists.

Implemented files:

- `apps/mobile/src/providers/wallet-config.ts`
- `apps/mobile/src/providers/wallet.tsx`
- `apps/mobile/src/features/wallet/MobileWalletSetupCard.tsx`
- `apps/mobile/src/app/(tabs)/account.tsx`

## Runtime Contract

Mobile wallet setup depends on:

- `EXPO_PUBLIC_REOWN_PROJECT_ID`
  - Required before WalletConnect/AppKit can open on device.
- `EXPO_PUBLIC_WALLET_CHAIN_ID`
  - Target chain for signing and backend wallet-link challenge creation.
  - Defaults to Base Sepolia `84532`.
  - Unsupported configured values fall back to Base Sepolia so diagnostics and AppKit default network stay aligned.
- `EXPO_PUBLIC_WALLETCONNECT_METADATA_URL`
  - WalletConnect metadata URL shown by compatible wallets.
- `EXPO_PUBLIC_WALLETCONNECT_ICON_URL`
  - WalletConnect metadata icon.
- Expo scheme `escrow4337://`
  - Native redirect used by WalletConnect/AppKit.

Supported chains:

- Base Sepolia `84532`
- Base mainnet `8453`

## Chain Guard

The native wallet provider now exposes:

- configured WalletConnect project state
- default chain id and network name
- supported chain ids
- connected chain id and network name
- metadata URL and native redirect
- `chainSupported`

SIWE wallet linking is blocked when a connected EVM wallet reports an unsupported chain. The UI surfaces the connected chain and asks the user to switch to the configured Base target before signing.

This prevents creating wallet-link challenges against a wallet connection that is not on the intended Base network.

## Account Diagnostics

The Account route now shows a dedicated wallet diagnostics card for signed-in users. It surfaces:

- whether WalletConnect is configured
- truncated Reown project id
- WalletConnect metadata URL
- native redirect scheme
- target chain
- supported chains
- connected chain
- chain acceptance state

The setup card also includes chain readiness in its checklist and displays target/connected network context next to the normal link/provision/default actions.

## Operational Notes

- Device-level proof still requires an actual native wallet round trip.
- The provider does not attempt automatic chain switching because AppKit/wallet support varies by wallet. It opens the connector and blocks signing until the connected chain is acceptable.
- The backend remains the authority for wallet ownership, smart-account provisioning, sponsorship policy, and default execution wallet state.
- `providerType === 'eip155'` remains required before requesting `personal_sign`.

## Current Gaps

- No real-device evidence has been captured in this shell.
- No wallet-specific fallback copy exists yet for individual wallets such as MetaMask, Coinbase Wallet, Rainbow, or Safe.
- No offline retry queue exists for wallet actions; failed wallet operations remain user-triggered retries.
