import { Hono } from "hono";
import type { ConnectionStore } from "./services/connection-store.js";
import { connectionsRoutes } from "./routes/connections.js";

export interface ServerDeps {
  connections: ConnectionStore;
}

export function createApp(deps: ServerDeps) {
  const app = new Hono();

  app.get("/api/health", (c) =>
    c.json({ ok: true, app: "fhir-place/workbench", phase: "A" }),
  );

  app.route("/api/connections", connectionsRoutes(deps.connections));

  return app;
}
