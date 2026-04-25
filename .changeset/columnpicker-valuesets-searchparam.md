---
"@fhir-place/react-fhir": minor
---

Add `<ColumnPicker>` companion to `<ResourceTable>`: a popover-style "Columns" button with checkboxes per column, optional `localStorage` persistence via `storageKey`, keyboard accessible (Esc closes, ArrowUp/Down navigate). Closes #32.

Expand the offline ValueSet bundle for HAPI-style servers that don't serve ValueSets: bundles now include `medicationrequest-intent`, `medicationrequest-category`, `event-status`, `procedure-category`, `allergy-intolerance-{type,category,criticality}`, `immunization-status`, and `v3-ActEncounterCode`. Bundled SDs gained matching bindings on the relevant `code` / `Coding` / `CodeableConcept` elements so `<TokenSearchField>` can render them as dropdowns without contacting the server. Closes #44.

Add `useSearchParameter(base, code)` hook and a spec-aware `elementPathForSearchParam(param, base, spec?)` that prefers `SearchParameter.expression` over the kebab→camel naming convention, with graceful fallback when the expression contains FHIRPath function syntax (`.where(...)`, `.as(...)`, `.resolve()`). `<TokenSearchField>` now consults the canonical SearchParameter when available — covers custom IG params and core params whose code diverges from their expression.

`codesFromValueSet` gains an optional `resolve` argument that follows `compose.include.valueSet[]` references recursively, with cycle protection (single-level, multi-level, and self-reference cases all guarded). Closes #33.
