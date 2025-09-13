# Milestone Escrow — ERC-4337 Gasless Work Escrow (USDC on Base)

**Upwork-style milestone escrow with Account Abstraction (ERC-4337), USDC funding, dispute resolution, and an optional Shariah mode.**  
Monorepo: Next.js (web/admin) • NestJS API • Foundry contracts • The Graph subgraph • viem/wagmi SDK • Turbo + pnpm.

---

## ✨ MVP Features (Definition of Done)

- **Seedless onboarding:** Email + OTP → create **4337 smart account** (Safe/Kernel/LightAccount).
- **Jobs & milestones:** Client posts job, funds **USDC** escrow on **Base** (testnet/mainnet). Milestones can be **released, refunded, or disputed**.
- **Gasless UX:** Paymaster sponsors gas for allow-listed actions (configurable, rate-limited).
- **EIP-712 terms:** Off-chain signed Job/Offer; on-chain **hash anchors** for auditability.
- **Disputes:** Admin/Arbitrator resolves with split (bps); all events indexed (subgraph) + **export bundle**.
- **Shariah Mode:** No interest flows; compliant wording; block prohibited categories.
- **CI:** Foundry unit tests, Jest API tests, Playwright e2e; canary deploys.

---

## 🧱 Monorepo Layout

```
workstream/
apps/
web/ # Next.js (App Router)
admin/ # Next.js admin panel
services/
api/ # NestJS (AuthN/Z, AA wallet, escrow endpoints)
indexer/ # viem log listener -> Postgres
packages/
contracts/ # Foundry + OpenZeppelin
sdk/ # ts-rest + viem client & EIP-712 types
subgraph/ # The Graph (Base)
ui/ # Shared UI components (Radix)
compliance/ # Shariah & jurisdiction policy engine
infra/
terraform/ # RPCs, secrets, buckets
.env.example
turbo.json # Turbo v2 (uses "tasks", not "pipeline")
pnpm-workspace.yaml
tsconfig.base.json
```

**Tech stack:** TypeScript • Next.js • NestJS • viem/wagmi • Drizzle ORM + Postgres • Foundry • OpenZeppelin • The Graph • Turbo • pnpm • Playwright • Jest

---

## 🚀 Quickstart

### Prereqs

- Node 18+ (or 20+), **pnpm** (`corepack enable && corepack prepare pnpm@latest --activate`)
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- Postgres (local or cloud)
- A 4337 **Bundler** + **Paymaster** (Biconomy/Stackup/ZeroDev) for Base Sepolia

### Install & Dev

```bash
pnpm i
pnpm dev     # runs all dev tasks via Turbo

cd packages/contracts
forge build
forge test -vvv

```

## Environment

Create .env at repo root (copy from .env.example):

```
# Chain
CHAIN_ID=84532                           # base-sepolia
RPC_URL=<your_base_or_sepolia_rpc>
USDC_ADDRESS=<usdc_token_address>

# 4337 / Paymaster
BUNDLER_URL=<bundler_url>
PAYMASTER_API_KEY=<paymaster_key>

# Auth
JWT_SECRET=<long_random_string>
SMTP_HOST=<smtp_host>
SMTP_USER=<smtp_user>
SMTP_PASS=<smtp_pass>

# DB
DATABASE_URL=postgres://user:pass@localhost:5432/workstream

```

## License

MIT

Note: Don’t commit real keys. Use environment-scoped secrets in CI.
