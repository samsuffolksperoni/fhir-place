#!/usr/bin/env bash
# Local engineer-dispatch driver. Originally the only local runner; now
# a thin alias for scripts/local/engineer-dispatch.sh, which uses the
# shared scripts/run-prompt-locally.sh runner.
#
# Kept for backwards-compat with anyone whose launchd plist or muscle
# memory points here. New scripts should call scripts/local/ directly.

set -Eeuo pipefail
exec "$(dirname "$0")/local/engineer-dispatch.sh" "$@"
