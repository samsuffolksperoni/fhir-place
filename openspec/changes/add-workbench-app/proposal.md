# Proposal — `add-workbench-app`

## Summary

Add a new package, `@fhir-place/workbench`, as the home of the FHIR Agent
Workbench Phase A. This change introduces the repository foundation only:
the app skeleton, a local-first SQLite database, the synthetic-only UI
banner, and the supporting docs and CI hooks. Subsequent OpenSpec changes
build features on top.

## Motivation

The existing repo ships a generic spec-driven FHIR component library
(`@fhir-place/react-fhir`) and a demo app. The workbench is a separate
research project with a different threat model and a different definition of
done — synthetic-only, read-only, evidence-backed agent answers over typed
patient-scoped tools.

Carving it out as its own workspace package means:

- The library and demo retain their general-purpose framing.
- Workbench-specific safety constraints (no write-back, no SMART, no PHI)
  are encoded in one place and don't bleed into the library.
- The Phase A scope is reviewable PR-by-PR without entangling library work.

## Scope of this change (PR 1 only)

In:

- New workspace package `apps/workbench/` with Vite + React + Tailwind
  matching `apps/demo/` conventions.
- A SQLite + Drizzle local-first DB scaffold with a placeholder
  `schema_version` table and a `pnpm db:setup` script. Real models land in
  later changes.
- A synthetic-only / not-for-clinical-use banner rendered on every page.
- Top-level docs placeholders (`docs/architecture.md`, `docs/safety.md`,
  `docs/limitations.md`) and `AGENTS.md`.
- CI hook so the new package is typechecked, tested, and built.

Out:

- Patient search (PR 3, change `add-patient-search-and-viewer`).
- Tool registry (PR 4, change `add-agent-tool-registry`).
- Agent loop, audit logging, evals — all later changes.
- Any feature listed in the Phase A icebox.

## Stack decisions

- **pnpm workspace** — already in use by the repo.
- **Vite + React 18 + Tailwind 3** — mirrors `apps/demo/` so reviewers and
  contributors don't context-switch between two stacks.
- **TanStack Query + react-router** — same as the demo.
- **`@fhir-place/react-fhir`'s `FetchFhirClient`** — reuse rather than
  reinvent the FHIR client.
- **SQLite via `better-sqlite3` + Drizzle ORM** — local-first, single-file,
  no external services. The `db/` directory is node-only and segregated
  from the Vite frontend by a separate `tsconfig.node.json`.
- **Zod** — installed now; load-bearing in PR 5 (`AgentAnswer` schema) but
  declared here so later PRs don't have to add a fundamental dep.

## Non-goals

This change does **not**:

- Add SMART on FHIR auth.
- Open a path for PHI.
- Add any write-back path against the FHIR server.
- Add real `data_connection`, `agent_session`, `tool_call`, or
  `evidence_claim` models — those land in their own OpenSpec changes.
- Wire up an LLM provider — that lands in PR 6
  (`add-patient-summary-agent`).
