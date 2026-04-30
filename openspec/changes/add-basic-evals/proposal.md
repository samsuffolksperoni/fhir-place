# Proposal — `add-basic-evals`

## Summary

PR 8 of Phase A. Ships a small deterministic eval harness that
exercises the patient-summary agent loop end-to-end against
synthetic FHIR fixtures, validates the resulting `AgentAnswer`
against the schema, and scores it against case-specific
assertions about safety and grounding behaviour.

Two golden cases ship — `known-condition` and `no-allergy-data`
— matching issue #77's "at least two eval cases run locally"
acceptance bar. Three additional cases named in the issue
(missing-labs, prompt-injection-in-resource-text,
unauthorized-patient) are tracked as follow-ups; two of them
are already pinned by orchestrator and registry unit tests
that have shipped since PR 4 / PR 6, and PR 9's failure
gallery is the right surface to lift them into named eval
cases.

## Motivation

Phase A's working constraint is *evidence-backed answers,
typed scope, deny-by-default*. That's a contract the schema
and the registry enforce structurally — but the *behavioural*
question ("does the agent actually cite the right Condition
when there is one? does it actually treat data absence as
absence?") is something the orchestrator tests can't answer
because they hand the model a script. The eval harness
inverts that: it gives the agent a real-shaped FHIR bundle, a
real-shaped prompt, and asks "did the answer pass the safety
properties we care about?".

Issue #77's acceptance criteria:

- ✅ at least two eval cases run locally,
- ✅ known-condition case passes,
- ✅ missing-data / no-allergy case passes,
- ✅ unsupported claims are counted,
- ✅ eval output is understandable without reading code.

This change satisfies all five.

## Scope

In:

- New `apps/workbench/eval/` module:
  - `types.ts` — `EvalCase`, `Assertion`, `CaseResult`,
    `EvalRunResult` shapes.
  - `fake-fhir.ts` — bundle-driven `fetch` shim. Resolves
    `GET /Patient/<id>` and per-type compartment searches
    (`?patient=Patient/<id>`) against the case's bundle.
  - `scripted-client.ts` — canned Anthropic responses for the
    deterministic mode.
  - `harness.ts` — `runCase` + `runEvalSuite`. Wires the
    real orchestrator and the real registry against the
    case's bundle and scripted (or live) client; computes
    metrics and scores assertions.
  - `run.ts` — programmatic entrypoint (`runPhaseAEvals`).
  - `cases/known-condition.ts` — patient with a single
    documented `Condition` (T2DM).
  - `cases/no-allergy-data.ts` — patient with zero
    `AllergyIntolerance` resources.
  - `cases/index.ts` — `PHASE_A_CASES`.
  - `harness.test.ts` — 8 unit tests covering: both shipped
    cases pass, assertion scoring rejects bad runs, suite
    output shape, exit-code rules.
- New CLI: `apps/workbench/scripts/run-evals.ts`. Wired as
  `pnpm --filter @fhir-place/workbench eval`. Supports
  `--live` (real Anthropic) and `--json <path>`.
- New `apps/workbench/docs/evals.md`.
- New `openspec/changes/add-basic-evals/{proposal,
  requirements,tasks,acceptance}.md`.
- `tsconfig.node.json` and `vitest.config.ts` extended to
  include `eval/`.
- Docs updates:
  - `architecture.md` — list the eval harness as shipped.
  - `safety.md` — anchor layer 9 ("Evals before done") to
    file paths.
  - `limitations.md` — drop PR 8 from "not yet shipped".
  - `README.md` — Status section reflects PR 8.
  - `HomePage.tsx` — in-app blurb reflects PR 8.
  - `TASKS.md` — move PR 8 to Done.

Out (deferred):

- Persistence of `eval_run` rows in SQLite. The issue says
  "if cheap; otherwise output JSON first". This PR outputs
  JSON first; the audit-log work in PR 7 (issue #76) is the
  natural place for the row schema, and a small follow-up
  can land once both are merged.
- The three additional named eval cases (missing-labs,
  prompt-injection-in-resource-text, unauthorized-patient).
  Two of them are already pinned by orchestrator / registry
  unit tests; PR 9's failure-gallery work is the right
  place to lift them into named eval cases visible in the
  UI.
- Streaming or parallel case execution. The suite is
  sequential by design — the live mode would otherwise
  hammer the provider.
- Cross-model benchmark comparisons. Phase A is a single-
  provider research workbench; benchmark tooling is icebox.

## Architecture decisions

- **The harness uses the real orchestrator.** The only
  things faked are `fetch` (which just translates the
  bundle) and `messagesCreate` (in scripted mode). The
  system prompt, schema validation, scope checks, the
  `<resource_data>` wrapping, the fallback paths — all run
  exactly as in production. Anything else would mean the
  evals couldn't catch a regression in the loop itself.
- **Two execution modes share the same fixtures + same
  assertions.** Scripted mode is the regression suite
  (deterministic, no API key). Live mode is the
  behavioural test (real model, same constraints). A case
  is *the* case in both modes; only the source of model
  responses differs.
- **Bundle-driven `fetch`, not bundle-driven `proxySearch`.**
  We override `fetch`, not the proxy or the registry, so
  every layer above the upstream — the proxy's allow-list,
  the registry's deny-by-default, the orchestrator's
  envelope wrapping — is exercised by the eval. The
  alternative (mocking at a higher level) would skip the
  exact code paths we want to validate.
- **Assertions are a discriminated union, not free
  functions.** The `kind` tag drives the `evaluate` switch
  in `harness.ts`; adding a new assertion is two
  locations and the compiler enforces exhaustiveness. Free
  functions would let cases drift into ad-hoc logic the
  reviewer has to read line-by-line.
- **Output is JSON first.** A SQLite-backed `eval_run` row
  would be cheap once PR 7's audit store lands, but
  introducing a new table here (with no `agent_answer`
  table to FK against) would be invasive. JSON keeps the
  PR self-contained and the shape is the same one PR 7's
  audit export uses.

## Safety

- Eval runs go against synthetic in-memory bundles, never
  the upstream FHIR server, never real PHI.
- The eval `connection` row passes `auth_type: "none"` and
  no token; even if a case authoring mistake leaked a
  token-bearing connection, the fake `fetch` only matches
  `https://eval.fhir.local/baseR4` URLs.
- The two assertions per case that explicitly forbid
  fabricated claims (`noClaimMatches /no\s+known\s+allerg/i`,
  `noClaimMatches /not\s+allergic\s+to/i`) make the safety
  property machine-checkable rather than merely intended.
- Live mode requires an explicit `--live` flag *and*
  `ANTHROPIC_API_KEY`; the default `pnpm eval` never sends
  prompts to a model.
- The synthetic-only / not-for-clinical-use banner is
  unchanged.

## Non-goals

- Cross-model benchmark suites (sonnet vs opus comparisons).
- Hallucination-rate metrics over arbitrary text.
- Adversarial fuzzers / live red-team consoles.
- Persistence of every eval run to disk.
- A UI surface for the eval results — that's PR 9's
  failure gallery.
