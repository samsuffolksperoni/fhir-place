# @fhir-place/workbench

A research workbench for evidence-backed agent answers grounded in **synthetic
FHIR data**. Phase A only.

> **Synthetic data only. Not for clinical use. Do not enter real patient
> information.** This is research / prototyping software. It does not implement
> SMART on FHIR auth, does not handle PHI, and is not a clinical decision
> support tool.

## Status — Phase A skeleton (PR 1)

This package currently ships:

- A Vite + React + Tailwind UI shell with a synthetic-only banner on every page.
- A SQLite + Drizzle local-first database wired up with a placeholder
  `schema_version` table. Real models land in PR 2 (`data_connection`) and
  PR 7 (`agent_session`, `tool_call`, `evidence_claim`).
- A connection to `@fhir-place/react-fhir`'s `FetchFhirClient`, defaulting to
  the same MSW-mock-or-public-HAPI fallback the demo uses.

The patient search, typed FHIR tools, and patient-summary agent land in PRs
2–6. See the root [`TASKS.md`](../../TASKS.md) for the full backlog.

## Local setup

```bash
pnpm install
pnpm --filter @fhir-place/workbench db:setup
pnpm --filter @fhir-place/workbench dev
```

The dev server listens on `http://127.0.0.1:5174`. By default it runs against
the public HAPI R4 sandbox; point it elsewhere with:

```bash
VITE_FHIR_BASE_URL=http://localhost:8080/fhir pnpm --filter @fhir-place/workbench dev
```

## Scripts

| Script | What it does |
| --- | --- |
| `dev` | Vite dev server on port 5174 |
| `build` | Typecheck (frontend + node) and produce a production bundle |
| `test` / `test:run` | Vitest |
| `typecheck` | tsc on both `tsconfig.json` and `tsconfig.node.json` |
| `db:setup` | Open `workbench.sqlite` and apply migrations under `db/migrations/` |
| `db:generate` | Re-generate Drizzle migrations from `db/schema.ts` |

## Layout

```
apps/workbench/
├── src/                 # Vite frontend (React)
│   ├── components/      # presentational components
│   ├── pages/           # route pages
│   ├── App.tsx
│   ├── main.tsx
│   └── config.ts
├── db/                  # Node-only: SQLite + Drizzle schema and client
│   ├── schema.ts
│   ├── client.ts
│   └── migrations/      # checked-in SQL migrations
├── scripts/             # Node-only CLI scripts (db:setup, etc.)
├── tsconfig.json        # frontend tsconfig (vite/client types)
└── tsconfig.node.json   # node-only tsconfig (db, scripts, vite config)
```

The `db/` and `scripts/` folders are deliberately node-only; the Vite frontend
must not import them. The two-tsconfig split enforces that boundary.

## Phase A non-goals

This project does **not** implement, and will not implement during Phase A:

- SMART on FHIR auth
- Real PHI handling
- HIPAA compliance claims
- Write-back / mutation against the FHIR server
- CQL execution or `$evaluate-measure`
- DocumentReference text extraction
- Arbitrary FHIR query generation by the agent
- Arbitrary code execution by the agent

See [`docs/limitations.md`](../../docs/limitations.md).
