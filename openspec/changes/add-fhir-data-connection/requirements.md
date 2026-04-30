# Requirements — `add-fhir-data-connection`

## Functional

- F1. A `data_connection` row is uniquely identified by an opaque `id` and
  carries: `name`, `kind`, `baseUrl`, `authType`, optional `authToken`,
  timestamps, and the latest CapabilityStatement summary fields.
- F2. The API exposes the following endpoints under `/api/connections`:
  `GET /`, `POST /`, `GET /:id`, `POST /:id/test`, `DELETE /:id`.
- F3. `POST /` validates the input against a typed schema and returns 400
  with a structured `{ error: "invalid_input", issues: [...] }` body on
  failure.
- F4. `POST /:id/test` calls `${baseUrl}/metadata` with `Accept:
  application/fhir+json` and (when configured) a `Bearer` auth header,
  verifies the response is a `CapabilityStatement`, and persists either the
  parsed summary or a structured error.
- F5. The frontend renders a list of connections with status, a create
  form, a detail page with a test button, and a delete affordance.
- F6. The Vite dev server proxies `/api` to the Hono server.
- F7. The synthetic-only banner remains visible on every page introduced
  by this change.

## Non-functional

- N1. The `kind` allow-list is `["fhir_clinical"]`. Other values are
  rejected at the API boundary, regardless of HTTP path.
- N2. The `authType` allow-list is `["none", "bearer"]`. Other values are
  rejected at the API boundary.
- N3. `authType: "bearer"` requires a non-empty `authToken`; `authType:
  "none"` rejects a token.
- N4. Auth tokens never appear in any HTTP response body. The redacted row
  type is `Omit<DataConnection, "authToken"> & { hasAuthToken: boolean }`.
- N5. The frontend never opens SQLite directly.
- N6. The store is injectable: `createConnectionStore(db, { fetchFn,
  generateId, now })`. Tests substitute `fetchFn` instead of relying on
  global `vi.mock`.

## Tests

- T1. Unit tests cover `authHeadersFor` for all four meaningful inputs
  (none, bearer w/ token, bearer w/o token, unknown auth type).
- T2. Unit tests cover `probeCapabilityStatement` for: success, non-2xx,
  wrong `resourceType`, network failure, and trailing-slash baseUrl.
- T3. Route integration tests cover: list-empty, create-happy-path,
  unsupported-kind, unsupported-auth-type, bearer-without-token,
  none-with-token, 404-on-unknown-id, test-success, test-error, delete,
  and token-redaction (no response body contains the stored token).

## Safety

- S1. Unsupported connection types and auth types cannot be persisted by
  any path the API exposes.
- S2. A malformed `/metadata` response (wrong shape or non-JSON) does not
  panic the server; the connection is marked `lastCapabilityStatus:
  "error"` with the reason.
- S3. The probe `Accept` header is `application/fhir+json`. The probe sends
  `Authorization: Bearer …` only when `authType === "bearer"` *and* a token
  is configured.

## Documentation

- D1. `docs/data-connections.md` describes the allow-list, the API surface,
  the file layout, the local dev workflow, and the Phase A icebox.
- D2. `apps/workbench/README.md` references `docs/data-connections.md` and
  the two-process dev setup.
