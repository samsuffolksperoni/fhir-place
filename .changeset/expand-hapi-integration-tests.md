---
"@fhir-place/react-fhir": patch
---

Expand the nightly HAPI integration suite to cover the server contracts
that `useValueSet`, `useInfiniteSearch`, and `<ReferencePicker>` rely on
(closes #29):

- `ValueSet/$expand?url=administrative-gender` returns codes including
  `female` / `male` (first-step lookup in `useValueSet`)
- `ValueSet?url=goal-status` fallback yields a usable concept list via
  `codesFromValueSet`, with a graceful skip if HAPI doesn't host the
  ValueSet at all
- Pagination: create 25 tagged Patients, search with `_count=10`, follow
  `Bundle.link[rel=next]` until exhausted, and assert every created id is
  visited
- `<ReferencePicker>` search-by-name: create a uniquely-named Patient,
  search by partial family, and assert the returned Bundle entries match
  what `formatReferenceLabel` expects to consume

Test-only change — no runtime code modified. Each test is isolated via
unique identifiers and cleans up after itself.
