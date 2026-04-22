#!/bin/sh

set -eu

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$repo_root"

run() {
  echo "verify-ci: $*"
  "$@"
}

run pnpm typecheck
run pnpm lint
run pnpm test
run pnpm test:scripts
run pnpm build
run env ESCROW4337_SKIP_API_BUILD=1 pnpm verify:migrations:fresh
run env PLAYWRIGHT_LOCAL_SERVER_MODE=built pnpm e2e:smoke:local
run pnpm contracts:check
