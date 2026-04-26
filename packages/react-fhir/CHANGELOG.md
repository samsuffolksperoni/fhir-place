# @fhir-place/react-fhir

## 0.1.0

### Minor Changes

- d2cff6b: Add `<ColumnPicker>` companion to `<ResourceTable>`: a popover-style "Columns" button with checkboxes per column, optional `localStorage` persistence via `storageKey`, keyboard accessible (Esc closes, ArrowUp/Down navigate). Closes #32.

  Expand the offline ValueSet bundle for HAPI-style servers that don't serve ValueSets: bundles now include `medicationrequest-intent`, `medicationrequest-category`, `event-status`, `procedure-category`, `allergy-intolerance-{type,category,criticality}`, `immunization-status`, and `v3-ActEncounterCode`. Bundled SDs gained matching bindings on the relevant `code` / `Coding` / `CodeableConcept` elements so `<TokenSearchField>` can render them as dropdowns without contacting the server. Closes #44.

  Add `useSearchParameter(base, code)` hook and a spec-aware `elementPathForSearchParam(param, base, spec?)` that prefers `SearchParameter.expression` over the kebab→camel naming convention, with graceful fallback when the expression contains FHIRPath function syntax (`.where(...)`, `.as(...)`, `.resolve()`). `<TokenSearchField>` now consults the canonical SearchParameter when available — covers custom IG params and core params whose code diverges from their expression.

  `codesFromValueSet` gains an optional `resolve` argument that follows `compose.include.valueSet[]` references recursively, with cycle protection (single-level, multi-level, and self-reference cases all guarded). Closes #33.

- 386a114: Initial 0.1.0 release of `@fhir-place/react-fhir`.

  A React component library for building FHIR R4 apps driven by the FHIR spec itself (StructureDefinition, SearchParameter, CapabilityStatement). Minimal resource-specific code — the UI is derived from spec metadata, so it works against any FHIR REST API.

  What ships:

  **Client**

  - `FhirClient` interface + `FetchFhirClient` implementation
  - Full CRUD: `read`, `vread`, `history`, `search`, `create`, `update`, `patch` (JSON Patch), `delete`, `readReference`
  - Optimistic concurrency via `If-Match` / `If-None-Match`, conditional create via `If-None-Exist`
  - Static and dynamic header providers (for bearer tokens)
  - `FhirError` carries status, URL, and `OperationOutcome`

  **Hooks** (TanStack Query wrappers)

  - `useResource`, `useSearch`, `useCapabilities`, `useStructureDefinition`, `useReadReference`
  - `useCreateResource`, `useUpdateResource`, `useDeleteResource` — invalidate matching read queries on success

  **Components**

  - `<ResourceView>` — generic spec-driven read view with 20+ datatype renderers
  - `<ResourceEditor>` — generic spec-driven form for every R4 primitive + HumanName / Address / ContactPoint / Identifier / Reference / Period / Quantity / Coding / CodeableConcept. Array add/remove, choice types, BackboneElement recursion.
  - `<ResourceSearch>` — form driven by `CapabilityStatement.rest[].resource[].searchParam`
  - `<Narrative>` — DOMPurify-sanitised narrative rendering (the only place `dangerouslySetInnerHTML` is allowed)

  **Structure utilities**

  - `walkResource` / `walkObject` — iterate a StructureDefinition snapshot in canonical order, handling `[x]` choice types
  - `directChildren`, `findElement` — SD queries
  - `pathGet` / `pathSet` / `pathRemove` / `prune` — immutable state helpers for the editor
  - `resolveStructureDefinition` — instance read → search-by-canonical → bundled core fallback chain
  - Bundled R4 Patient and Observation StructureDefinitions (more to come) loaded via dynamic import

  Safe by default: every narrative goes through DOMPurify. ESM + `.d.ts`; subpath exports `@fhir-place/react-fhir/client`, `/hooks`, `/structure`, `/components`.

### Patch Changes

- 8cc31b3: Bundle core R4 StructureDefinitions for `Condition`, `MedicationRequest`, `AllergyIntolerance`, `Procedure`, `Encounter`, and `Immunization` so detail pages work out-of-the-box against servers that do not persist canonical SDs (e.g. public HAPI). Closes #42.

  Clip `SearchParameter.documentation` per resource in `ResourceSearch`: cross-resource params that dump a `"Multiple Resources: * [A](a.html): ... * [B](b.html): ..."` bullet list now show only the bullet matching the current resource type, falling back to the first sentence capped at 140 characters. Closes #43.

All notable changes to this package are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and semver.
