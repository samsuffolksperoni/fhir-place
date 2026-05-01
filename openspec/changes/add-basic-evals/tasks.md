# Tasks — `add-basic-evals`

- [x] Add `apps/workbench/server/eval/metrics.ts` with
      `countUnsupportedClaims` and `summariseToolCalls`.
- [x] Add `apps/workbench/server/eval/runner.ts` with `EvalCase`,
      `EvalReport`, `runEvals`.
- [x] Add `apps/workbench/server/eval/fixtures.ts` with the five
      Phase A cases.
- [x] Add `apps/workbench/server/eval/runner.test.ts` covering the
      pass-all case, the unsupported-claim regression, the permission-
      violation envelope, and the no-known-allergies guard.
- [x] Add `apps/workbench/scripts/eval.ts` CLI; write
      `eval-report.json`; exit non-zero on any failure.
- [x] Add `eval` script to `apps/workbench/package.json`.
- [x] Add `apps/workbench/docs/evals.md`.
- [x] Update `apps/workbench/README.md` Status section.
- [x] Update `apps/workbench/src/pages/HomePage.tsx` blurb.
- [x] Update `apps/workbench/TASKS.md` — move PR 8 to Done, drop the
      duplicate Backlog card, and check off the PR 10 deferred
      `docs/evals.md` item.
- [x] `pnpm -r typecheck`, `pnpm -r test:run`, and the workbench
      build all pass.
