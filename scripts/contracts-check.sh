#!/bin/sh

set -eu

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$repo_root/packages/contracts"

echo "contracts-check: forge fmt --check"
forge fmt --check

echo "contracts-check: forge test"
forge test
