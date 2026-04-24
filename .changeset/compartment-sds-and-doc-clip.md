---
"@fhir-place/react-fhir": patch
---

Bundle canonical R4 StructureDefinitions for 10 resource types (`Patient`, `Observation`, `Condition`, `MedicationRequest`, `AllergyIntolerance`, `Procedure`, `Encounter`, `Immunization`, `Goal`, `Task`), sourced verbatim from the official `@hl7/hl7.fhir.r4.core` npm package via a new `pnpm fetch:core-sds` script. Previously the library shipped hand-curated minimal SDs for `Patient` and `Observation` only, causing detail pages for every other resource type to fail against servers that do not persist core SDs (e.g. public HAPI). Closes #42.

Each SD is dynamically imported, so only the resource types a consumer actually renders land in their bundle.

Clip `SearchParameter.documentation` per resource in `ResourceSearch`: cross-resource params that dump a `"Multiple Resources: * [A](a.html): ... * [B](b.html): ..."` bullet list now show only the bullet matching the current resource type, falling back to the first sentence capped at 140 characters. Closes #43.
