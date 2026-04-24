---
"@fhir-place/react-fhir": patch
---

Bundle core R4 StructureDefinitions for `Condition`, `MedicationRequest`, `AllergyIntolerance`, `Procedure`, `Encounter`, and `Immunization` so detail pages work out-of-the-box against servers that do not persist canonical SDs (e.g. public HAPI). Closes #42.

Clip `SearchParameter.documentation` per resource in `ResourceSearch`: cross-resource params that dump a `"Multiple Resources: * [A](a.html): ... * [B](b.html): ..."` bullet list now show only the bullet matching the current resource type, falling back to the first sentence capped at 140 characters. Closes #43.
