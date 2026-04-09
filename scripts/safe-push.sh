#!/bin/sh

set -eu

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$repo_root"

if [ "${1:-}" = "--" ]; then
  shift
fi

"$repo_root/scripts/verify-push.sh"

echo "safe-push: git push $*"
ESCROW4337_SKIP_PRE_PUSH_VERIFY=1 git push "$@"
