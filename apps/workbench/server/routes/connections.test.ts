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

describe("connections routes", () => {
  it("lists empty initially", async () => {
    const { app } = newApp();
    const res = await app.request("/api/connections");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connections: [] });
  });

  it("creates a fhir_clinical / none connection and returns the row without authToken", async () => {
    const { app } = newApp();
    const res = await app.request("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Local HAPI",
        kind: "fhir_clinical",
        baseUrl: "http://localhost:8080/fhir",
        authType: "none",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.connection).toMatchObject({
      id: "conn_0001",
      name: "Local HAPI",
      kind: "fhir_clinical",
      baseUrl: "http://localhost:8080/fhir",
      authType: "none",
      hasAuthToken: false,
    });
    expect(body.connection.authToken).toBeUndefined();
  });

  it("rejects unsupported connection kind", async () => {
    const { app } = newApp();
    const res = await app.request("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "OMOP",
        kind: "omop",
        baseUrl: "http://localhost:5432",
        authType: "none",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_input");
  });

  it("rejects unsupported auth type (e.g. SMART)", async () => {
    const { app } = newApp();
    const res = await app.request("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Smart",
        kind: "fhir_clinical",
        baseUrl: "https://smart.example/fhir",
        authType: "smart",
        authToken: "x",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects bearer auth without a token", async () => {
    const { app } = newApp();
    const res = await app.request("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "no-token",
        kind: "fhir_clinical",
        baseUrl: "https://example.test/fhir",
        authType: "bearer",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_input");
  });

  it("rejects none auth with a token (defensive)", async () => {
    const { app } = newApp();
    const res = await app.request("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "weird",
        kind: "fhir_clinical",
        baseUrl: "https://example.test/fhir",
        authType: "none",
        authToken: "x",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("404s for an unknown id", async () => {
    const { app } = newApp();
    const res = await app.request("/api/connections/missing");
    expect(res.status).toBe(404);
  });

  it("tests a connection: probes /metadata and persists the CapabilityStatement summary", async () => {
    let probeUrl: string | undefined;
    const fakeFetch: typeof fetch = async (input) => {
      probeUrl = String(input);
      return jsonResponse({
        resourceType: "CapabilityStatement",
        fhirVersion: "4.0.1",
        software: { name: "HAPI", version: "8" },
      });
    };
    const { app } = newApp(fakeFetch);

    const create = await app.request("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "HAPI",
        kind: "fhir_clinical",
        baseUrl: "https://hapi.example/fhir",
        authType: "none",
      }),
    });
    const { connection } = await create.json();

    const test = await app.request(`/api/connections/${connection.id}/test`, {
      method: "POST",
    });
    expect(test.status).toBe(200);
    const body = await test.json();
    expect(probeUrl).toBe("https://hapi.example/fhir/metadata");
    expect(body.capability).toMatchObject({
      ok: true,
      fhirVersion: "4.0.1",
      software: "HAPI 8",
    });
    expect(body.connection).toMatchObject({
      lastCapabilityStatus: "ok",
      lastCapabilityFhirVersion: "4.0.1",
      lastCapabilitySoftware: "HAPI 8",
    });
    expect(body.connection.lastCapabilityJson).toContain("CapabilityStatement");
  });

  it("test() persists an error when /metadata fails", async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response("denied", { status: 403, statusText: "Forbidden" });
    const { app } = newApp(fakeFetch);

    const create = await app.request("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Locked",
        kind: "fhir_clinical",
        baseUrl: "https://locked.example/fhir",
        authType: "bearer",
        authToken: "wrong",
      }),
    });
    const { connection } = await create.json();

    const test = await app.request(`/api/connections/${connection.id}/test`, {
      method: "POST",
    });
    expect(test.status).toBe(200);
    const body = await test.json();
    expect(body.capability).toEqual({ ok: false, error: "HTTP 403 Forbidden" });
    expect(body.connection.lastCapabilityStatus).toBe("error");
    expect(body.connection.lastCapabilityError).toBe("HTTP 403 Forbidden");
  });

  it("deletes a connection", async () => {
    const { app } = newApp();
    const create = await app.request("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "tmp",
        kind: "fhir_clinical",
        baseUrl: "http://localhost:8080/fhir",
        authType: "none",
      }),
    });
    const { connection } = await create.json();

    const del = await app.request(`/api/connections/${connection.id}`, {
      method: "DELETE",
    });
    expect(del.status).toBe(204);

    const check = await app.request(`/api/connections/${connection.id}`);
    expect(check.status).toBe(404);
  });

  it("never returns the auth token in any response", async () => {
    const { app } = newApp();
    const create = await app.request("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "secret",
        kind: "fhir_clinical",
        baseUrl: "https://example.test/fhir",
        authType: "bearer",
        authToken: "super-secret-token",
      }),
    });
    const created = JSON.stringify(await create.json());
    expect(created).not.toContain("super-secret-token");

    const list = await app.request("/api/connections");
    expect(JSON.stringify(await list.json())).not.toContain("super-secret-token");
  });
});
