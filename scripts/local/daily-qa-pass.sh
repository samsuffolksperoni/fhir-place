#!/usr/bin/env bash
# Local driver for the daily QA pass prompt. Replaces the GHA
# `daily-qa-pass.yml` workflow for local execution.
#
# This one is heavier — it runs the demo app and walks it with
# Playwright. Allows more tools and a higher turn budget.
#
# See scripts/run-prompt-locally.sh for the shared runner.

set -Eeuo pipefail
exec "$(dirname "$0")/../run-prompt-locally.sh" daily-qa-pass \
  --max-turns 200 \
  --allowedTools "Read,Edit,Write,Bash,Grep,Glob,Agent,mcp__github__*"
