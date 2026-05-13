---
"@fhir-place/react-fhir": patch
---

Render FHIR `date` / `dateTime` / `instant` values in a human-readable form.

Adds a `formatDateTime` helper and wires it into the `date`, `dateTime`,
`instant`, `Period`, `Meta` (lastUpdated) and `Annotation` renderers, so a
value like `2019-09-07T17:39:34+00:00` shows as `Sep 7, 2019, 5:39 PM` while
the `<time dateTime>` attribute keeps the precise machine value. Year and
year-month partials, plus out-of-range values (e.g. `2021-02-31`), fall back
to the raw string rather than being normalised to a different day.

Also fixes `colorJson` so the JSON pane no longer mangles colons and digits
inside string values — timestamps were being rewritten from
`"2021-04-06T03:01:38.604-04:00"` to `"2021-04-06T03: 01: 38.604-04: 00"`.
