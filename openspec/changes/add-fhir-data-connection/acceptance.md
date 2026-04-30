# Acceptance — `add-fhir-data-connection`

This change is accepted when **all** of the following hold:

- [ ] `pnpm --filter @fhir-place/workbench db:setup` applies migrations
      `0000_initial.sql` and `0001_data_connection.sql` against a fresh
      SQLite file.
- [ ] `pnpm --filter @fhir-place/workbench server` starts a Hono server on
      port 5175 (configurable via `WORKBENCH_PORT`) that serves
      `/api/health` and `/api/connections`.
- [ ] `pnpm --filter @fhir-place/workbench dev` starts the Vite frontend on
      port 5174 with `/api` proxied to the Hono server.
- [ ] In the UI, a user can:
      - [ ] Open the "Connections" page from the top nav.
      - [ ] Create a new `fhir_clinical` connection with `none` or
            `bearer` auth.
      - [ ] See an error in the form when validation fails (e.g. missing
            bearer token).
      - [ ] Click **Test connection** and see the parsed FHIR version,
            software, and a status badge.
      - [ ] Delete a connection.
- [ ] The synthetic-only / not-for-clinical-use banner stays visible on
      every connections page.
- [ ] Unsupported `kind` (e.g. `omop`) or `authType` (e.g. `smart`) values
      are rejected with a 400 by the API.
- [ ] Auth tokens never appear in any HTTP response body — verified by a
      route test (`never returns the auth token in any response`).
- [ ] `pnpm -r typecheck` and `pnpm -r test:run` pass with the new tests
      included.
- [ ] `pnpm --filter @fhir-place/workbench build` produces a Vite bundle.
- [ ] `docs/data-connections.md` lists the allow-list, API surface, file
      layout, dev workflow, and Phase A icebox.
- [ ] No Phase A icebox item is introduced by this change. Specifically:
      no SMART, no PHI, no write-back, no arbitrary FHIR query generation,
      no MCP/OMOP/claims/wearable connection types.
