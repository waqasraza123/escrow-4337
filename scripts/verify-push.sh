#!/bin/sh

set -eu

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$repo_root"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "safe-push: pnpm is required but was not found in PATH." >&2
  exit 1
fi

echo "safe-push: running push verification from $repo_root"
echo "safe-push: pnpm build"
pnpm build
