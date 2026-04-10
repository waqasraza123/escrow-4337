# Security Review

Focused Phase 7 review for the highest-risk repo boundaries.

## Trust Boundaries

- Contracts hold escrowed funds and arbitrate milestone settlement.
- API owns auth state, wallet-link challenges, smart-account orchestration, deployment validation, and operator-facing privileged checks.
- Web and admin surfaces expose user and operator flows but must not be treated as authority beyond authenticated API contracts.
- CI and deployment systems hold secrets and decide which image or config reaches staging or production.

## Threat Areas

### Contracts

- Unauthorized release, refund, or dispute resolution
- Incorrect dispute splits or release accounting
- Fund leakage across milestone release and dispute resolution flows

Existing mitigations:

- explicit client, worker, and arbitrator checks in `WorkstreamEscrow`
- Foundry happy-path and negative-path tests
- replayable contract tests in `packages/contracts`

Remaining risks:

- no separate external audit artifact exists yet
- launch-grade invariant coverage is still limited

### Auth And Session

- OTP abuse, replay, and lock bypass
- refresh-token replay after rotation
- trusted-proxy misconfiguration causing false client IP attribution

Existing mitigations:

- persisted OTP and request-throttle state
- refresh-token rotation with replay-triggered revocation
- env-driven JWT and OTP runtime validation

Remaining risks:

- deployed ingress and proxy-trust behavior still needs live staging evidence
- email relay delivery still lacks live end-to-end validation

### Wallet And Account Abstraction

- forged SIWE challenges
- wallet ownership mismatch
- unsafe sponsorship or smart-account provisioning

Existing mitigations:

- persisted challenge ownership and expiry checks
- SIWE domain, nonce, request-id, URI, and chain-id verification
- sponsorship policy derived from verified owner posture

Remaining risks:

- live bundler, paymaster, and relay behavior still lacks real staging evidence

### Admin And Operator Flows

- non-arbitrator access to privileged operations
- operator confusion caused by stale or partial operational state
- export misuse against non-public or mutable data

Existing mitigations:

- arbitrator-wallet enforcement on privileged API paths
- read-only public export artifacts
- bounded operator workflows over persisted audit and execution state

Remaining risks:

- broader RBAC beyond the linked arbitrator wallet is still absent
- operator surfaces remain dependent on bounded API persistence, not an external indexer

## Secrets Handling

- Secrets belong in ignored local env files, GitHub Environments, or deployment platform secret stores.
- Never place secrets in committed docs, examples, fixtures, or durable memory files.
- CI should use environment-scoped secrets only.
- Rotate any exposed JWT secret, database credential, relay key, or webhook token immediately.

## Required Operational Controls

- keep `pnpm verify:ci` green before promotion
- keep `Deployed Smoke` green for staging before production promotion
- run migrations before promoting a new API image
- deploy the recurring worker separately from the API when daemon mode is required
- keep alert webhooks and runtime-profile alignment under deployed smoke and deployment validation coverage

## Phase 7 Residual Risks

- no external contract audit has been completed
- deployed smoke remains read-only and cannot prove full privileged user workflows
- launch ownership and rollback evidence contracts now exist in-repo, but live staged drill evidence and alert-destination proof are still missing
