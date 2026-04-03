# Contracts

Foundry workspace for the Milestone Escrow smart-contract layer.

## Purpose

This package owns the onchain escrow primitives for the product, including milestone state transitions and dispute-related actions.

## Current State

- `WorkstreamEscrow.sol` is the main contract
- contract tests cover the core happy-path escrow and refund flows
- this is currently the strongest implemented slice in the repo

## Local Development

From this directory:

```bash
forge build
forge test
forge fmt --check
```

## Expected Responsibilities

This package should remain responsible for:

- escrow lifecycle state transitions
- funding and release primitives
- dispute and resolution primitives
- contract-level invariants and failure conditions

Business workflow orchestration should stay in the API, not be pushed into offchain consumers or frontend code.

## Notes

- `lib/` contains third-party dependencies with their own upstream documentation
- do not rewrite vendored dependency READMEs as part of normal repo cleanup

## Related Docs

- [Root README](/Users/mc/development/blockchain/ethereum/base/Escrow4337/readme.md)
- [Architecture](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/ARCHITECTURE.md)
- [Execution Guide](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/EXECUTION_GUIDE.md)
