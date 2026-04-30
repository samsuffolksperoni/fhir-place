# Requirements — `add-basic-evals`

## Functional

- F1. A new `apps/workbench/eval/` module exists with:
      `types.ts`, `fake-fhir.ts`, `scripted-client.ts`,
      `harness.ts`, `run.ts`, `cases/index.ts`, plus the
      individual case files.
- F2. `EvalCase` carries: `id`, `description`, `prompt`,
      `patient.id`, `bundle`, `scriptedTrace`, `assertions`.
- F3. `Assertion` is a discriminated union with at least the
      kinds: `cites`, `missingDataMatches`,
      `cannotDetermineMatches`, `noClaimMatches`, `fallback`,
      `schemaValid`, `unsupportedClaimCount`,
      `toolCallCount`. The harness's `evaluate` is
      compiler-checked for exhaustiveness over this union.
- F4. `runCase(case, options)` returns a `CaseResult` with:
      `id`, `description`, `passed`, `durationMs`, `metrics`
      (turns, fallback, toolCallCount, schemaValid,
      unsupportedClaimCount, evidenceCountsByType),
      `assertions[]`, optional `error`.
- F5. `runEvalSuite(cases, options)` returns an
      `EvalRunResult` with `schemaVersion: "1"`,
      `startedAt`, `durationMs`, `mode`, `model`, `provider`,
      `passed`, `failed`, `cases[]`. Cases run sequentially.
- F6. `runPhaseAEvals(options, io)` runs `PHASE_A_CASES`,
      logs a per-case summary, optionally writes JSON to
      `outputJsonPath`, and returns
      `{ exitCode, result }`. `exitCode` is 0 iff every case
      passed.
- F7. The CLI (`scripts/run-evals.ts`, wired as `pnpm eval`)
      supports:
      - default mode: scripted, deterministic.
      - `--live`: real Anthropic, requires
        `ANTHROPIC_API_KEY`; if missing, exits 2 with a
        helpful message.
      - `--json <path>` (or `--json=<path>`): writes the
        full result.
      - `-h` / `--help`: prints usage.
- F8. Two cases ship in `PHASE_A_CASES`:
      - `known-condition` — patient with one Condition
        (T2DM); agent must cite `Condition/cond-dm2`.
      - `no-allergy-data` — patient with zero
        AllergyIntolerance resources; agent must record
        `missingData[].description` matching `/allerg/i`
        and must NOT fabricate "no known allergies".
- F9. Both shipped cases pass under the scripted client.

## Non-functional

- N1. The harness uses the real orchestrator
      (`server/agent/orchestrator.ts`) and the real
      registry (`server/agent/tools/`). Only `fetch` and
      `messagesCreate` are faked.
- N2. The eval connection row has
      `auth_type: "none"` and `auth_token: null`; the fake
      `fetch` only resolves URLs starting with
      `https://eval.fhir.local/baseR4`.
- N3. Adding a new assertion kind requires two edits:
      `types.ts` (the union) and `harness.ts` (the
      `evaluate` switch). The compiler enforces
      exhaustiveness.
- N4. The synthetic-only / not-for-clinical-use banner and
      the wider Phase A safety properties are unchanged.
- N5. Sequential case execution. The harness does not run
      cases in parallel.
- N6. `tsconfig.node.json` and `vitest.config.ts` include
      `eval/` so typecheck and tests cover the module.

## Tests

- T1. `harness.test.ts` — known-condition: every assertion
      passes; metrics show schema-valid, no fallback, zero
      unsupported claims, evidence count by type
      `Condition: 1`.
- T2. `harness.test.ts` — no-allergy-data: every
      assertion passes.
- T3. `harness.test.ts` — assertion scoring fails when a
      required citation is missing (replace the evidence
      reference with one not in the bundle's compartment).
- T4. `harness.test.ts` — assertion scoring fails when a
      forbidden claim is fabricated (case rewrites the
      finalize body to include "no known allergies").
- T5. `harness.test.ts` — end-turn-without-finalize is
      flagged as `fallback = true` and the
      `fallback === false` assertion fails.
- T6. `harness.test.ts` — `runEvalSuite` returns
      `schemaVersion: "1"`, the right case count,
      `passed + failed === cases.length`.
- T7. `harness.test.ts` — `runPhaseAEvals` exits 0 on
      all-pass; logs "[PASS] known-condition" line; writes
      JSON when `outputJsonPath` is set; the JSON
      round-trips with the right `schemaVersion`.
- T8. `harness.test.ts` — `runEvalSuite` returns the
      correct `passed`/`failed` split when one case is
      injected to fail.

## Documentation

- D1. `apps/workbench/docs/evals.md` documents:
      - what an eval is and how it runs;
      - the two shipped cases;
      - the output format (`EvalRunResult`);
      - the assertion-kind table;
      - the deferred items (missing-labs, prompt-
        injection, unauthorized-patient) and why they're
        already pinned by unit tests today;
      - the Phase A icebox.
- D2. `apps/workbench/docs/architecture.md` lists the
      eval harness as a shipped component (PR 8).
- D3. `apps/workbench/docs/safety.md` layer 9 ("Evals
      before done") is anchored to file paths.
- D4. `apps/workbench/docs/limitations.md` no longer
      lists PR 8 in "not yet shipped".
- D5. `apps/workbench/README.md` and the in-app
      `HomePage.tsx` blurb reflect PR 8 shipped.
- D6. `apps/workbench/TASKS.md` moves PR 8 to "Done"
      and removes the duplicated Backlog card.
