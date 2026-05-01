# add-basic-evals

## Why

Phase A needs a minimal, runnable eval harness so safety and grounding behavior
can be measured consistently.

## What changes

- Add a local eval runner script at `apps/workbench/scripts/evals.ts`.
- Add two golden eval cases:
  - known-condition (Type 2 diabetes with `Condition` evidence)
  - no-allergy-data (explicit missing-data behavior)
- Emit JSON output with per-case checks plus summary metrics:
  - schema validity failures
  - unsupported-claim count
  - total tool-call count
- Document the design and usage in `apps/workbench/docs/evals.md`.

## Out of scope

- DB persistence of eval runs (`eval_run` table).
- Failure gallery UI (PR 9).
