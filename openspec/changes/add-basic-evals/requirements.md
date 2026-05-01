# Requirements

## Functional

- F1. A command must run at least two eval cases locally.
- F2. The harness must include a known-condition case where the claim text and
  cited `Condition` reference are both asserted.
- F3. The harness must include a no-allergy-data case that asserts explicit
  missing-data language (not "no known allergies").
- F4. Output must include per-case pass/fail plus summary totals.
- F5. Output summary must include: schema failure count, unsupported-claim
  count, and tool-call count.

## Non-functional

- N1. The runner must emit machine-readable JSON to stdout.
