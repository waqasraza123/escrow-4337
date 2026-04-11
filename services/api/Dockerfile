# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/compliance/package.json ./packages/compliance/package.json
COPY packages/compliance/tsconfig.json ./packages/compliance/tsconfig.json
COPY packages/compliance/tsconfig.build.json ./packages/compliance/tsconfig.build.json
COPY packages/frontend-core/package.json ./packages/frontend-core/package.json
COPY services/api/package.json ./services/api/package.json
COPY services/api/nest-cli.json ./services/api/nest-cli.json
COPY services/api/tsconfig.json ./services/api/tsconfig.json
COPY services/api/tsconfig.build.json ./services/api/tsconfig.build.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter escrow4334-api build

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/turbo.json ./turbo.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/compliance ./packages/compliance
COPY --from=build /app/services/api ./services/api

WORKDIR /app/services/api

ARG NEST_API_PORT=4100
ENV NEST_API_PORT=${NEST_API_PORT}

EXPOSE ${NEST_API_PORT}

CMD ["node", "dist/main"]
