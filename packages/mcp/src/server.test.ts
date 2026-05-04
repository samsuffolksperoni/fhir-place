/**
 * Smoke tests for the FHIR MCP server.
 *
 * We use InMemoryTransport (provided by the MCP SDK) to create a linked
 * server/client pair so we can drive the full JSON-RPC round-trip without
 * needing a network or a real FHIR server.  HTTP calls are intercepted by a
 * lightweight fetch stub.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createFhirMcpServer, validateFhirResource } from "./server.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PATIENT = {
  resourceType: "Patient",
  id: "test-patient",
  name: [{ family: "Smith", given: ["John"] }],
};

const OBSERVATION = {
  resourceType: "Observation",
  id: "obs-1",
  status: "final",
  code: { coding: [{ system: "http://loinc.org", code: "29463-7" }] },
};

const BUNDLE = {
  resourceType: "Bundle",
  type: "searchset",
  total: 1,
  entry: [{ resource: PATIENT }],
};

const CAPABILITY: object = {
  resourceType: "CapabilityStatement",
  rest: [
    {
      resource: [
        {
          type: "Patient",
          interaction: [
            { code: "read" },
            { code: "search-type" },
          ],
        },
      ],
    },
  ],
};

const VALUE_SET = {
  resourceType: "ValueSet",
  id: "vs-1",
  expansion: { contains: [{ system: "http://loinc.org", code: "29463-7" }] },
};

// ---------------------------------------------------------------------------
// Fetch stub
// ---------------------------------------------------------------------------

function makeStubFetch() {
  return vi.fn(async (url: string): Promise<Response> => {
    const u = String(url);

    if (u.includes("/metadata")) {
      return jsonResponse(CAPABILITY);
    }
    if (u.includes("/Patient/test-patient")) {
      return jsonResponse(PATIENT);
    }
    if (u.includes("/Observation/obs-1")) {
      return jsonResponse(OBSERVATION);
    }
    if (u.includes("/Patient?") || u.endsWith("/Patient")) {
      return jsonResponse(BUNDLE);
    }
    if (u.includes("/ValueSet/$expand")) {
      return jsonResponse(VALUE_SET);
    }
    // Reference resolution (absolute URL)
    if (u.includes("Patient/test-patient")) {
      return jsonResponse(PATIENT);
    }
    return new Response(JSON.stringify({ resourceType: "OperationOutcome", issue: [] }), {
      status: 404,
      headers: { "Content-Type": "application/fhir+json" },
    });
  });
}

function jsonResponse(body: object): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/fhir+json" },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function buildConnectedPair(fetchStub = makeStubFetch()) {
  const server = await createFhirMcpServer({
    baseUrl: "https://hapi.fhir.org/baseR4",
    fetch: fetchStub as unknown as typeof fetch,
  });

  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientTransport);

  return { client };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createFhirMcpServer", () => {
  describe("tool registration", () => {
    it("registers all five FHIR tools", async () => {
      const { client } = await buildConnectedPair();
      const { tools } = await client.listTools();
      const names = tools.map((t) => t.name);
      expect(names).toContain("read_resource");
      expect(names).toContain("search");
      expect(names).toContain("read_reference");
      expect(names).toContain("validate_resource");
      expect(names).toContain("expand_value_set");
    });
  });

  describe("read_resource round-trip", () => {
    it("returns the resource JSON for a known id", async () => {
      const { client } = await buildConnectedPair();
      const result = await client.callTool({
        name: "read_resource",
        arguments: { resourceType: "Patient", id: "test-patient" },
      });
      expect(result.isError).toBeFalsy();
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const parsed = JSON.parse(text);
      expect(parsed.resourceType).toBe("Patient");
      expect(parsed.id).toBe("test-patient");
    });
  });

  describe("search round-trip", () => {
    it("returns a Bundle for a search call", async () => {
      const { client } = await buildConnectedPair();
      const result = await client.callTool({
        name: "search",
        arguments: { resourceType: "Patient", params: { family: "Smith" } },
      });
      expect(result.isError).toBeFalsy();
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const parsed = JSON.parse(text);
      expect(parsed.resourceType).toBe("Bundle");
      expect(parsed.type).toBe("searchset");
    });
  });

  describe("read_reference round-trip", () => {
    it("resolves a relative reference string", async () => {
      const { client } = await buildConnectedPair();
      const result = await client.callTool({
        name: "read_reference",
        arguments: { reference: "Patient/test-patient" },
      });
      expect(result.isError).toBeFalsy();
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const parsed = JSON.parse(text);
      expect(parsed.resourceType).toBe("Patient");
    });
  });

  describe("validate_resource round-trip", () => {
    it("returns { ok: true } for a structurally valid resource", async () => {
      const { client } = await buildConnectedPair();
      const result = await client.callTool({
        name: "validate_resource",
        arguments: { resource: PATIENT },
      });
      expect(result.isError).toBeFalsy();
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const parsed = JSON.parse(text);
      expect(parsed).toEqual({ ok: true });
    });

    it("returns errors for a resource missing resourceType", async () => {
      const { client } = await buildConnectedPair();
      const result = await client.callTool({
        name: "validate_resource",
        arguments: { resource: { id: "no-type" } },
      });
      expect(result.isError).toBeFalsy();
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const parsed = JSON.parse(text);
      expect(parsed.ok).toBe(false);
      expect(parsed.errors.length).toBeGreaterThan(0);
    });
  });

  describe("expand_value_set round-trip", () => {
    it("returns a ValueSet for a known canonical URL", async () => {
      const { client } = await buildConnectedPair();
      const result = await client.callTool({
        name: "expand_value_set",
        arguments: { canonical: "http://loinc.org/vs/LL1043-6" },
      });
      expect(result.isError).toBeFalsy();
      const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? "";
      const parsed = JSON.parse(text);
      expect(parsed.resourceType).toBe("ValueSet");
    });
  });
});

// ---------------------------------------------------------------------------
// Unit tests for validateFhirResource (no transport needed)
// ---------------------------------------------------------------------------

describe("validateFhirResource", () => {
  it("accepts a valid resource", () => {
    expect(validateFhirResource({ resourceType: "Patient", id: "123" })).toEqual({ ok: true });
  });

  it("rejects a resource without resourceType", () => {
    const result = validateFhirResource({ id: "123" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.path === "resourceType" || e.path === "(root)")).toBe(true);
    }
  });

  it("rejects when resourceType is not a string", () => {
    const result = validateFhirResource({ resourceType: 42, id: "123" });
    expect(result.ok).toBe(false);
  });
});
