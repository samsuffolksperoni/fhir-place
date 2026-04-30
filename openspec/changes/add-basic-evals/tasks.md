# Tasks — `add-basic-evals`

- [x] Add `apps/workbench/eval/types.ts` (EvalCase,
      Assertion, CaseResult, EvalRunResult).
- [x] Add `apps/workbench/eval/fake-fhir.ts`
      (bundle-driven `fetch`).
- [x] Add `apps/workbench/eval/scripted-client.ts`
      (canned Anthropic responses).
- [x] Add `apps/workbench/eval/harness.ts`
      (`runCase`, `runEvalSuite`, scoring).
- [x] Add `apps/workbench/eval/run.ts`
      (`runPhaseAEvals` programmatic entrypoint).
- [x] Add `apps/workbench/eval/cases/known-condition.ts`.
- [x] Add `apps/workbench/eval/cases/no-allergy-data.ts`.
- [x] Add `apps/workbench/eval/cases/index.ts`
      (`PHASE_A_CASES`).
- [x] Add `apps/workbench/eval/harness.test.ts` (8 tests).
- [x] Add `apps/workbench/scripts/run-evals.ts` (CLI).
- [x] Wire `pnpm eval` script in
      `apps/workbench/package.json`.
- [x] Extend `tsconfig.node.json` and
      `vitest.config.ts` to include `eval/`.
- [x] Add `apps/workbench/docs/evals.md`.
- [x] Update `apps/workbench/docs/architecture.md` —
      eval harness shipped (PR 8).
- [x] Update `apps/workbench/docs/safety.md` — anchor
      layer 9 to file paths.
- [x] Update `apps/workbench/docs/limitations.md` —
      remove PR 8 from "not yet shipped".
- [x] Update `apps/workbench/README.md` "Status" section.
- [x] Update `apps/workbench/src/pages/HomePage.tsx` blurb.
- [x] Update `apps/workbench/TASKS.md` — move PR 8 to
      Done; remove duplicate Backlog card.
- [x] `pnpm -r typecheck` exits 0;
      `pnpm -r test:run` exits 0 with at least 8 new
      tests; `pnpm --filter @fhir-place/workbench build`
      produces a Vite bundle;
      `pnpm --filter @fhir-place/workbench eval` exits 0
      with both cases passing.

## Deferred to follow-up PRs

- [ ] Persistence of `eval_run` rows (depends on PR 7's
      audit store landing first).
- [ ] Lift the prompt-injection-in-resource-text and
      unauthorized-patient cases from the existing
      orchestrator / registry unit tests into named eval
      cases (PR 9 does this so the failure gallery can
      render them).
- [ ] Add the missing-labs cannot-determine case
      (PR 9; needs a slightly more elaborate Bundle and
      assertion shape).
