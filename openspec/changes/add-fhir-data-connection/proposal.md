# Proposal — `add-fhir-data-connection`

## Summary

Introduce the FHIR `DataConnection` abstraction: a typed, persisted
configuration for a FHIR server the workbench can read from, plus a
`/metadata` probe that fetches and persists a CapabilityStatement summary.
This is PR 2 of Phase A.

## Motivation

The workbench needs a stable way to reference a FHIR server before any of
the typed patient-scoped tools (PR 4) or the agent loop (PR 6) can run. The
allow-list — `kind: fhir_clinical` and `authType: none | bearer` only — has
to be enforced at the server boundary so unsupported modes (SMART, OMOP,
claims) cannot be persisted by accident or by a misconfigured client.

CapabilityStatement support also lands here so the connection setup flow
ends in "this server is alive, here's what it claims to support" rather
than just storing a URL.

## Scope of this change (PR 2)

In:

- A `data_connection` table with denormalised `last_capability_*` fields.
- A small Hono API (`apps/workbench/server/`) on port 5175 with:
  - `GET / POST /api/connections`
  - `GET / DELETE /api/connections/:id`
  - `POST /api/connections/:id/test`
- A FHIR `/metadata` probe service that returns the FHIR version and
  software identification, and stores the raw CapabilityStatement.
- A frontend connection setup UI: list, create, detail, test, delete.
- Vite dev proxy `/api` → API port.
- Docs at `docs/data-connections.md`.

Out:

- Patient search and the resource viewer (PR 3).
- Tools (PR 4).
- LLM and agent (PR 6).
- Audit logging (PR 7) — capability fetch is not yet persisted as an
  `AuditEvent`-shaped record.

## Architecture decision: separate Hono process

The Vite frontend cannot open SQLite directly (and shouldn't), so PR 2
introduces a small Hono server alongside the Vite dev server. Two processes
in dev (`pnpm --filter @fhir-place/workbench server` + `dev`); one in
production (Vite emits a static bundle, Hono serves the API). This is the
shape we'll need anyway for PR 4's server-enforced patient scope.

## Safety

- The auth allow-list is enforced in `server/schemas.ts` (Zod). Unknown
  `kind` or `authType` values get a 400 before any DB write.
- `bearer` auth requires a token; `none` rejects a token. Both rules are
  unit-tested.
- Stored auth tokens never leave the server. The API surface returns
  `hasAuthToken: boolean` only.
- The `/metadata` probe verifies the response is a `CapabilityStatement`
  before persisting it; otherwise the connection is marked
  `lastCapabilityStatus: "error"` with the reason.

## Non-goals

This change does **not**:

- Add SMART on FHIR auth, OAuth client_credentials, mTLS, or any other
  authentication mode.
- Encrypt bearer tokens at rest. Phase A is synthetic-only; the README and
  `docs/data-connections.md` say so explicitly.
- Add connection-level scoping by patient compartment — that's the tool
  registry's job (PR 4).
- Add capability history; only the latest probe is stored.
