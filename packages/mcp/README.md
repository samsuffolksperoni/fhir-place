# @fhir-place/mcp

`@fhir-place/mcp` wraps a FHIR R4 base URL as two typed, patient-scoped, deny-by-default tools:

- `patient_summary`
- `read_resource`

The package intentionally allows only a small resource allowlist and always requires `patientId`.

## Quick start

```ts
import { FhirMcpClient } from "@fhir-place/mcp";

const client = new FhirMcpClient("https://fhir.example.com/fhir");
const tools = client.listTools();

const summary = await client.callTool("patient_summary", {
  patientId: "example-patient"
});
```
