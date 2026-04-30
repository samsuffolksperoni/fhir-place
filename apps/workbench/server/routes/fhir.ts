import { Hono } from "hono";
import { ResourceType } from "../schemas.js";
import type { ConnectionStore } from "../services/connection-store.js";
import { proxyRead, proxySearch, type ProxyResult } from "../services/fhir-proxy.js";

interface Deps {
  store: ConnectionStore;
  fetchFn?: typeof fetch;
}

/**
 * Read-only FHIR proxy. Mounts at `/api/connections/:cid/fhir`.
 *
 *   GET /:resourceType            — forwarded search (allow-listed params only)
 *   GET /:resourceType/:id        — single resource read
 *
 * Anything else (POST/PUT/PATCH/DELETE on this prefix) hits Hono's 404
 * because Phase A is read-only. The connection's auth token never crosses
 * this boundary either way — it only goes upstream as `Authorization`.
 */
export function fhirRoutes(deps: Deps) {
  const app = new Hono();
  const fetchFn = deps.fetchFn ?? fetch;

  app.get("/:resourceType", async (c) => {
    const cid = c.req.param("cid");
    if (!cid) return jsonError(404, "connection_not_found");
    const conn = deps.store.getInternal(cid);
    if (!conn) return jsonError(404, "connection_not_found");

    const rt = ResourceType.safeParse(c.req.param("resourceType"));
    if (!rt.success) return resourceTypeError();

    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(c.req.queries())) {
      for (const value of v) params.append(k, value);
    }

    const result = await proxySearch(conn, rt.data, params, fetchFn);
    return toResponse(result);
  });

  app.get("/:resourceType/:id", async (c) => {
    const cid = c.req.param("cid");
    const id = c.req.param("id");
    if (!cid) return jsonError(404, "connection_not_found");
    if (!id) return jsonError(400, "missing_id");
    const conn = deps.store.getInternal(cid);
    if (!conn) return jsonError(404, "connection_not_found");

    const rt = ResourceType.safeParse(c.req.param("resourceType"));
    if (!rt.success) return resourceTypeError();

    const result = await proxyRead(conn, rt.data, id, fetchFn);
    return toResponse(result);
  });

  return app;
}

function toResponse(result: ProxyResult): Response {
  if (result.ok) return jsonBody(result.status, result.body);
  return jsonBody(result.status, { error: result.error, body: result.body ?? null });
}

function jsonBody(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonError(status: number, error: string): Response {
  return jsonBody(status, { error });
}

function resourceTypeError(): Response {
  return jsonBody(400, {
    error: "resource_type_not_allowed",
    allowed: ResourceType.options,
  });
}
