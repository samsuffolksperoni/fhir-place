# Acceptance — `add-basic-evals`

This change is accepted when **all** of the following hold:

## Harness

- [ ] `apps/workbench/eval/types.ts` exports `EvalCase`,
      `Assertion`, `AssertionResult`, `CaseResult`,
      `CaseMetrics`, `EvalRunResult`, `FhirResource`,
      `ScriptStep`, `FinalizeBody`.
- [ ] `apps/workbench/eval/harness.ts` exports `runCase`
      and `runEvalSuite`.
- [ ] `apps/workbench/eval/run.ts` exports
      `runPhaseAEvals` returning `{ exitCode, result }`.
- [ ] The harness uses the real orchestrator and registry;
      only `fetch` and `messagesCreate` are faked.
- [ ] `Assertion`'s discriminated union is exhaustively
      handled in the `evaluate` switch (compiler-checked).

## Cases

- [ ] `PHASE_A_CASES` exports the two cases:
      `known-condition` and `no-allergy-data`.
- [ ] `known-condition` passes under the scripted client
      with every assertion green.
- [ ] `no-allergy-data` passes under the scripted client
      with every assertion green.
- [ ] Both cases include `noClaimMatches` assertions
      forbidding fabricated claims.

## CLI

- [ ] `pnpm --filter @fhir-place/workbench eval` runs the
      suite, prints a per-case summary, and exits 0 on
      all-pass.
- [ ] `--live` flag without `ANTHROPIC_API_KEY` exits 2
      with a helpful message; never sends a request.
- [ ] `--json <path>` writes the full `EvalRunResult` as
      JSON; the file's `schemaVersion` is `"1"`.
- [ ] `-h` / `--help` prints usage and exits 0.

## Tests + build

- [ ] `pnpm --filter @fhir-place/workbench typecheck`
      exits 0.
- [ ] `pnpm --filter @fhir-place/workbench test:run`
      exits 0 with at least 8 new tests in
      `eval/harness.test.ts`.
- [ ] `pnpm --filter @fhir-place/workbench build`
      produces a Vite bundle.
- [ ] `pnpm --filter @fhir-place/workbench eval` exits 0
      from a clean checkout with no `ANTHROPIC_API_KEY` in
      the environment.

## Safety

- [ ] No eval case talks to the upstream FHIR server.
      The fake `fetch` only resolves URLs starting with
      `https://eval.fhir.local/baseR4`.
- [ ] Eval connection rows have `auth_type: "none"`,
      `auth_token: null`.
- [ ] The synthetic-only / not-for-clinical-use banner is
      unchanged.
- [ ] Live mode requires both `--live` AND
      `ANTHROPIC_API_KEY`; default `pnpm eval` never
      sends prompts.

## Docs

- [ ] `apps/workbench/docs/evals.md` exists, documents
      the harness, the two cases, the output format,
      the assertion-kind table, the deferred items, and
      the Phase A icebox.
- [ ] `apps/workbench/docs/architecture.md` lists the
      eval harness as shipped (PR 8).
- [ ] `apps/workbench/docs/safety.md` layer 9 ("Evals
      before done") is anchored to file paths.
- [ ] `apps/workbench/docs/limitations.md` no longer
      lists PR 8 under "not yet shipped".
- [ ] `apps/workbench/README.md` and the in-app
      `HomePage.tsx` blurb reflect PR 8 shipped.
- [ ] `apps/workbench/TASKS.md` moves PR 8 to "Done" and
      removes the duplicated Backlog card.

## Out of scope

- [ ] No `eval_run` table is added (deferred to a follow-
      up after PR 7).
- [ ] No prompt-injection or unauthorized-patient eval
      case is added (deferred to PR 9 which surfaces them
      in the failure gallery; both are pinned by
      orchestrator / registry unit tests today).
- [ ] No cross-model benchmark suite or hallucination-
      rate metric is introduced.
- [ ] No UI surface is added for eval results (PR 9's
      failure gallery owns that).
