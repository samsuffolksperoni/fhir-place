# cql-translator

Tiny HTTP wrapper around the [cqframework](https://github.com/cqframework/clinical_quality_language)
CQL-to-ELM translator (Apache-2.0). Runs as a sidecar to the demo so the
browser can compile CQL it receives from the user without shipping a JVM.

## Endpoint

```
POST /translate
Content-Type: application/json

{ "cql": "library Foo version '1.0'\n\ndefine Yes: true" }
```

Success: HTTP 200 with the ELM library as JSON (the same shape consumed by the
[`cql-execution`](https://github.com/cqframework/cql-execution) npm package).

Failure: HTTP 400 with

```json
{ "errors": [ { "message": "...", "severity": "Error", "line": 3, "col": 7 } ] }
```

## Run with docker compose

From the repo root:

```bash
docker compose up cql-translator
```

Sanity check:

```bash
curl -s http://localhost:8081/health
curl -s -X POST http://localhost:8081/translate \
  -H 'content-type: application/json' \
  -d '{"cql":"library Hello version '\''1.0'\''\n\ndefine Yes: true"}'
```

## Run locally without Docker

```bash
cd services/cql-translator
mvn -DskipTests package
java -jar target/cql-translator.jar
```

## Notes

- CORS is open to `*` to keep local dev frictionless. Lock down before any
  non-dev hosting.
- Only single-library translation is wired up — multi-library `include`
  resolution lands with the Phase 2 library store.
- License: Apache-2.0 (matches cqframework).
