# Tasks — `add-fhir-data-connection`

- [x] Add `data_connection` table to `db/schema.ts` with denormalised
      `last_capability_*` fields.
- [x] Add migration `db/migrations/0001_data_connection.sql`.
- [x] Add `server/schemas.ts` with the Phase A `kind` and `authType`
      allow-lists and a Zod input schema.
- [x] Add `server/services/fhir-connection.ts` with `authHeadersFor` and
      `probeCapabilityStatement`.
- [x] Add `server/services/connection-store.ts` with CRUD and capability
      persistence; the store accepts injected `fetchFn`, `generateId`, and
      `now` so tests don't reach for globals.
- [x] Add `server/routes/connections.ts` (Hono router) and `server/app.ts`
      (root app with `/api/health` + `/api/connections`).
- [x] Add `server/index.ts` entry that boots the Hono app on
      `WORKBENCH_PORT` (default 5175).
- [x] Add `server/test-utils.ts` to spin up an in-memory test app with a
      tmp SQLite file and a redactable connection store.
- [x] Vitest tests for service and routes (token redaction included).
- [x] Frontend API client at `src/api/connections.ts`.
- [x] Frontend UI: `ConnectionsListPage`, `NewConnectionPage`,
      `ConnectionDetailPage`, plus `ConnectionStatusBadge`.
- [x] Wire the new routes into `App.tsx` and add a top-level nav link.
- [x] Vite dev proxy `/api` → `WORKBENCH_PORT` (default 5175).
- [x] Add `pnpm server` + `pnpm server:start` scripts.
- [x] Update `apps/workbench/README.md` to mention the two-process dev
      flow and link to `docs/data-connections.md`.
- [x] Add `docs/data-connections.md`.
- [x] Add `openspec/changes/add-fhir-data-connection/{proposal,requirements,tasks,acceptance}.md`.
- [x] `pnpm -r typecheck`, `pnpm -r test:run`, and the workbench build all
      pass.
