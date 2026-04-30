---
"@fhir-place/react-fhir": minor
---

Add `useResources(type, ids)` and `useReadReferences(refs)` hooks for batch
reads. `useResources` issues a single `{type}?_id=a,b,c` search and returns
the resolved resources as a flat array; `useReadReferences` accepts a
heterogeneous `Reference[]`, groups by target type, fans out one search per
group in parallel, and returns a `Map` keyed by `Type/id`.

Both hooks hydrate the per-resource read cache (`fhirQueryKeys.resource`)
on success, so a later `useResource(type, id)` for any of the same ids
resolves from cache without an extra round-trip. `useReadReferences` also
hydrates the per-reference cache.

Query keys are order-independent (ids sorted + deduped) so re-rendering
with a shuffled list does not re-fetch. Empty/undefined input short-circuits
with no network request.

`parseBatchableRefs` is exported as a small helper that returns
`{ [Type]: [id, ...] }` from a `Reference[]`, skipping refs that can't be
resolved through `_id` search (contained, urn, absolute URLs, versioned).

Closes #13.
