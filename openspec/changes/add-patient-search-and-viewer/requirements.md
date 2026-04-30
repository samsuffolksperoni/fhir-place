# Requirements — `add-patient-search-and-viewer`

## Functional

- F1. The proxy exposes `GET /api/connections/:cid/fhir/:resourceType`
  and `GET /api/connections/:cid/fhir/:resourceType/:id`.
- F2. The Phase A resource-type allow-list is exactly:
  `Patient`, `Condition`, `MedicationRequest`, `AllergyIntolerance`,
  `Encounter`, `Observation`.
- F3. The Phase A search-parameter allow-list is per-resource and lives
  in `apps/workbench/server/schemas.ts`.
- F4. The proxy filters search params before forwarding upstream.
  Disallowed params (incl. `_include`, `_revinclude`, `_has`, `_filter`,
  `_elements`, `_summary`, `_format`) are dropped silently.
- F5. `_count` is clamped to `MAX_COUNT = 100`. Missing or non-positive
  `_count` falls back to `20`.
- F6. Repeated values for the same allow-listed key are preserved (FHIR
  uses comma- and repeat-style multi-values).
- F7. FHIR `id` path segments are validated against the R4 regex
  `[A-Za-z0-9\-\.]{1,64}` before insertion. Anything else → 400.
- F8. The frontend exposes:
  - `/connections/:cid/patients` — search & list.
  - `/connections/:cid/patients/:pid` — demographics + compartment.
  - `/connections/:cid/patients/:pid/:resourceType/:resourceId` — raw
    JSON viewer.
- F9. The selected-patient context is URL-driven; there is no separate
  React context or store.
- F10. The patient search form supports `name`, `identifier`,
  `birthdate`, and `gender`. The form's state is mirrored into URL search
  params on submit.

## Non-functional

- N1. The auth token never reaches the browser. The proxy reads the raw
  row via `ConnectionStore.getInternal`, attaches `Authorization` for
  the upstream request, and never echoes the token back.
- N2. The proxy is GET-only. `POST`/`PUT`/`PATCH`/`DELETE` on the
  `/api/connections/:cid/fhir` prefix get a 404 by routing-table
  omission.
- N3. The synthetic-only banner stays visible on every new page.
- N4. The frontend never opens the upstream FHIR server directly.

## Tests

- T1. `filterSearchParams`:
  - keeps allow-listed params per resource;
  - drops `_include`, `_revinclude`, `_has`, `_format`, etc.;
  - clamps `_count` to `MAX_COUNT`;
  - falls back to `_count=20` for invalid values;
  - preserves repeated values;
  - rejects Patient-only params (`birthdate`) on Condition.
- T2. `proxySearch` / `proxyRead`:
  - forward URL + auth headers correctly;
  - propagate non-2xx upstream as `ok: false` with the body;
  - return 502 on network failure;
  - reject path-traversal ids before any fetch.
- T3. Routes:
  - 404 when connection not found;
  - 400 when resource type outside allow-list;
  - drop disallowed params before forwarding;
  - never return the configured auth token in any response;
  - 404 for non-GET on the prefix;
  - propagate upstream non-2xx with status + body.
- T4. `patientDisplayName` covers `official > usual > first`, text
  fallback, empty array, and undefined input.

## Documentation

- D1. `docs/patient-viewer.md` documents the URL shape, read path,
  allow-lists, search-param policy, and Phase A icebox.
- D2. The PR description points reviewers to `docs/patient-viewer.md`
  and references the OpenSpec change.
