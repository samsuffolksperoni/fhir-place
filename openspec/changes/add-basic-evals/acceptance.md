# Acceptance — `add-basic-evals`

This change is accepted when **all** of the following hold:

## Harness

- [x] `apps/workbench/server/eval/runner.ts` exports `runEvals` and
      `EvalReport`. The runner uses the same `runPatientSummary` the
      production route uses; there is no parallel orchestrator.
- [x] `apps/workbench/server/eval/fixtures.ts` defines exactly five
      cases: `known-condition`, `no-allergy-data`, `missing-labs`,
      `prompt-injection`, `permission-violation`.
- [x] `apps/workbench/server/eval/metrics.ts` exports
      `countUnsupportedClaims` and `summariseToolCalls`.

## Metrics

- [x] `unsupportedClaims` for the `known-condition` case is 0.
- [x] If a case is mutated to cite a fabricated `Condition/<id>`,
      its `unsupportedClaims` becomes ≥ 1 and the case fails.
- [x] `schemaInvalid` flips to true on a case whose scripted finalize
      payload fails AgentAnswer validation twice.
- [x] `toolCalls` matches `result.toolEnvelopes.length`.

## CLI

- [x] `pnpm --filter @fhir-place/workbench eval` runs from a clean
      checkout without ANTHROPIC_API_KEY set.
- [x] The CLI writes `apps/workbench/eval-report.json` with
      `schemaVersion: "1"` and a list of case results.
- [x] The CLI prints one PASS / FAIL line per case to stdout, plus a
      one-line totals summary.
- [x] The CLI exits non-zero on any case failure.

## Tests

- [x] `pnpm -r typecheck` exits 0.
- [x] `pnpm -r test:run` exits 0; the workbench suite has at least 6
      new tests in `server/eval/runner.test.ts`.
- [x] `pnpm --filter @fhir-place/workbench build` produces a Vite
      bundle.

## Docs

- [x] `apps/workbench/docs/evals.md` exists and explains the design,
      the five cases, the three metrics, the report shape, and how to
      add a case.
- [x] `apps/workbench/README.md` "Status" section lists PR 8 shipped.
- [x] `apps/workbench/src/pages/HomePage.tsx` blurb lists PR 8
      shipped.
- [x] `apps/workbench/TASKS.md` moves PR 8 to Done and removes the
      Backlog card.
- [x] PR 10's deferred `docs/evals.md` item is checked off.

## Out of scope

- [x] No `eval_run` SQLite table is added.
- [x] No live Anthropic call is made by the harness.
- [x] No real FHIR-server fetch is made by the harness.
- [x] No failure-gallery UI is added — that is PR 9.
