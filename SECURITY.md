# Security

## Reporting

If you find a security issue, do not open a public GitHub issue or disclose it in a public channel first.

Report it privately to the repository maintainers through the private development channel you already use for this project. If you do not have one, request a private contact path from the repository owner before sharing details.

## What To Include

Include:

- affected component or package
- impact summary
- reproduction steps
- environment or chain context
- any proof-of-concept details needed to verify the issue safely

## In Scope

High-priority areas include:

- smart contract fund safety
- auth and session handling
- wallet and account abstraction flows
- secret handling
- dispute and admin operations
- deployment or environment configuration mistakes

## Secret Handling

- Never commit secrets, private keys, or production credentials.
- Use environment-scoped secrets for CI and deployment.
- Remove accidental secret commits immediately and rotate exposed credentials.
- Use [docs/SECURITY_REVIEW.md](/Users/mc/development/blockchain/ethereum/base/Escrow4337/docs/SECURITY_REVIEW.md) as the focused Phase 7 review artifact for contracts, auth, wallet, and admin boundaries.

## Disclosure Expectations

Please allow maintainers time to confirm, mitigate, and coordinate disclosure before sharing details publicly.
