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
run pnpm build
run pnpm exec playwright test --list
run pnpm contracts:check
