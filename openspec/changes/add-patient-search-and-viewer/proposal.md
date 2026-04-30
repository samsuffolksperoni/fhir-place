# Proposal — `add-patient-search-and-viewer`

## Summary

PR 3 of Phase A. Lets a user search a configured FHIR server for a
synthetic patient, select one, view demographics + a compartment summary,
and inspect any allow-listed resource as raw JSON. All reads go through
the existing Hono proxy so the auth token stays server-side and the
resource-type / search-param allow-lists remain a single chokepoint.

## Motivation

PRs 1–2 set up the app shell and a configured FHIR connection. PR 3 is
the first feature that actually reads patient data, and it sets the
patterns the agent will reuse in PRs 4–6:

- **One read path.** The user-facing "browse patients" flow uses the same
  `/api/connections/:cid/fhir/*` proxy the typed-tool registry will use
  in PR 4. The allow-lists land here, exercised by humans first, before
  the agent ever sees them.
- **No FHIR client in the browser.** The frontend never speaks to the
  upstream FHIR server directly. The auth token never crosses the network
  to the browser.
- **URL is the selected-patient context.** No React context for "current
  patient" — the URL holds it. Refresh-safe, shareable, audit-friendly.

## Scope

In:

- A read-only FHIR proxy at `/api/connections/:cid/fhir/*` with two
  routes: `GET /:resourceType` and `GET /:resourceType/:id`.
- Phase A resource-type allow-list: Patient, Condition,
  MedicationRequest, AllergyIntolerance, Encounter, Observation.
- Per-resource search-parameter allow-list. Disallowed params (including
  `_include`, `_revinclude`, `_has`, `_filter`, `_elements`, `_summary`,
  `_format`) are silently dropped before forwarding.
- `_count` clamped to `MAX_COUNT = 100`, default `20`.
- FHIR `id` validated against the R4 spec regex before being placed in a
  URL path segment.
- Frontend pages: PatientsPage, PatientPage, ResourcePage; "Browse
  patients" link from the connection detail page.
- Docs at `docs/patient-viewer.md`.

Out:

- The typed FHIR tool registry (PR 4). The proxy here is user-facing, not
  agent-callable. The agent in PR 6 only ever sees the typed tools that
  PR 4 builds on top of this proxy.
- Audit logging (PR 7) — the proxy doesn't yet emit `AuditEvent`-shaped
  records.
- Encrypted-at-rest tokens, SMART, OAuth client_credentials — same Phase
  A icebox as PR 2.

## Architecture decisions

- **One proxy route, used by humans now and the agent later.** The
  alternative — separate user-facing and agent-facing endpoints — would
  duplicate the allow-list. Putting both behind the same chokepoint
  means PR 4 narrows the surface (typed inputs, deny-by-default patient
  scope) without re-implementing it.
- **Search-param drop, not 400.** Disallowed params are silently dropped
  rather than returning a 400. This matches FHIR's "ignore unknown
  params" guidance and keeps the proxy lenient for browsers that send
  legacy query strings, while still preventing `_include` and friends
  from expanding the response shape.
- **No `$everything`.** A single `Patient/:id/$everything` is tempting
  but pulls back resource types we haven't allow-listed. We use plain
  `?patient=Patient/:id` searches per resource type instead.

## Safety

- Resource-type allow-list is enforced at the proxy boundary. Anything
  outside the six allow-listed types → 400.
- Search-param allow-list is per-resource. `Condition`'s allow-list
  rejects `birthdate`, etc.
- FHIR `id` regex enforced before path-segment insertion (no
  `../OperationDefinition` traversal).
- Token redaction tests carried over from PR 2 are extended with a new
  case asserting the proxy never returns the configured bearer token.
- The proxy is GET-only. Hono returns 404 for `POST`/`PUT`/`PATCH`/
  `DELETE` on this prefix.

## Non-goals

- Free-text search across resource bodies.
- DocumentReference content extraction.
- Anything that mutates the upstream FHIR server.
- A patient-record completeness assessment — Phase A surfaces what the
  server returned, no more.
