---
"@fhir-place/react-fhir": minor
---

Initial 0.1.0 release of `@fhir-place/react-fhir`.

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
