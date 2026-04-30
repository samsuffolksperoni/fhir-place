# Requirements — `add-workbench-app`

## Functional

- F1. The repository contains a workspace package named
  `@fhir-place/workbench` at `apps/workbench/`.
- F2. The package exposes the following pnpm scripts: `dev`, `build`,
  `test`, `test:run`, `typecheck`, `db:setup`, `db:generate`.
- F3. Running `pnpm --filter @fhir-place/workbench dev` starts a Vite dev
  server that serves the workbench UI on `http://127.0.0.1:5174`.
- F4. The UI shell renders a synthetic-only / not-for-clinical-use banner on
  every page (in PR 1 there is one page; the banner stays as the app grows).
- F5. The package contains a local-first SQLite database wired through
  Drizzle ORM. Running `pnpm --filter @fhir-place/workbench db:setup`
  creates `workbench.sqlite` and applies all migrations under
  `db/migrations/`.
- F6. Drizzle's schema lives at `db/schema.ts`. PR 1 ships a
  `schema_version` placeholder table; subsequent OpenSpec changes replace or
  extend it.

## Non-functional

- N1. The frontend (`src/`) and the node-only code (`db/`, `scripts/`) are
  enforced as separate TypeScript projects via `tsconfig.json` and
  `tsconfig.node.json`.
- N2. `src/` does not import anything from `db/` or `scripts/`.
- N3. The package mirrors the demo's stack: Vite, React 18, Tailwind 3,
  TanStack Query, React Router. No new state-management library.
- N4. The package reuses `@fhir-place/react-fhir`'s `FetchFhirClient`; it
  does not reimplement a FHIR HTTP client.

## Safety

- S1. The synthetic-only banner uses `role="alert"` and copy that names both
  "synthetic data only" and "not for clinical use".
- S2. The README states upfront that the app is synthetic-only and not
  clinical. The disclaimer also appears in `docs/safety.md` and
  `docs/limitations.md`.
- S3. No SMART on FHIR auth, PHI handling, write-back, CQL, MCP server,
  prior auth, care-gap detection, DocumentReference extraction, or
  arbitrary FHIR query generation is introduced by this change. The icebox
  in `TASKS.md` and `docs/limitations.md` is the source of truth.

## CI

- C1. The repo's existing `pnpm -r typecheck` and `pnpm -r test:run`
  commands cover the new package.
- C2. `pnpm --filter @fhir-place/workbench build` is exercised in CI.
