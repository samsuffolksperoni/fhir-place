---
"@fhir-place/react-fhir": patch
---

Fix `ReferenceInput` falling back to plain text inputs when a bundled core SD
declares `Reference` without `targetProfile` entries (e.g. `Observation.subject`
and `Observation.encounter`). The picker now uses a sensible default set of
common reference-able types (Patient, Practitioner, Organization, Encounter,
Location, Device) instead of rendering `ReferencePickerFallback`, so users always
get the search-and-pick UX. When `targetProfile` is present those explicit targets
take precedence.

Exported constant `DEFAULT_REFERENCE_TARGETS` from
`@fhir-place/react-fhir/components/inputs/Reference` for consumers that want to
customise the default list.
