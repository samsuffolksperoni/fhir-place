---
---

Demo: add a FHIR server picker to the app header so visitors can switch the live demo between known public FHIR R4 servers (HAPI Public Test Server, SMART Health IT R4) without rebuilding. Selection is persisted in `localStorage` and applied via a page reload so the `FetchFhirClient` rebuilds against the new base URL. Demonstrates that the `@fhir-place/react-fhir` UI is server-agnostic — it works against any spec-compliant FHIR REST API. HAPI remains the default; the picker is hidden in mock mode and when `VITE_FHIR_BASE_URL` overrides the base URL.
