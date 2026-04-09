#!/usr/bin/env bash

set -euo pipefail

echo "launch-candidate: pnpm verify:ci"
pnpm verify:ci

echo "launch-candidate: pnpm --filter escrow4334-api build"
pnpm --filter escrow4334-api build

echo "launch-candidate: pnpm --filter escrow4334-api db:migrate:status"
pnpm --filter escrow4334-api db:migrate:status

echo "launch-candidate: pnpm --filter escrow4334-api deployment:validate"
pnpm --filter escrow4334-api deployment:validate

echo "launch-candidate: pnpm smoke:deployed"
PLAYWRIGHT_DEPLOYED_EXPECT_LAUNCH_READY="${PLAYWRIGHT_DEPLOYED_EXPECT_LAUNCH_READY:-true}" \
  pnpm smoke:deployed
