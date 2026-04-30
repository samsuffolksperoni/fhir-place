# Acceptance — `add-patient-search-and-viewer`

This change is accepted when **all** of the following hold:

- [ ] `pnpm --filter @fhir-place/workbench server` and `dev` run
      together; the user can navigate from the home page → Connections →
      a connection → "Browse patients".
- [ ] On the patients page, a user can submit a search by name,
      identifier, birthdate, or gender, and see matching patients listed.
- [ ] The patients page URL reflects the search; reloading and sharing
      the URL re-applies the filter.
- [ ] On the patient page, the demographics panel shows id, gender,
      birthdate, and identifier(s).
- [ ] The patient page renders five compartment cards (Condition,
      MedicationRequest, AllergyIntolerance, Encounter, Observation),
      each with a count and up to 8 entries; "+ N more" overflow.
- [ ] Clicking any compartment entry opens the raw JSON viewer for that
      resource.
- [ ] The raw JSON viewer fetches the resource through the proxy and
      shows pretty-printed JSON.
- [ ] The synthetic-only banner is visible on every new page.
- [ ] `GET /api/connections/:cid/fhir/Procedure` returns 400
      `resource_type_not_allowed`.
- [ ] `_include`, `_revinclude`, `_has`, `_filter`, `_elements`,
      `_summary`, and `_format` are stripped before the proxy forwards
      upstream.
- [ ] `_count` larger than `MAX_COUNT = 100` is clamped.
- [ ] FHIR `id` path segments containing `..`, `/`, or other unsafe
      characters return 400.
- [ ] Auth tokens never appear in any HTTP response from the proxy
      routes — verified by a route test.
- [ ] `pnpm -r typecheck` exits 0.
- [ ] `pnpm -r test:run` exits 0; the suite includes the new
      proxy/routes/PatientName tests.
- [ ] `pnpm --filter @fhir-place/workbench build` produces a Vite
      bundle.
- [ ] `docs/patient-viewer.md` describes the URL shape, read path,
      allow-lists, search-param policy, and Phase A icebox.
- [ ] No Phase A icebox item is introduced. Specifically: no SMART, no
      PHI path, no write-back, no DocumentReference text extraction, no
      `$everything`, no arbitrary FHIR query generation.
