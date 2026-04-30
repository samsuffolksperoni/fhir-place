import { describe, expect, it } from "vitest";
import {
  authHeadersFor,
  probeCapabilityStatement,
} from "./fhir-connection.js";

const BASE = "https://example.test/fhir";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/fhir+json" },
    ...init,
  });
}

describe("authHeadersFor", () => {
  it("returns no headers for `none` auth", () => {
    expect(authHeadersFor({ authType: "none", authToken: null })).toEqual({});
  });

  it("returns Bearer for `bearer` auth with a token", () => {
    expect(
      authHeadersFor({ authType: "bearer", authToken: "abc" }),
    ).toEqual({ Authorization: "Bearer abc" });
  });

  it("returns no headers for `bearer` auth missing a token (defensive)", () => {
    expect(authHeadersFor({ authType: "bearer", authToken: null })).toEqual({});
  });

  it("returns no headers for an unknown authType (defensive)", () => {
    expect(
      authHeadersFor({
        authType: "smart" as never,
        authToken: "abc",
      }),
    ).toEqual({});
  });
});

describe("probeCapabilityStatement", () => {
  it("returns ok with parsed metadata on a valid CapabilityStatement", async () => {
    const fakeFetch: typeof fetch = async (input, init) => {
      expect(String(input)).toBe(`${BASE}/metadata`);
      const headers = new Headers(init?.headers);
      expect(headers.get("Accept")).toBe("application/fhir+json");
      expect(headers.get("Authorization")).toBe("Bearer s3cret");
      return jsonResponse({
        resourceType: "CapabilityStatement",
        fhirVersion: "4.0.1",
        software: { name: "HAPI FHIR Server", version: "8.0.0" },
      });
    };

    const result = await probeCapabilityStatement(
      { baseUrl: BASE, authType: "bearer", authToken: "s3cret" },
      fakeFetch,
    );

    expect(result).toEqual({
      ok: true,
      fhirVersion: "4.0.1",
      software: "HAPI FHIR Server 8.0.0",
      raw: expect.objectContaining({ resourceType: "CapabilityStatement" }),
    });
  });

  it("returns error on non-2xx response", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response("nope", { status: 401, statusText: "Unauthorized" });

    const result = await probeCapabilityStatement(
      { baseUrl: BASE, authType: "none", authToken: null },
      fakeFetch,
    );

    expect(result).toEqual({ ok: false, error: "HTTP 401 Unauthorized" });
  });

  it("returns error when body is not a CapabilityStatement", async () => {
    const fakeFetch: typeof fetch = async () =>
      jsonResponse({ resourceType: "OperationOutcome" });

    const result = await probeCapabilityStatement(
      { baseUrl: BASE, authType: "none", authToken: null },
      fakeFetch,
    );

    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error).toMatch(/unexpected resource: got OperationOutcome/);
  });

  it("returns error on network failure", async () => {
    const fakeFetch: typeof fetch = async () => {
      throw new Error("connection refused");
    };

    const result = await probeCapabilityStatement(
      { baseUrl: BASE, authType: "none", authToken: null },
      fakeFetch,
    );

    expect(result).toEqual({ ok: false, error: "network error: connection refused" });
  });

  it("strips trailing slash from base URL before appending /metadata", async () => {
    let observedUrl: string | undefined;
    const fakeFetch: typeof fetch = async (input) => {
      observedUrl = String(input);
      return jsonResponse({ resourceType: "CapabilityStatement" });
    };

    await probeCapabilityStatement(
      { baseUrl: `${BASE}/`, authType: "none", authToken: null },
      fakeFetch,
    );

    expect(observedUrl).toBe(`${BASE}/metadata`);
  });
});
