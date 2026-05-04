# @fhir-place/mcp

Model Context Protocol (MCP) server that wraps any FHIR R4 REST API as a set of tool-callable operations for Claude Desktop, Cursor, and other MCP clients.

## Quick start

```sh
npx @fhir-place/mcp --base-url https://hapi.fhir.org/baseR4
```

With a bearer token:

```sh
npx @fhir-place/mcp \
  --base-url https://your-fhir-server.example.com/fhir \
  --bearer "$TOKEN"
```

## Wire into Claude Desktop

Add an entry to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "fhir": {
      "command": "npx",
      "args": [
        "@fhir-place/mcp",
        "--base-url",
        "https://hapi.fhir.org/baseR4"
      ]
    }
  }
}
```

For a server that requires auth:

```json
{
  "mcpServers": {
    "fhir": {
      "command": "npx",
      "args": [
        "@fhir-place/mcp",
        "--base-url",
        "https://your-server.example.com/fhir",
        "--bearer",
        "your-token-here"
      ]
    }
  }
}
```

## Wire into Cursor

In your Cursor MCP settings (`.cursor/mcp.json` at project root or in user settings):

```json
{
  "mcpServers": {
    "fhir": {
      "command": "npx",
      "args": [
        "@fhir-place/mcp",
        "--base-url",
        "https://hapi.fhir.org/baseR4"
      ]
    }
  }
}
```

## Tools exposed

Tool availability is gated on the server's `CapabilityStatement` — the MCP client only sees tools the FHIR endpoint actually supports.

| Tool | Description | Parameters |
|---|---|---|
| `read_resource` | Read a single resource by type and id | `resourceType: string`, `id: string` |
| `search` | Search resources with query params. Returns a FHIR Bundle. | `resourceType: string`, `params?: Record<string, string>` |
| `read_reference` | Resolve a FHIR Reference string | `reference: string` (e.g. `"Patient/123"`) |
| `validate_resource` | Structural validation of a resource | `resource: object` |
| `expand_value_set` | Expand a ValueSet by canonical URL | `canonical: string` (URL) |

### `validate_resource` response shapes

Valid resource:
```json
{ "ok": true }
```

Invalid resource:
```json
{
  "ok": false,
  "errors": [
    { "path": "resourceType", "message": "resourceType is required and must be a string" }
  ]
}
```

## Programmatic use

```ts
import { createFhirMcpServer } from "@fhir-place/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = await createFhirMcpServer({
  baseUrl: "https://hapi.fhir.org/baseR4",
  headers: { Authorization: "Bearer your-token" },
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Deliberate out of scope (v0)

- **Auth flows beyond static bearer tokens.** SMART App Launch and OAuth PKCE flows are a separate adapter issue.
- **Write tools** (`create`, `update`, `delete`). Read-only v0; write tools require explicit user-side allow-listing.
- **Hosted MCP gateway.** ADR 0004 mentions this as a future commercial layer.
- **Workbench integration.** The Workbench Phase A explicitly forbids an MCP server; the library package does not.
- **Profile-aware validation.** `validate_resource` does structural checks only. Full Zod-from-StructureDefinition validation is a separate work item.

## Architecture

`@fhir-place/mcp` reuses `FetchFhirClient` from `@fhir-place/react-fhir/client`. All HTTP goes through that single implementation — no separate auth surface or fetch calls.

The `CapabilityStatement` from `/metadata` is fetched at startup and used to gate tool registration: if a server does not advertise `search-type` interactions, the `search` tool is not registered and the MCP client never sees it.
