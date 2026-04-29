# Neon Shared Backend

Use Neon as the shared Postgres provider when local and deployed apps should read and write the same cloud data through one API.

## Target Shape

| Surface | Shared-cloud setting |
| --- | --- |
| API | Deployed `services/api` with `PERSISTENCE_DRIVER=postgres`, Neon `DATABASE_URL`, and `DATABASE_SSL=true` |
| Web | `NEXT_PUBLIC_API_BASE_URL` points at the deployed API URL |
| Admin | `NEXT_PUBLIC_API_BASE_URL` points at the deployed API URL |
| Mobile | `EXPO_PUBLIC_API_BASE_URL` points at the deployed API URL |
| Redis | Do not add until the code has a concrete queue, cache, or rate-limit use case |

The browser and mobile apps must never receive Neon credentials. Only the API and worker processes use `DATABASE_URL`.

## Neon Setup

1. Create a Neon project for this app.
2. Create or select a database for the shared environment, for example `escrow4337_staging`.
3. Copy the Neon Postgres connection string into the API runtime as `DATABASE_URL`.
4. Set `DATABASE_SSL=true`.
5. Run the API migration command once against Neon:

```sh
pnpm --filter escrow4334-api build
pnpm --filter escrow4334-api db:migrate
pnpm --filter escrow4334-api db:migrate:status
```

Use Neon branches or separate Neon projects to isolate staging and production. Do not point everyday local development at production Neon data.

## Local Against Shared API

For normal local frontend work, do not run the API locally. `npm run dev` is cloud-first and starts only the local web/admin dev servers. It refuses to run unless a non-local HTTPS API URL is configured:

```env
CLOUD_API_BASE_URL=https://your-api.example.com
```

Store that value in ignored `.env.cloud.local` or export it in the shell before running `npm run dev`. The script passes the cloud URL to the local web/admin dev servers as `NEXT_PUBLIC_API_BASE_URL` and does not start `services/api`.

```sh
cp .env.cloud.example .env.cloud.local
```

For deployed frontend environments, point clients at the same shared deployed API:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-api.example.com
EXPO_PUBLIC_API_BASE_URL=https://your-api.example.com
```

The deployed API must allow local origins:

```env
NEST_API_CORS_ORIGINS=http://localhost:3000,http://localhost:3001,https://your-web.example.com,https://your-admin.example.com
```

## Local API Against Neon

Only use this when you specifically need to debug API behavior against cloud data:

```env
PERSISTENCE_DRIVER=postgres
DATABASE_URL=postgresql://...
DATABASE_SSL=true
AUTH_EMAIL_MODE=mock
WALLET_SMART_ACCOUNT_MODE=mock
ESCROW_CONTRACT_MODE=mock
NEST_API_CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

This is a staging-parity workflow, not the default local workflow.
