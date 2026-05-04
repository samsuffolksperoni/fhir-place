---
"@fhir-place/mcp": minor
---

Initial release of `@fhir-place/mcp`.

Wraps any FHIR R4 REST API as MCP tools for Claude Desktop, Cursor, and
other MCP clients. Reuses `FetchFhirClient` from `@fhir-place/react-fhir`
— no separate auth implementation.

Tools exposed: `read_resource`, `search`, `read_reference`,
`validate_resource`, `expand_value_set`.

Tool availability is gated on the server's `CapabilityStatement` so
MCP clients only see operations the FHIR endpoint actually supports.

CLI: `npx @fhir-place/mcp --base-url https://hapi.fhir.org/baseR4 [--bearer "$TOKEN"]`
