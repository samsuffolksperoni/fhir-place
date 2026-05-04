/**
 * Creates and configures an MCP server that wraps a FHIR base URL.
 *
 * Tool availability is gated on the server's CapabilityStatement so MCP
 * clients only see operations the FHIR endpoint actually supports.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  FetchFhirClient,
  type FetchFhirClientOptions,
} from "@fhir-place/react-fhir/client";
import type { CapabilityStatement, Resource } from "fhir/r4";

export interface CreateFhirMcpServerOptions
  extends Omit<FetchFhirClientOptions, "fetch"> {
  /** Override the fetch implementation (useful for testing). */
  fetch?: typeof fetch;
}

/**
 * Builds and returns a configured McpServer that exposes FHIR operations as
 * MCP tools. Call `server.connect(transport)` to start serving.
 */
export async function createFhirMcpServer(
  opts: CreateFhirMcpServerOptions,
): Promise<McpServer> {
  const client = new FetchFhirClient({
    ...opts,
    fetch: opts.fetch,
  });

  // Fetch CapabilityStatement to gate which tools are registered. If it fails
  // we still register all tools — a missing metadata endpoint is not a reason
  // to refuse to start.
  let capabilities: CapabilityStatement | null = null;
  try {
    capabilities = await client.capabilities();
  } catch {
    // Continue without capability gating.
  }

  const server = new McpServer({
    name: "@fhir-place/mcp",
    version: "0.1.0",
  });

  const supportedTypes =
    capabilities?.rest
      ?.flatMap((r) => r.resource ?? [])
      .map((r) => r.type)
      .filter((t): t is string => typeof t === "string") ?? null;

  const serverSupports = (operation: string): boolean => {
    if (!capabilities) return true;
    return (
      capabilities.rest?.some((r) =>
        r.resource?.some((res) =>
          res.interaction?.some((i) => i.code === operation),
        ),
      ) ?? true
    );
  };

  // read_resource — maps to FhirClient.read
  if (serverSupports("read")) {
    server.tool(
      "read_resource",
      "Read a single FHIR resource by resourceType and id. Returns the full resource JSON.",
      {
        resourceType: z
          .string()
          .describe(
            supportedTypes
              ? `FHIR resource type. Supported by this server: ${supportedTypes.join(", ")}`
              : "FHIR resource type (e.g. Patient, Observation).",
          ),
        id: z.string().describe("The logical id of the resource."),
      },
      async ({ resourceType, id }) => {
        const resource = await client.read(resourceType, id);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(resource, null, 2) }],
        };
      },
    );
  }

  // search — maps to FhirClient.search
  if (serverSupports("search-type")) {
    server.tool(
      "search",
      "Search for FHIR resources of a given type using query parameters. Returns a FHIR Bundle.",
      {
        resourceType: z
          .string()
          .describe("FHIR resource type to search (e.g. Patient, Observation)."),
        params: z
          .record(z.string(), z.string())
          .optional()
          .describe(
            'Search parameters as key-value pairs (e.g. { "name": "Smith", "_count": "10" }).',
          ),
      },
      async ({ resourceType, params }) => {
        // MCP args are all strings; SearchParams accepts string values.
        const bundle = await client.search(resourceType, params as Record<string, string> | undefined);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(bundle, null, 2) }],
        };
      },
    );
  }

  // read_reference — maps to FhirClient.readReference
  server.tool(
    "read_reference",
    "Resolve a FHIR Reference string (e.g. \"Patient/123\" or an absolute URL) and return the target resource.",
    {
      reference: z
        .string()
        .describe(
          'A FHIR reference string such as "Patient/123" or "https://hapi.fhir.org/baseR4/Patient/123".',
        ),
    },
    async ({ reference }) => {
      const resource = await client.readReference<Resource>({ reference });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(resource, null, 2) }],
      };
    },
  );

  // validate_resource — structural Zod check (no StructureDefinition required)
  server.tool(
    "validate_resource",
    "Validate a FHIR resource. Returns { ok: true } if the resource passes structural checks, or a Zod-shaped error object listing issues.",
    {
      resource: z
        .record(z.string(), z.unknown())
        .describe("The FHIR resource object to validate."),
    },
    async ({ resource }) => {
      const result = validateFhirResource(resource);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // expand_value_set — maps to $expand operation
  server.tool(
    "expand_value_set",
    "Expand a FHIR ValueSet by its canonical URL. Returns the expanded ValueSet resource.",
    {
      canonical: z
        .string()
        .url()
        .describe("The canonical URL of the ValueSet to expand."),
    },
    async ({ canonical }) => {
      const result = await client.request<Resource>({
        path: `/ValueSet/$expand?url=${encodeURIComponent(canonical)}`,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  return server;
}

/**
 * Minimal structural validation for a FHIR resource.
 *
 * A full profile-aware validator (Zod-from-StructureDefinition) is a separate
 * work item. This check gates the most common structural mistakes: missing
 * resourceType, missing id, non-string required fields.
 */
const FhirResourceSchema = z.object({
  resourceType: z.string({ message: "resourceType is required and must be a string" }),
  id: z.string().optional(),
  meta: z
    .object({
      versionId: z.string().optional(),
      lastUpdated: z.string().optional(),
    })
    .optional(),
});

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: Array<{ path: string; message: string }> };

export function validateFhirResource(resource: Record<string, unknown>): ValidationResult {
  const result = FhirResourceSchema.safeParse(resource);
  if (result.success) {
    return { ok: true };
  }
  return {
    ok: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join(".") || "(root)",
      message: issue.message,
    })),
  };
}
