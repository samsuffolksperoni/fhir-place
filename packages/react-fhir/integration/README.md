# Integration tests

These tests run against a **live FHIR server** (SMART Health IT R4 by default) to
catch protocol / shape mismatches that MSW-mocked unit tests can't see.

They're excluded from the default `pnpm test` run and only execute when
invoked explicitly:

```bash
pnpm --filter @fhir-place/react-fhir test:integration
```

## Configuration

| env var           | default                              | purpose                                               |
| ----------------- | ------------------------------------ | ----------------------------------------------------- |
| `FHIR_BASE_URL`   | `https://r4.smarthealthit.org`       | target server                                         |
| `SKIP_IF_UNREACHABLE` | `1`                              | skip the whole suite if `/metadata` 5xx's or times out |

To run against HAPI public instead, set `FHIR_BASE_URL=https://hapi.fhir.org/baseR4`.

## CI

A dedicated workflow (`.github/workflows/integration.yml`) runs these tests:

- nightly at 05:00 UTC (so live-server hiccups don't block day-time merges)
- on every push to `main`
- on manual dispatch via the Actions tab

PRs intentionally skip this suite. A broken protocol assumption should fail
post-merge via the nightly run, not block unrelated PRs on live-server downtime.

## Writing new integration tests

- Every create uses `crypto.randomUUID()` in `identifier[0].value` so the
  resource is unique per test run. Searches filter by that identifier.
- Clean up in `afterAll` (best-effort `delete`; ignore errors — the server
  may have wiped the resource already).
- Default per-test timeout is 30 s; give CRUD roundtrips 60 s.
- Never assert on pre-existing data — the public corpus on SMART can be
  refreshed without notice.
- Stop-the-bleed policy: when fixing a production bug or server-contract
  regression, add or extend an integration test in the same PR so the failure
  mode is pinned and cannot silently reappear.
