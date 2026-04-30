import { Hono } from "hono";
import type { ConnectionStore } from "./services/connection-store.js";
import { connectionsRoutes } from "./routes/connections.js";
import { fhirRoutes } from "./routes/fhir.js";

export interface ServerDeps {
  connections: ConnectionStore;
  fetchFn?: typeof fetch;
}

export function createApp(deps: ServerDeps) {
  const app = new Hono();

  app.get("/api/health", (c) =>
    c.json({ ok: true, app: "fhir-place/workbench", phase: "A" }),
  );

  app.route("/api/connections", connectionsRoutes(deps.connections));
  app.route(
    "/api/connections/:cid/fhir",
    fhirRoutes({ store: deps.connections, fetchFn: deps.fetchFn }),
  );

  return app;
}
