# Tasks — `add-patient-search-and-viewer`

- [x] Add `ResourceType` enum, `SEARCH_PARAM_ALLOWLIST`, and `MAX_COUNT`
      to `server/schemas.ts`.
- [x] Add `server/services/fhir-proxy.ts` with `filterSearchParams`,
      `proxySearch`, and `proxyRead` (FHIR id regex enforced).
- [x] Add `server/routes/fhir.ts` mounted at
      `/api/connections/:cid/fhir`. GET-only.
- [x] Add `ConnectionStore.getInternal` for server-only access to the
      raw row including `authToken`.
- [x] Wire `fhirRoutes` into `server/app.ts` and propagate the injected
      `fetchFn` through `createApp`.
- [x] Tests:
      - `services/fhir-proxy.test.ts` (12 tests)
      - `routes/fhir.test.ts` (8 tests)
      - `components/PatientName.test.tsx` (6 tests)
- [x] Frontend client at `src/api/fhir.ts`:
      `searchPatients`, `getPatient`, `searchByPatient`, `readResource`,
      `bundleEntries`.
- [x] Pages:
      - `src/pages/PatientsPage.tsx` (search by name / identifier /
        birthdate / gender; URL-synced)
      - `src/pages/PatientPage.tsx` (demographics + 5 compartment cards)
      - `src/pages/ResourcePage.tsx` (raw JSON viewer; allow-list
        guard)
- [x] `src/components/PatientName.tsx` with `patientDisplayName` and
      `formatHumanName` helpers.
- [x] Wire new routes into `App.tsx`.
- [x] Add "Browse patients" affordance on the connection detail page.
- [x] Add `docs/patient-viewer.md`.
- [x] Add `openspec/changes/add-patient-search-and-viewer/{proposal,
      requirements,tasks,acceptance}.md`.
- [x] `pnpm -r typecheck`, `pnpm -r test:run`, and the workbench build
      all pass.
