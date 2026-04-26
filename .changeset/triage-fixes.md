---
"@fhir-place/react-fhir": patch
---

Fix five user-visible bugs surfaced by manual exploration of the live demo:

* `<ResourceTable>` materialised choice paths (`Observation.valueQuantity`, `Observation.valueCodeableConcept`, `effectivePeriod`, `medicationReference`, …) now resolve through a new `findChoiceVariant(sd, path)` helper in `structure/walker.ts`. Cells dispatch to the correct datatype renderer (`Quantity`, `CodeableConcept`, …) instead of falling back to `JSON.stringify`. Closes #57.

* `<ResourceSearch>` **Clear** now also re-submits empty params via `onSubmit?.({})`. Previously the form emptied but the active search persisted, requiring a second click on **Search** to actually reset the list. Closes #61.

* Demo `ResourceDetailPage` wraps the delete mutation in `try/catch`, renders the `OperationOutcome.diagnostics` (or generic message) inline in the confirm panel, keeps the panel open on failure with a **Retry** button, and resets mutation state on **Cancel**. Closes #58.

Live-monitor (no library impact, demo-only):

* Smoke spec `apps/demo/e2e-live/smoke.spec.ts` switched from absolute paths (`/`, `/Patient`) to relative ones (`""`, `"#/Patient"`) so navigation respects the GitHub Pages `/fhir-place/` subpath and the HashRouter migration from #47. Closes #51, #52, #53, #54, #55, #56.
