---
"@fhir-place/react-fhir": minor
---

Add `useTypedSearch` hook: accepts a `SearchBuilder` instance and returns the same TanStack Query result shape as `useSearch`. Cache key is derived via `fhirQueryKeys.search` so mutations that invalidate `useSearch` also invalidate `useTypedSearch` for the same resource type.
