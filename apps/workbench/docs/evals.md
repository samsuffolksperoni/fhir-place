# Eval Harness (PR 8)

This document describes the Phase A baseline eval harness.

## Run

```bash
pnpm --filter @fhir-place/workbench evals
```

The command prints JSON with:

- `summary`: totals and aggregate metrics.
- `results`: per-case checks and pass/fail.

## Included cases

1. **known-condition**
   - Asserts the answer includes Type 2 diabetes claim text.
   - Asserts a matching `Condition/type2-diabetes` citation.
2. **no-allergy-data**
   - Asserts explicit "no allergy data found" style claim text.
   - Asserts explicit missing-data reason for absent `AllergyIntolerance`.

## Reported metrics

- `schemaFailures`: eval inputs that fail `AgentAnswer` schema validation.
- `unsupportedClaims`: total count of claims with empty evidence arrays.
- `toolCalls`: total declared tool-call count across eval outputs.

## Current limitations

- Uses in-script golden fixtures (not DB-backed).
- Does not persist `eval_run` records yet.
- Focused on two baseline safety/grounding checks; additional cases will follow.
