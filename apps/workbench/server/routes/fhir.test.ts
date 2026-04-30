import { afterEach, describe, expect, it } from "vitest";
import { jsonResponse, makeTestApp } from "../test-utils.js";

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

function newApp(fetchFn?: typeof fetch) {
  const t = makeTestApp({ fetchFn });
  cleanups.push(t.cleanup);
  return t;
}

async function createConn(
  app: ReturnType<typeof makeTestApp>["app"],
  overrides: Partial<{
    name: string;
    baseUrl: string;
    authType: "none" | "bearer";
    authToken: string;
  }> = {},
) {
  const res = await app.request("/api/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: overrides.name ?? "test",
      kind: "fhir_clinical",
      baseUrl: overrides.baseUrl ?? "https://upstream.test/fhir",
      authType: overrides.authType ?? "none",
      ...(overrides.authToken ? { authToken: overrides.authToken } : {}),
    }),
  });
  expect(res.status).toBe(201);
  const body = await res.json();
  return body.connection.id as string;
}

describe("/api/connections/:cid/fhir", () => {
  it("forwards Patient search to the upstream and returns the Bundle", async () => {
    let observedUrl = "";
    let observedAuth = "";
    const fakeFetch: typeof fetch = async (input, init) => {
      observedUrl = String(input);
      observedAuth = new Headers(init?.headers).get("Authorization") ?? "";
      return jsonResponse({ resourceType: "Bundle", type: "searchset", entry: [] });
    };
    const { app } = newApp(fakeFetch);
    const cid = await createConn(app, {
      authType: "bearer",
      authToken: "tok",
    });

    const res = await app.request(
      `/api/connections/${cid}/fhir/Patient?name=Hopper`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ resourceType: "Bundle" });
    expect(observedUrl).toBe(
      "https://upstream.test/fhir/Patient?name=Hopper&_count=20",
    );
    expect(observedAuth).toBe("Bearer tok");
  });

  it("returns 400 for a resource type outside the allow-list", async () => {
    const { app } = newApp();
    const cid = await createConn(app);
    const res = await app.request(`/api/connections/${cid}/fhir/Procedure`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("resource_type_not_allowed");
    expect(body.allowed).toContain("Patient");
  });

  it("returns 404 when the connection does not exist", async () => {
    const { app } = newApp();
    const res = await app.request("/api/connections/missing/fhir/Patient");
    expect(res.status).toBe(404);
  });

  it("never forwards disallowed search params upstream", async () => {
    let observedUrl = "";
    const fakeFetch: typeof fetch = async (input) => {
      observedUrl = String(input);
      return jsonResponse({ resourceType: "Bundle", entry: [] });
    };
    const { app } = newApp(fakeFetch);
    const cid = await createConn(app);

    const res = await app.request(
      `/api/connections/${cid}/fhir/Patient?_include=Patient:link&name=Grace`,
    );
    expect(res.status).toBe(200);
    expect(observedUrl).not.toContain("_include");
    expect(observedUrl).toContain("name=Grace");
  });

  it("never returns the auth token in any response", async () => {
    const { app } = newApp(async () =>
      jsonResponse({ resourceType: "Bundle", entry: [] }),
    );
    const cid = await createConn(app, {
      authType: "bearer",
      authToken: "super-secret-2026",
    });
    const res = await app.request(`/api/connections/${cid}/fhir/Patient`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(await res.json())).not.toContain("super-secret-2026");
  });

  it("reads a single resource by id (Patient/abc-123)", async () => {
    let observedUrl = "";
    const fakeFetch: typeof fetch = async (input) => {
      observedUrl = String(input);
      return jsonResponse({ resourceType: "Patient", id: "abc-123" });
    };
    const { app } = newApp(fakeFetch);
    const cid = await createConn(app);
    const res = await app.request(`/api/connections/${cid}/fhir/Patient/abc-123`);
    expect(res.status).toBe(200);
    expect(observedUrl).toBe("https://upstream.test/fhir/Patient/abc-123");
  });

  it("rejects POSTs to the proxy (Phase A is read-only)", async () => {
    const { app } = newApp();
    const cid = await createConn(app);
    const res = await app.request(`/api/connections/${cid}/fhir/Patient`, {
      method: "POST",
      headers: { "Content-Type": "application/fhir+json" },
      body: "{}",
    });
    expect(res.status).toBe(404);
  });

  it("propagates upstream non-2xx with status and body", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          resourceType: "OperationOutcome",
          issue: [{ severity: "error" }],
        }),
        { status: 401, headers: { "Content-Type": "application/fhir+json" } },
      );
    const { app } = newApp(fakeFetch);
    const cid = await createConn(app);
    const res = await app.request(`/api/connections/${cid}/fhir/Patient`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/upstream HTTP 401/);
    expect(body.body).toMatchObject({ resourceType: "OperationOutcome" });
  });
});
