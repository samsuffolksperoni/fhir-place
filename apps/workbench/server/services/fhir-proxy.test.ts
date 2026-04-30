import { describe, expect, it } from "vitest";
import {
  filterSearchParams,
  proxyRead,
  proxySearch,
} from "./fhir-proxy.js";

const CONN = {
  baseUrl: "https://hapi.test/fhir",
  authType: "bearer" as const,
  authToken: "tok",
};

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/fhir+json" },
    ...init,
  });
}

describe("filterSearchParams", () => {
  it("keeps allow-listed Patient params and drops unknowns", () => {
    const out = filterSearchParams(
      "Patient",
      new URLSearchParams("name=Hopper&gender=female&favorite-color=blue"),
    );
    expect(out.get("name")).toBe("Hopper");
    expect(out.get("gender")).toBe("female");
    expect(out.has("favorite-color")).toBe(false);
    expect(out.get("_count")).toBe("20");
  });

  it("drops _include / _revinclude / _has / _format on every resource", () => {
    const out = filterSearchParams(
      "Observation",
      new URLSearchParams(
        "patient=Patient/abc&_include=Observation:subject&_revinclude=Encounter:subject&_has=Encounter&_format=xml",
      ),
    );
    expect(out.get("patient")).toBe("Patient/abc");
    expect(out.has("_include")).toBe(false);
    expect(out.has("_revinclude")).toBe(false);
    expect(out.has("_has")).toBe(false);
    expect(out.has("_format")).toBe(false);
  });

  it("clamps _count to MAX_COUNT", () => {
    const out = filterSearchParams("Patient", new URLSearchParams("_count=1000"));
    expect(out.get("_count")).toBe("100");
  });

  it("drops a non-numeric or non-positive _count and falls back to default 20", () => {
    expect(
      filterSearchParams("Patient", new URLSearchParams("_count=not-a-number")).get(
        "_count",
      ),
    ).toBe("20");
    expect(
      filterSearchParams("Patient", new URLSearchParams("_count=-5")).get("_count"),
    ).toBe("20");
  });

  it("preserves repeated values for the same key", () => {
    const out = filterSearchParams(
      "Condition",
      new URLSearchParams([
        ["category", "problem-list-item"],
        ["category", "encounter-diagnosis"],
        ["patient", "Patient/abc"],
      ]),
    );
    expect(out.getAll("category")).toEqual(["problem-list-item", "encounter-diagnosis"]);
  });

  it("Condition's allow-list rejects Patient-only params (e.g. birthdate)", () => {
    const out = filterSearchParams("Condition", new URLSearchParams("birthdate=1980"));
    expect(out.has("birthdate")).toBe(false);
  });
});

describe("proxySearch", () => {
  it("forwards a Patient search with auth headers and returns the upstream Bundle", async () => {
    let observed: { url: string; headers: Record<string, string> } | undefined;
    const fakeFetch: typeof fetch = async (input, init) => {
      const headers = new Headers(init?.headers);
      observed = {
        url: String(input),
        headers: {
          accept: headers.get("Accept") ?? "",
          authorization: headers.get("Authorization") ?? "",
        },
      };
      return jsonResponse({ resourceType: "Bundle", type: "searchset", entry: [] });
    };
    const result = await proxySearch(
      CONN,
      "Patient",
      new URLSearchParams("name=Hopper&_count=5"),
      fakeFetch,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.body).toMatchObject({ resourceType: "Bundle" });
    expect(observed?.url).toMatch(/^https:\/\/hapi\.test\/fhir\/Patient\?/);
    expect(observed?.url).toContain("name=Hopper");
    expect(observed?.url).toContain("_count=5");
    expect(observed?.headers.accept).toBe("application/fhir+json");
    expect(observed?.headers.authorization).toBe("Bearer tok");
  });

  it("strips disallowed params before forwarding", async () => {
    let observedUrl = "";
    const fakeFetch: typeof fetch = async (input) => {
      observedUrl = String(input);
      return jsonResponse({ resourceType: "Bundle", entry: [] });
    };
    await proxySearch(
      CONN,
      "Patient",
      new URLSearchParams("name=Hopper&_include=Patient:link"),
      fakeFetch,
    );
    expect(observedUrl).not.toContain("_include");
    expect(observedUrl).toContain("name=Hopper");
  });

  it("propagates a non-2xx upstream as ok:false with the body", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          resourceType: "OperationOutcome",
          issue: [{ severity: "error", code: "forbidden" }],
        }),
        { status: 403, headers: { "Content-Type": "application/fhir+json" } },
      );
    const result = await proxySearch(CONN, "Patient", new URLSearchParams(), fakeFetch);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.body).toMatchObject({ resourceType: "OperationOutcome" });
    }
  });

  it("returns 502 on network failure", async () => {
    const fakeFetch: typeof fetch = async () => {
      throw new Error("ECONNREFUSED");
    };
    const result = await proxySearch(CONN, "Patient", new URLSearchParams(), fakeFetch);
    expect(result).toMatchObject({ ok: false, status: 502 });
    if (!result.ok) expect(result.error).toMatch(/ECONNREFUSED/);
  });
});

describe("proxyRead", () => {
  it("rejects an id that contains path traversal characters", async () => {
    const result = await proxyRead(
      CONN,
      "Patient",
      "../OperationDefinition/foo",
      async () => new Response("{}"),
    );
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("accepts a valid FHIR id and forwards to the upstream", async () => {
    let observedUrl = "";
    const fakeFetch: typeof fetch = async (input) => {
      observedUrl = String(input);
      return jsonResponse({ resourceType: "Patient", id: "abc-123" });
    };
    const result = await proxyRead(CONN, "Patient", "abc-123", fakeFetch);
    expect(result.ok).toBe(true);
    expect(observedUrl).toBe("https://hapi.test/fhir/Patient/abc-123");
  });
});
