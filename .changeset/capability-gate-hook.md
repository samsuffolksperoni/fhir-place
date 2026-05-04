---
"@fhir-place/react-fhir": minor
---

Add `useResourceCapabilities(resourceType)` hook that derives `{ canCreate, canUpdate, canDelete, canSearch }` from the cached CapabilityStatement. Returns all-false while loading or when the type is absent (safe default). Exported from the package so downstream apps can gate write buttons without duplicating the CapabilityStatement parsing logic.
