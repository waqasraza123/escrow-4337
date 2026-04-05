# Local Postgres

Zero-license-cost local Postgres stack for this repo.

## What This Is

- pinned Postgres 16 container
- persistent named Docker volume
- healthchecked service on `127.0.0.1:5432`
- intended for local development and single-node self-hosted environments
- optional convenience layer, not a hard dependency; a native Postgres 16+ install works if it exposes the same connection settings

## Start

From the repo root:

```bash
cp infra/postgres/.env.example infra/postgres/.env
pnpm db:up
pnpm db:status
```

## Stop

```bash
pnpm db:down
```

## Reset Local Data

```bash
pnpm db:reset
```

## Default Connection String

```bash
postgresql://escrow4337:escrow4337@127.0.0.1:5432/escrow4337
```
